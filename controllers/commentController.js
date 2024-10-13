const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createComment = [
  body('text', 'Comment text must not be empty').trim().notEmpty(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const { text } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        user: { connect: { id: req.user.id } },
        post: { connect: { id: parseInt(req.params.postId, 10) } },
      },

      include: { user: true, likes: true },
    });

    return res.json({ comment });
  }),
];

exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(req.params.commentId, 10) },
  });

  if (comment.userId !== req.user.id) {
    const err = new Error('You cannot edit this comment');
    err.status = 403;
    return next(err);
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  return res.json({ comment });
});

exports.updateComment = [
  body('text', 'Comment text must not be empty').trim().notEmpty(),

  asyncHandler(async (req, res, next) => {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(req.params.commentId, 10) },
    });

    if (comment.userId !== req.user.id) {
      const err = new Error('You cannot edit this comment');
      err.status = 403;
      return next(err);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      data: { text: req.body.text },
    });

    return res.json({ comment: updatedComment });
  }),
];

exports.likeComment = asyncHandler(async (req, res, next) => {
  const comment = await prisma.comment.update({
    where: { id: parseInt(req.params.commentId, 10) },
    data: { likes: { connect: { id: req.user.id } } },
    include: { likes: true },
  });

  return res.json({ comment });
});

exports.unlikeComment = asyncHandler(async (req, res, next) => {
  const comment = await prisma.comment.update({
    where: { id: parseInt(req.params.commentId, 10) },
    data: { likes: { disconnect: { id: req.user.id } } },
    include: { likes: true },
  });

  return res.json({ comment });
});
