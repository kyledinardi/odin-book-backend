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

exports.getIndexPosts = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { following: true },
  });

  const followedIds = user.following.map((followedUser) => followedUser.id);

  const posts = await prisma.post.findMany({
    where: {
      OR: [{ authorId: req.user.id }, { authorId: { in: followedIds } }],
    },

    include: { author: true, likes: true, comments: true },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  return res.json({ posts });
});

exports.getUserPosts = asyncHandler(async (req, res, next) => {
  const posts = await prisma.post.findMany({
    where: { id: req.user.id },
    orderBy: { timestamp: 'desc' },
  });

  res.json({ posts });
});

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
