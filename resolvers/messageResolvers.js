const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const messageQueries = {
  getMessages: authenticate(async (parent, { roomId, cursor }) => {
    const messages = await prisma.message.findMany({
      where: { room: { id: Number(roomId) } },
      orderBy: { timestamp: 'asc' },
      include: { user: true },
      ...getPaginationOptions(cursor),
    });

    return messages;
  }),
};

const messageMutations = {
  // createMessage: authenticate(
  //   async (parent, { roomId, text, gifUrl }, { currentUser }) => {}
  // ),

  deleteMessage: authenticate(
    async (parent, { messageId }, { currentUser }) => {
      const message = await prisma.message.findUnique({
        where: { id: Number(messageId) },
        include: { user: true },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (message.userId !== currentUser.id) {
        throw new GraphQLError('You cannot delete this message', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await prisma.message.delete({ where: { id: message.id } });
      return message;
    }
  ),

  updateMessage: authenticate(
    async (parent, args, { currentUser }) => {
      const text = args.text.trim();

      if (!text) {
        throw new GraphQLError('Message cannot be empty', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const message = await prisma.message.findUnique({
        where: { id: Number(args.messageId) },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (message.userId !== currentUser.id) {
        throw new GraphQLError('You cannot update this message', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const updatedMessage = await prisma.message.update({
        where: { id: message.id },
        data: { text },
        include: { user: true },
      });

      return updatedMessage;
    }
  ),
};

module.exports = { messageQueries, messageMutations };
