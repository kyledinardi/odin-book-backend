import { PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import authenticate from '../utils/authenticate';
import { commentInclusions, postInclusions } from '../utils/inclusions';
import getPaginationOptions from '../utils/paginationOptions';
import uploadToCloudinary from '../utils/uploadToCloudinary';

import type {
  CommentBase,
  CommentWithInclusions,
  CommentWithPost,
  CommentWithReplies,
  MutateContentArgs,
} from '../types';

const prisma = new PrismaClient();

export const commentQueries = {
  getComment: async (
    _: unknown,
    { commentId, cursor }: { commentId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithReplies> => {
    authenticate(currentUserId);

    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },

      include: {
        ...commentInclusions,
        post: { include: postInclusions },
        parent: { include: commentInclusions },

        replies: {
          orderBy: { timestamp: 'desc' },
          include: commentInclusions,
          ...getPaginationOptions(cursor),
        },
      },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const commentChain = [];
    let currentComment: CommentWithInclusions | null = comment;

    while (currentComment?.parentId) {
      // eslint-disable-next-line no-await-in-loop
      currentComment = await prisma.comment.findUnique({
        where: { id: currentComment.parentId },
        include: commentInclusions,
      });

      if (!currentComment) {
        throw new GraphQLError('Comment chain is broken', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      commentChain.unshift(currentComment);
    }

    return { ...comment, commentChain };
  },

  getUserComments: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithPost[]> => {
    authenticate(currentUserId);

    const comments = await prisma.comment.findMany({
      where: { userId: Number(userId) },
      orderBy: { timestamp: 'desc' },
      distinct: ['postId'],

      include: {
        ...commentInclusions,
        post: { include: postInclusions },
        parent: { include: commentInclusions },
      },

      ...getPaginationOptions(cursor),
    });

    return comments;
  },
};

export const commentMutations = {
  createRootComment: async (
    _: unknown,
    args: MutateContentArgs & { postId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithInclusions> => {
    authenticate(currentUserId);
    const text = args.text?.trim();
    let imageUrl = args.gifUrl?.trim();

    const post = await prisma.post.findUnique({
      where: { id: Number(args.postId) },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUserId } },
        post: { connect: { id: post.id } },
      },

      include: commentInclusions,
    });

    if (post.userId !== currentUserId) {
      await prisma.notification.create({
        data: {
          type: 'comment',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: post.userId } },
          comment: { connect: { id: comment.id } },
        },
      });
    }

    return comment;
  },

  createReply: async (
    _: unknown,
    args: MutateContentArgs & { parentId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithInclusions> => {
    authenticate(currentUserId);
    const text = args.text?.trim();
    let imageUrl = args.gifUrl?.trim();

    const parentComment = await prisma.comment.findUnique({
      where: { id: Number(args.parentId) },
    });

    if (!parentComment) {
      throw new GraphQLError('Parent comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUserId } },
        post: { connect: { id: parentComment.postId } },
        parent: { connect: { id: parentComment.id } },
      },

      include: commentInclusions,
    });

    if (parentComment.userId !== currentUserId) {
      await prisma.notification.create({
        data: {
          type: 'comment',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: parentComment.userId } },
          comment: { connect: { id: comment.id } },
        },
      });
    }

    return comment;
  },

  deleteComment: async (
    _: unknown,
    { commentId }: { commentId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentBase> => {
    authenticate(currentUserId);

    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (comment.userId !== currentUserId) {
      throw new GraphQLError('You cannot delete this comment', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    return comment;
  },

  updateComment: async (
    _: unknown,
    args: MutateContentArgs & { commentId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithInclusions> => {
    authenticate(currentUserId);
    const text = args.text?.trim();
    let imageUrl = args.gifUrl?.trim();

    const comment = await prisma.comment.findUnique({
      where: { id: Number(args.commentId) },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (comment.userId !== currentUserId) {
      throw new GraphQLError('You cannot edit this comment', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      data: { text, imageUrl },
      include: commentInclusions,
    });

    return updatedComment;
  },

  likeComment: async (
    _: unknown,
    { commentId }: { commentId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<CommentWithInclusions> => {
    authenticate(currentUserId);

    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
      include: { likes: true },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let likeAction = 'connect';

    if (comment.likes.some((like) => like.id === currentUserId)) {
      likeAction = 'disconnect';
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      include: commentInclusions,
      data: { likes: { [likeAction]: { id: currentUserId } } },
    });

    if (likeAction === 'connect' && comment.userId !== currentUserId) {
      await prisma.notification.create({
        data: {
          type: 'like',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: comment.userId } },
          comment: { connect: { id: comment.id } },
        },
      });
    }

    return updatedComment;
  },
};
