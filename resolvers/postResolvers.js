const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const getPaginationOptions = require('../utils/paginationOptions');
const { postInclusions } = require('../utils/inclusions');

const prisma = new PrismaClient();

const postQueries = {
  // getIndexPosts: authenticate(
  //   async (parent, { postCursor, repostCursor }, { currentUser }) => {}
  // ),

  // refreshIndexPosts: authenticate(
  //   async (parent, { timestamp }, { currentUser }) => {}
  // ),

  searchPosts: authenticate(async (parent, { query, cursor }) => {
    const posts = await prisma.post.findMany({
      where: { text: { contains: query, mode: 'insensitive' } },
      orderBy: [{ likes: { _count: 'desc' } }, { timestamp: 'asc' }],
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  }),

  getPost: authenticate(async (parent, { postId }) => {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId, 10) },
      include: postInclusions,
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return post;
  }),

  // getUserPosts: authenticate(
  //   async (parent, { userId, postCursor, repostCursor }) => {}
  // ),

  getImagePosts: authenticate(async (parent, { userId, cursor }) => {
    const posts = await prisma.post.findMany({
      where: { userId: Number(userId), NOT: { imageUrl: null } },
      orderBy: { timestamp: 'desc' },
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  }),

  getLikedPosts: authenticate(async (parent, { userId, cursor }) => {
    const posts = await prisma.post.findMany({
      where: { likes: { some: { id: Number(userId) } } },
      orderBy: { timestamp: 'desc' },
      include: postInclusions,
      ...getPaginationOptions(cursor),
    });

    return posts;
  }),
};

const postMutations = {
  // createPost: authenticate(
  //   async (parent, { text, gifUrl }, { currentUser }) => {}
  // ),

  deletePost: authenticate(async (parent, { postId }, { currentUser }) => {
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: postInclusions,
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (post.userId !== currentUser.id) {
      throw new GraphQLError('You cannot delete this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await prisma.post.delete({ where: { id: post.id } });
    return post;
  }),

  // updatePost: authenticate(
  //   async (parent, { postId, text, gifUrl }, { currentUser }) => {}
  // ),

  likePost: authenticate(async (parent, { postId }, { currentUser }) => {
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { likes: { connect: { id: currentUser.id } } },
      include: postInclusions,
    });

    await prisma.notification.create({
      data: {
        type: 'like',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: post.userId } },
        post: { connect: { id: post.id } },
      },
    });

    return updatedPost;
  }),

  unlikePost: authenticate(async (parent, { postId }, { currentUser }) => {
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { likes: { disconnect: { id: currentUser.id } } },
      include: postInclusions,
    });

    return updatedPost;
  }),
};

module.exports = { postQueries, postMutations };
