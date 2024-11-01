const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { body } = require('express-validator');
const { unlink } = require('fs/promises');
const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');

const storage = multer.diskStorage({
  destination: 'uploads/',

  filename(req, file, cb) {
    cb(null, `${crypto.randomUUID()}.${file.originalname.split('.').pop()}`);
  },
});

const upload = multer({ storage });
const prisma = new PrismaClient();

exports.createPost = [
  upload.single('postImage'),
  body('postText').trim(),

  asyncHandler(async (req, res, next) => {
    let imageUrl = null;

    if (req.file) {
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.secure_url;
        unlink(req.file.path);
      }
    }

    if (req.body.gifUrl !== '') {
      imageUrl = req.body.gifUrl;
    }

    const post = await prisma.post.create({
      data: {
        text: req.body.postText,
        imageUrl,
        author: { connect: { id: req.user.id } },
      },

      include: { author: true, likes: true, comments: true },
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

    include: { author: true, likes: true, comments: true, poll: true },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  return res.json({ posts });
});

exports.getUserPosts = asyncHandler(async (req, res, next) => {
  const posts = await prisma.post.findMany({
    where: { authorId: parseInt(req.params.userId, 10) },

    include: { author: true, likes: true, comments: true, poll: true },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  res.json({ posts });
});

exports.search = asyncHandler(async (req, res, next) => {
  const posts = await prisma.post.findMany({
    where: { text: { contains: req.query.query, mode: 'insensitive' } },
    include: { author: true, likes: true, comments: true, poll: true },
    orderBy: { likes: { _count: 'desc' } },
    take: 20,
  });

  res.json({ posts });
});

exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.findUnique({
    where: { id: parseInt(req.params.postId, 10) },

    include: {
      author: true,
      likes: true,
      poll: true,
      comments: {
        include: { user: true, likes: true },
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
    },
  });

  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    return next(err);
  }

  return res.json({ post });
});

exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.findUnique({
    where: { id: parseInt(req.params.postId, 10) },
  });

  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    return next(err);
  }

  if (post.authorId !== req.user.id) {
    const err = new Error('You cannot delete this post');
    err.status = 403;
    return next(err);
  }

  await prisma.post.delete({ where: { id: post.id } });
  return res.json({ post });
});

exports.updatePost = [
  body('text').trim(),

  asyncHandler(async (req, res, next) => {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.postId, 10) },
    });

    if (!post) {
      const err = new Error('Post not found');
      err.status = 404;
      return next(err);
    }

    if (post.authorId !== req.user.id) {
      const err = new Error('You cannot edit this post');
      err.status = 403;
      return next(err);
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { text: req.body.text },
    });

    return res.json({ post: updatedPost });
  }),
];

exports.likePost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.update({
    where: { id: parseInt(req.params.postId, 10) },
    data: { likes: { connect: { id: req.user.id } } },
    include: { likes: true },
  });

  return res.json({ post });
});

exports.unlikePost = asyncHandler(async (req, res, next) => {
  const post = await prisma.post.update({
    where: { id: parseInt(req.params.postId, 10) },
    data: { likes: { disconnect: { id: req.user.id } } },
    include: { likes: true },
  });

  return res.json({ post });
});
