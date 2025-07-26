const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const getPaginationOptions = require('../utils/paginationOptions');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const prisma = new PrismaClient();

const messageQueries = {
  getMessages: authenticate(async (_, { roomId, cursor }) => {
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
  createMessage: authenticate(async (_, args, { currentUser }) => {
    const text = args.text?.trim();
    let imageUrl = args.gifUrl?.trim();

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const message = await prisma.message.create({
      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUser.id } },
        room: { connect: { id: Number(args.roomId) } },
      },

      include: { user: true },
    });

    await prisma.room.update({
      where: { id: Number(args.roomId) },
      data: { lastMessage: { connect: { id: message.id } } },
    });

    return message;
  }),

  deleteMessage: authenticate(async (_, { messageId }, { currentUser }) => {
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
  }),

  updateMessage: authenticate(async (_, args, { currentUser }) => {
    const text = args.text?.trim();

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
  }),
};

module.exports = { messageQueries, messageMutations };
