const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const { commentInclusions } = require('../utils/inclusions');
const getPaginationOptions = require('../utils/paginationOptions');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const prisma = new PrismaClient();

const commentQueries = {
  getComment: authenticate(async (_, { commentId }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
      include: commentInclusions,
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const commentChain = [];
    let currentComment = comment;

    while (currentComment.parentId) {
      // eslint-disable-next-line no-await-in-loop
      currentComment = await prisma.comment.findUnique({
        where: { id: currentComment.parentId },
        include: commentInclusions,
      });

      commentChain.unshift(currentComment);
    }

    comment.commentChain = commentChain;
    return comment;
  }),

  getUserComments: authenticate(async (_, { userId, cursor }) => {
    const comments = await prisma.comment.findMany({
      where: { userId: Number(userId) },
      include: commentInclusions,
      orderBy: { timestamp: 'desc' },
      distinct: ['postId'],
      ...getPaginationOptions(cursor),
    });

    return comments;
  }),

  getPostComments: authenticate(async (_, { postId, cursor }) => {
    const comments = await prisma.comment.findMany({
      where: { postId: Number(postId), parentId: null },
      include: commentInclusions,
      orderBy: { timestamp: 'desc' },
      ...getPaginationOptions(cursor),
    });

    return comments;
  }),

  getReplies: authenticate(async (_, { commentId, cursor }) => {
    const replies = await prisma.comment.findMany({
      where: { parentId: Number(commentId) },
      include: commentInclusions,
      orderBy: { timestamp: 'desc' },
      ...getPaginationOptions(cursor),
    });

    return replies;
  }),
};

const commentMutations = {
  createRootComment: authenticate(async (_, args, { currentUser }) => {
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
        user: { connect: { id: currentUser.id } },
        post: { connect: { id: post.id } },
      },

      include: commentInclusions,
    });

    await prisma.notification.create({
      data: {
        type: 'comment',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: post.userId } },
        comment: { connect: { id: comment.id } },
      },
    });

    return comment;
  }),

  createReply: authenticate(async (_, args, { currentUser }) => {
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
        user: { connect: { id: currentUser.id } },
        post: { connect: { id: parentComment.postId } },
        parent: { connect: { id: parentComment.id } },
      },

      include: commentInclusions,
    });

    await prisma.notification.create({
      data: {
        type: 'comment',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: parentComment.userId } },
        comment: { connect: { id: comment.id } },
      },
    });

    return comment;
  }),

  deleteComment: authenticate(async (_, { commentId }, { currentUser }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
      include: commentInclusions,
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (comment.userId !== currentUser.id) {
      throw new GraphQLError('You cannot delete this comment', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    return comment;
  }),

  updateComment: authenticate(async (_, args, { currentUser }) => {
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

    if (comment.userId !== currentUser.id) {
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
  }),

  likeComment: authenticate(async (_, { commentId }, { currentUser }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      data: { likes: { connect: { id: currentUser.id } } },
      include: commentInclusions,
    });

    await prisma.notification.create({
      data: {
        type: 'like',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: comment.userId } },
        comment: { connect: { id: comment.id } },
      },
    });

    return updatedComment;
  }),

  unlikeComment: authenticate(async (_, { commentId }, { currentUser }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(commentId) },
    });

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      data: { likes: { disconnect: { id: currentUser.id } } },
      include: commentInclusions,
    });

    return updatedComment;
  }),
};

module.exports = { commentQueries, commentMutations };
