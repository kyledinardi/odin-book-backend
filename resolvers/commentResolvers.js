const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const authenticate = require('../utils/authenticate');
const getPaginationOptions = require('../utils/paginationOptions');
const { commentInclusions } = require('../utils/inclusions');

const prisma = new PrismaClient();

const commentQueries = {
  getComment: authenticate(async (parent, { commentId }) => {
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

  getUserComments: authenticate(async (parent, { userId, cursor }) => {
    const comments = await prisma.comment.findMany({
      where: { userId: Number(userId) },
      include: commentInclusions,
      orderBy: { timestamp: 'desc' },
      distinct: ['postId'],
      ...getPaginationOptions(cursor),
    });

    return comments;
  }),

  getPostComments: authenticate(async (parent, { postId, cursor }) => {
    const comments = await prisma.comment.findMany({
      where: { postId: Number(postId), parentId: null },
      include: commentInclusions,
      orderBy: { timestamp: 'desc' },
      ...getPaginationOptions(cursor),
    });

    return comments;
  }),

  getReplies: authenticate(async (parent, { commentId, cursor }) => {
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
  // createRootComment: authenticate(
  //   async (parent, { postId, text, gifUrl }, { currentUser }) => {}
  // ),

  // createReply: authenticate(
  //   async (parent, { commentId, text, gifUrl }, { currentUser }) => {}
  // ),

  deleteComment: authenticate(
    async (parent, { commentId }, { currentUser }) => {
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
    }
  ),

  // updateComment: authenticate(
  //   async (parent, { commentId, text, gifUrl }, { currentUser }) => {}
  // ),

  likeComment: authenticate(async (parent, { commentId }, { currentUser }) => {
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

  unlikeComment: authenticate(
    async (parent, { commentId }, { currentUser }) => {
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
    }
  ),
};

module.exports = { commentQueries, commentMutations };
