import { Prisma, PrismaClient } from '@prisma/client';
import { GraphQLError } from 'graphql';

import authenticate from '../utils/authenticate';
import {
  commentInclusions,
  postInclusions,
  repostInclusions,
} from '../utils/inclusions';
import getPaginationOptions from '../utils/paginationOptions';
import uploadToCloudinary from '../utils/uploadToCloudinary';

import type {
  IndexPostArgs,
  MutateContentArgs,
  PostBase,
  PostOrRepost,
  PostWithComments,
  PostWithInclusions,
  UserPostArgs,
} from '../types';

const prisma = new PrismaClient();

export const postQueries = {
  getIndexPosts: async (
    _: unknown,
    { postCursor, repostCursor, timestamp }: IndexPostArgs,
    { currentUserId }: { currentUserId: number },
  ): Promise<PostOrRepost[]> => {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { following: true },
    });

    if (!user) {
      throw new GraphQLError('Current user not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const followIds = user.following.map((follow) => follow.id);

    const getOptions = (isRepost: boolean) => ({
      where: { userId: { in: [...followIds, user.id] }, timestamp: {} },
      orderBy: { timestamp: Prisma.SortOrder.desc },

      ...(timestamp
        ? { take: 20 }
        : getPaginationOptions(isRepost ? repostCursor : postCursor)),
    });

    const [posts, reposts] = await Promise.all([
      prisma.post.findMany({
        ...getOptions(false),
        include: postInclusions,
      }),
      prisma.repost.findMany({
        ...getOptions(true),
        include: repostInclusions,
      }),
    ]);

    const feed = [...posts, ...reposts];
    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return feed.slice(0, 20);
  },

  searchPosts: async (
    _: unknown,
    { query, cursor }: { query: string; cursor?: string },
  ): Promise<PostWithInclusions[]> => {
    const posts = await prisma.post.findMany({
      where: { text: { contains: query, mode: 'insensitive' } },
      orderBy: [{ likes: { _count: 'desc' } }, { timestamp: 'asc' }],
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  },

  getPost: async (
    _: unknown,
    { postId, cursor }: { postId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostWithComments> => {
    authenticate(currentUserId);

    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },

      include: {
        ...postInclusions,

        comments: {
          where: { parentId: null },
          orderBy: { timestamp: 'desc' },
          include: commentInclusions,
          ...getPaginationOptions(cursor),
        },
      },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return post;
  },

  getUserPosts: async (
    _: unknown,
    { userId, postCursor, repostCursor }: UserPostArgs,
    { currentUserId }: { currentUserId: number },
  ): Promise<PostOrRepost[]> => {
    authenticate(currentUserId);

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const getOptions = (isRepost: boolean) => ({
      where: { userId: user.id },
      orderBy: { timestamp: Prisma.SortOrder.desc },
      ...getPaginationOptions(isRepost ? repostCursor : postCursor),
    });

    const [posts, reposts] = await Promise.all([
      prisma.post.findMany({
        ...getOptions(false),
        include: postInclusions,
      }),
      prisma.repost.findMany({
        ...getOptions(true),
        include: repostInclusions,
      }),
    ]);

    const feed = [...posts, ...reposts];
    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return feed.slice(0, 20);
  },

  getImagePosts: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostWithInclusions[]> => {
    authenticate(currentUserId);

    const posts = await prisma.post.findMany({
      where: { userId: Number(userId), NOT: { imageUrl: null } },
      orderBy: { timestamp: 'desc' },
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  },

  getLikedPosts: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostWithInclusions[]> => {
    authenticate(currentUserId);

    const posts = await prisma.post.findMany({
      where: { likes: { some: { id: Number(userId) } } },
      orderBy: { timestamp: 'desc' },
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  },
};

export const postMutations = {
  createPost: async (
    _: unknown,
    args: MutateContentArgs & { pollChoices?: string[] },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostBase> => {
    authenticate(currentUserId);
    const text = args.text?.trim();
    const pollChoices = args.pollChoices?.map((choice) => choice.trim());
    let imageUrl = args.gifUrl?.trim();

    if (pollChoices) {
      if (pollChoices.some((choice) => choice === '')) {
        throw new GraphQLError('Choice cannot be empty', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (pollChoices.length < 2 || pollChoices.length > 6) {
        throw new GraphQLError('Poll must have 2-6 choices', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const post = await prisma.post.create({
      include: postInclusions,

      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUserId } },

        pollChoices: pollChoices && {
          create: pollChoices.map((choice) => ({ text: choice })),
        },
      },
    });

    return post;
  },

  deletePost: async (
    _: unknown,
    { postId }: { postId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostBase> => {
    authenticate(currentUserId);

    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: postInclusions,
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (post.userId !== currentUserId) {
      throw new GraphQLError('You cannot delete this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await prisma.post.delete({ where: { id: post.id } });
    return post;
  },

  updatePost: async (
    _: unknown,
    args: MutateContentArgs & { postId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostWithInclusions> => {
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

    if (post.userId !== currentUserId) {
      throw new GraphQLError('You cannot update this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (args.image) {
      imageUrl = await uploadToCloudinary(args.image);
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { text, imageUrl: imageUrl ?? undefined },
      include: postInclusions,
    });

    return updatedPost;
  },

  likePost: async (
    _: unknown,
    { postId }: { postId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<PostWithInclusions> => {
    authenticate(currentUserId);

    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: { likes: true },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let likeAction = 'connect';

    if (post.likes.some((like) => like.id === currentUserId)) {
      likeAction = 'disconnect';
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      include: postInclusions,
      data: { likes: { [likeAction]: { id: currentUserId } } },
    });

    if (likeAction === 'connect' && post.userId !== currentUserId) {
      await prisma.notification.create({
        data: {
          type: 'like',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: post.userId } },
          post: { connect: { id: post.id } },
        },
      });
    }

    return updatedPost;
  },
};
