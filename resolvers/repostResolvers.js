const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');

const prisma = new PrismaClient();

const repostMutations = {
  repost: authenticate(async (parent, { contentType, id }, { currentUser }) => {
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

    const isAlreadyReposted = await prisma.repost.findFirst({
      where: { userId: currentUser.id, [`${contentType}Id`]: content.id },
    });

    if (isAlreadyReposted) {
      throw new GraphQLError(`You have already reposted this ${contentType}`, {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const repost = await prisma.repost.create({
      data: {
        user: { connect: { id: currentUser.id } },
        [contentType]: { connect: { id: content.id } },
      },
    });

    await prisma.notification.create({
      data: {
        type: 'repost',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: content.userId } },
        [contentType]: { connect: { id: content.id } },
      },
    });

    return repost;
  }),

  unrepost: authenticate(async (parent, { id }) => {
    const repost = await prisma.repost.findUnique({
      where: { id: Number(id) },
    });

    if (!repost) {
      throw new GraphQLError('Repost not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    await prisma.repost.delete({ where: { id: repost.id } });
    return repost;
  }),
};

module.exports = { repostMutations };
