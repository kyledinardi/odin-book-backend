import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import authenticate from '../utils/authenticate';
import getPaginationOptions from '../utils/paginationOptions';

import type { RoomBase, RoomWithInclusions } from '../types';

const prisma = new PrismaClient();

export const roomQueries = {
  getAllRooms: async (
    _: unknown,
    { cursor }: { cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<RoomWithInclusions[]> => {
    authenticate(currentUserId);

    const rooms = await prisma.room.findMany({
      where: { users: { some: { id: currentUserId } } },
      orderBy: { lastUpdated: 'desc' },

      include: {
        users: true,
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
      },

      ...getPaginationOptions(cursor),
    });

    return rooms;
  },

  getRoom: async (
    _: unknown,
    { roomId, cursor }: { roomId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<RoomWithInclusions> => {
    authenticate(currentUserId);

    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },

      include: {
        users: true,

        messages: {
          orderBy: { timestamp: 'desc' },
          ...getPaginationOptions(cursor),
        },
      },
    });

    if (!room) {
      throw new GraphQLError('Chatroom not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!room.users.some((user) => user.id === currentUserId)) {
      throw new GraphQLError('You are not in this chatroom', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return room;
  },
};

export const roomMutations = {
  findOrCreateRoom: async (
    _: unknown,
    { userId }: { userId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<RoomBase> => {
    authenticate(currentUserId);

    if (currentUserId === Number(userId)) {
      throw new GraphQLError('You cannot chat with yourself', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    let room = await prisma.room.findFirst({
      where: {
        AND: [
          { users: { some: { id: currentUserId } } },
          { users: { some: { id: Number(userId) } } },
        ],
      },
    });

    room ??= await prisma.room.create({
      data: {
        users: {
          connect: [{ id: currentUserId }, { id: Number(userId) }],
        },
      },
    });

    return room;
  },
};
