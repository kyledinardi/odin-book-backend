const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const { repostInclusions } = require('../utils/inclusions');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const miscQueries = {
  getNotifications: authenticate(
    async (_, { cursor, timestamp }, { currentUser }) => {
      let options = {
        where: { targetUserId: currentUser.id },
        orderBy: { timestamp: 'desc' },
        include: { sourceUser: true },
      };

      if (timestamp) {
        options.where.timestamp = { gt: new Date(Number(timestamp)) };
        options.take = 20;
      } else {
        options = {
          ...options,
          ...getPaginationOptions(cursor),
        };
      }

      const notifications = await prisma.notification.findMany(options);

      await prisma.notification.updateMany({
        where: { targetUserId: currentUser.id },
        data: { isRead: true },
      });

      return notifications;
    }
  ),
};

const miscMutations = {
  voteInPoll: authenticate(async (_, { choiceId }, { currentUser }) => {
    const choice = await prisma.choice.findUnique({
      where: { id: Number(choiceId) },
      include: {
        post: { include: { pollChoices: { include: { votes: true } } } },
      },
    });

    if (!choice) {
      throw new GraphQLError('Choice not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    choice.post.pollChoices.forEach((c) => {
      if (c.votes.some((vote) => vote.id === currentUser.id)) {
        throw new GraphQLError('You have already voted in this poll', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
    });

    const updatedChoice = await prisma.choice.update({
      where: { id: choice.id },
      include: { votes: true },
      data: { votes: { connect: { id: currentUser.id } } },
    });

    return updatedChoice;
  }),

  repost: authenticate(async (_, { contentType, id }, { currentUser }) => {
    if (contentType !== 'post' && contentType !== 'comment') {
      throw new GraphQLError('Invalid contentType', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const content = await prisma[contentType].findUnique({
      where: { id: Number(id) },
    });

    if (!content) {
      throw new GraphQLError(`${contentType} not found`, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const existingRepost = await prisma.repost.findFirst({
      where: { userId: currentUser.id, [`${contentType}Id`]: content.id },
      include: repostInclusions,
    });

    if (existingRepost) {
      await prisma.repost.delete({ where: { id: existingRepost.id } });
      return existingRepost;
    }

    const newRepost = await prisma.repost.create({
      data: {
        user: { connect: { id: currentUser.id } },
        [contentType]: { connect: { id: content.id } },
      },

      include: repostInclusions,
    });

    if (newRepost.post.userId !== currentUser.id) {
      await prisma.notification.create({
        data: {
          type: 'repost',
          sourceUser: { connect: { id: currentUser.id } },
          targetUser: { connect: { id: content.userId } },
          [contentType]: { connect: { id: content.id } },
        },
      });
    }
    return newRepost;
  }),
};

module.exports = { miscQueries, miscMutations };
