// const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
// const { unlink } = require('fs/promises');
// const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createPost = [
  body('text', 'Post text must not be empty').trim().notEmpty(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const { text } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).json({ text, errors: errors.array() });
    }

    const post = await prisma.post.create({
      data: { text, author: { connect: { id: req.user.id } } },
      include: { author: true },
    });

    return res.json({ post });
  }),
];

exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.findUnique({
    where: { id: parseInt(req.params.postId, 10) },

    include: {
      author: true,
      likes: true,
      comments: { include: { user: true } },
    },
  });

  return res.json({ post });
});

exports.likePost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.update({
    where: { id: parseInt(req.params.postId, 10) },
    data: { likes: { connect: { id: req.user.id } } },
    include: { likes: true },
  });

  return res.json({ post });
});
