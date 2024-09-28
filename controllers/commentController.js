const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createComment = [
  body('text', 'Post text must not be empty').trim().notEmpty(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const { text } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).json({ text, errors: errors.array() });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        user: { connect: { id: req.user.id } },
        post: { connect: { id: parseInt(req.params.postId, 10) } },
      },

      include: { user: true, post: true },
    });

    return res.json({ comment });
  }),
];
