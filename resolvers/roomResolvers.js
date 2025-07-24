const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const { roomInclusions } = require('../utils/inclusions');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const roomQueries = {
  getAllRooms: authenticate(async (_, { cursor }, { currentUser }) => {
    const rooms = await prisma.room.findMany({
      where: { users: { some: { id: currentUser.id } } },
      orderBy: { lastUpdated: 'desc' },
      include: roomInclusions,
      ...getPaginationOptions(cursor),
    });

    return rooms;
  }),

  getRoom: authenticate(async (_, { roomId }, { currentUser }) => {
    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
      include: roomInclusions,
    });

    if (!room) {
      throw new GraphQLError('Chatroom not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!room.users.some((user) => user.id === currentUser.id)) {
      throw new GraphQLError('You are not in this chatroom', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return room;
  }),
};

const roomMutations = {
  findOrCreateRoom: authenticate(
    async (_, { userId }, { currentUser }) => {
      if (currentUser.id === Number(userId)) {
        throw new GraphQLError('You cannot chat with yourself', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      let room = await prisma.room.findFirst({
        where: {
          AND: [
            { users: { some: { id: currentUser.id } } },
            { users: { some: { id: Number(userId) } } },
          ],
        },

        include: roomInclusions,
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            users: {
              connect: [{ id: currentUser.id }, { id: Number(userId) }],
            },
          },

          include: roomInclusions,
        });
      }

      return room;
    }
  ),
};

module.exports = { roomQueries, roomMutations };
