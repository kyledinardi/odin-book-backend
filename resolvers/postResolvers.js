const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const cloudinary = require('cloudinary').v2;
const authenticate = require('../utils/authenticate');
const { postInclusions, repostInclusions } = require('../utils/inclusions');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const postQueries = {
  getIndexPosts: authenticate(
    async (
      parent,
      { postCursor, repostCursor, timestamp },
      { currentUser }
    ) => {
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        include: { following: true },
      });

      const followIds = user.following.map((follow) => follow.id);

      function getOptions(isRepost) {
        let options = {
          where: { userId: { in: [...followIds, user.id] } },
          orderBy: { timestamp: 'desc' },
          include: isRepost ? repostInclusions : postInclusions,
        };

        if (timestamp) {
          options.where.timestamp = { gt: new Date(Number(timestamp)) };
          options.take = 20;
        } else {
          options = {
            ...options,
            ...getPaginationOptions(isRepost ? repostCursor : postCursor),
          };
        }

        return options;
      }

      const [posts, reposts] = await Promise.all([
        prisma.post.findMany(getOptions(false)),
        prisma.repost.findMany(getOptions(true)),
      ]);

      const feed = [...posts, ...reposts];
      feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return feed.slice(0, 20);
    }
  ),

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

  getUserPosts: authenticate(
    async (parent, { userId, postCursor, repostCursor }) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      function getOptions(isRepost) {
        return {
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          include: isRepost ? repostInclusions : postInclusions,
          ...getPaginationOptions(isRepost ? repostCursor : postCursor),
        };
      }

      const [posts, reposts] = await Promise.all([
        prisma.post.findMany(getOptions(false)),
        prisma.repost.findMany(getOptions(true)),
      ]);

      const feed = [...posts, ...reposts];
      feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return feed.slice(0, 20);
    }
  ),

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
  createPost: authenticate(async (parent, args, { currentUser }) => {
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
      const image = await args.image;
      const result = await cloudinary.uploader.upload(image.path);
      imageUrl = result.secure_url;
    }

    const post = await prisma.post.create({
      include: postInclusions,

      data: {
        text,
        imageUrl,
        user: { connect: { id: currentUser.id } },

        pollChoices: pollChoices && {
          create: pollChoices.map((choice) => ({ text: choice })),
        },
      },
    });

    return post;
  }),

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

  updatePost: authenticate(async (parent, args, { currentUser }) => {
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

    if (post.userId !== currentUser.id) {
      throw new GraphQLError('You cannot update this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (args.image) {
      const image = await args.image;
      const result = await cloudinary.uploader.upload(image.path);
      imageUrl = result.secure_url;
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { text, imageUrl },
      include: postInclusions,
    });

    return updatedPost;
  }),

  likePost: authenticate(async (parent, { postId }, { currentUser }) => {
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: { likes: true },
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let isLiked = false;

    if (post.likes.some((like) => like.id === currentUser.id)) {
      isLiked = true;
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      include: postInclusions,

      data: {
        likes: { [isLiked ? 'disconnect' : 'connect']: { id: currentUser.id } },
      },
    });

    if (!isLiked) {
      await prisma.notification.create({
        data: {
          type: 'like',
          sourceUser: { connect: { id: currentUser.id } },
          targetUser: { connect: { id: post.userId } },
          post: { connect: { id: post.id } },
        },
      });
    }

    return updatedPost;
  }),

  voteInPoll: authenticate(async (parent, { choiceId }, { currentUser }) => {
    const choice = await prisma.choice.findUnique({
      where: { id: Number(choiceId) },
      include: { votes: true },
    });

    if (!choice) {
      throw new GraphQLError('Choice not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (choice.votes.some((vote) => vote.id === currentUser.id)) {
      throw new GraphQLError('You have already voted in this poll', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updatedChoice = await prisma.choice.update({
      where: { id: choice.id },
      include: { post: { include: postInclusions } },
      data: { votes: { connect: { id: currentUser.id } } },
    });

    return updatedChoice.post;
  }),

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

    const existingRepost = await prisma.repost.findFirst({
      where: { userId: currentUser.id, [`${contentType}Id`]: content.id },
      include: repostInclusions,
    });

    if (existingRepost) {
      await prisma.repost.delete({ where: { id: existingRepost.id } });
      return existingRepost;
    }

    const newRepost = await prisma.repost.create({
      data: {
        user: { connect: { id: currentUser.id } },
        [contentType]: { connect: { id: content.id } },
      },

      include: repostInclusions,
    });

    await prisma.notification.create({
      data: {
        type: 'repost',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: content.userId } },
        [contentType]: { connect: { id: content.id } },
      },
    });

    return newRepost;
  }),
};

module.exports = { postQueries, postMutations };
