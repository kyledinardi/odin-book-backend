import { Prisma, PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import authenticate from '../utils/authenticate';
import { repostInclusions } from '../utils/inclusions';
import getPaginationOptions from '../utils/paginationOptions';

import type { Choice, Notification, RepostWithInclusions } from '../types';

const prisma = new PrismaClient();

export const miscQueries = {
  getNotifications: async (
    _: unknown,
    { cursor, timestamp }: { cursor?: string; timestamp?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<Notification[]> => {
    authenticate(currentUserId);

    const options = {
      where: { targetUserId: currentUserId, timestamp: {} },
      orderBy: { timestamp: Prisma.SortOrder.desc },
      include: { sourceUser: true },
      ...(timestamp ? { take: 20 } : getPaginationOptions(cursor)),
    };

    const notifications = await prisma.notification.findMany(options);

    await prisma.notification.updateMany({
      where: { targetUserId: currentUserId },
      data: { isRead: true },
    });

    return notifications;
  },
};

export const miscMutations = {
  voteInPoll: async (
    _: unknown,
    { choiceId }: { choiceId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<Choice> => {
    authenticate(currentUserId);

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
      if (c.votes.some((vote) => vote.id === currentUserId)) {
        throw new GraphQLError('You have already voted in this poll', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
    });

    const updatedChoice = await prisma.choice.update({
      where: { id: choice.id },
      include: { votes: true },
      data: { votes: { connect: { id: currentUserId } } },
    });

    return updatedChoice;
  },

  repost: async (
    _: unknown,
    { contentType, id }: { contentType: string; id: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<RepostWithInclusions> => {
    authenticate(currentUserId);

    let content;

    if (contentType === 'post') {
      content = await prisma.post.findUnique({
        where: { id: Number(id) },
      });
    } else if (contentType === 'comment') {
      content = await prisma.comment.findUnique({
        where: { id: Number(id) },
      });
    } else {
      throw new GraphQLError('Invalid contentType', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (!content) {
      throw new GraphQLError(`${contentType} not found`, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const existingRepost = await prisma.repost.findFirst({
      where: { userId: currentUserId, [`${contentType}Id`]: content.id },
      include: repostInclusions,
    });

    if (existingRepost) {
      await prisma.repost.delete({ where: { id: existingRepost.id } });
      return existingRepost;
    }

    const newRepost = await prisma.repost.create({
      data: {
        user: { connect: { id: currentUserId } },
        [contentType]: { connect: { id: content.id } },
      },

      include: repostInclusions,
    });

    const isSourceCurrentUser =
      newRepost.post?.userId === currentUserId ||
      newRepost.comment?.userId === currentUserId;

    if (!isSourceCurrentUser) {
      await prisma.notification.create({
        data: {
          type: 'repost',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: content.userId } },
          [contentType]: { connect: { id: content.id } },
        },
      });
    }

    return newRepost;
  },
};
