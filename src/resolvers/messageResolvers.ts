import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import authenticate from '../utils/authenticate';
import uploadToCloudinary from '../utils/uploadToCloudinary';

import type {
  Message,
  MutateContentArgs,
} from '../types';

const prisma = new PrismaClient();

export default {
  createMessage: async (
    _: unknown,
    args: MutateContentArgs & { roomId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<Message> => {
    authenticate(currentUserId);
    const roomId = Number(args.roomId);
    const text = args.text?.trim();
    let imageUrl = args.gifUrl?.trim();

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const message = await prisma.message.create({
      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUserId } },
        room: { connect: { id: roomId } },
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { lastUpdated: new Date() },
    });

    return message;
  },

  deleteMessage: async (
    _: unknown,
    { messageId }: { messageId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<Message> => {
    authenticate(currentUserId);

    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (message.userId !== currentUserId) {
      throw new GraphQLError('You cannot delete this message', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await prisma.message.delete({ where: { id: message.id } });
    return message;
  },

  updateMessage: async (
    _: unknown,
    args: { messageId: string; text: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<Message> => {
    authenticate(currentUserId);
    const text = args.text?.trim();

    const message = await prisma.message.findUnique({
      where: { id: Number(args.messageId) },
    });

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (message.userId !== currentUserId) {
      throw new GraphQLError('You cannot update this message', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: { text },
    });

    return updatedMessage;
  },
};
