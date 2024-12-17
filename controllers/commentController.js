const asyncHandler = require('express-async-handler');
const multer = require('multer');
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

const commentInclusions = {
  user: true,
  likes: true,
  reposts: true,
  replies: true,

  post: {
    include: {
      user: true,
      reposts: true,
      likes: true,
      poll: true,
      comments: { where: { parentId: null } },
    },
  },
};

exports.createRootComment = [
  upload.single('image'),
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

    let imageUrl;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      unlink(req.file.path);
    }

    if (req.body.gifUrl !== '') {
      imageUrl = req.body.gifUrl;
    }

    const comment = await prisma.comment.create({
      data: {
        text: req.body.text,
        imageUrl,
        user: { connect: { id: req.user.id } },
        post: { connect: { id: post.id } },
      },

      include: { user: true, likes: true, replies: true, reposts: true },
    });

    await prisma.notification.create({
      data: {
        type: 'comment',
        sourceUser: { connect: { id: req.user.id } },
        targetUser: { connect: { id: post.userId } },
        post: { connect: { id: post.id } },
      },
    });

    return res.json({ comment });
  }),
];

exports.createReply = [
  upload.single('image'),
  body('text').trim(),

  asyncHandler(async (req, res, next) => {
    const parent = await prisma.comment.findUnique({
      where: { id: parseInt(req.params.commentId, 10) },
    });

    if (!parent) {
      const err = new Error('Comment not found');
      err.status = 404;
      return next(err);
    }

    let imageUrl;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      unlink(req.file.path);
    }

    if (req.body.gifUrl !== '') {
      imageUrl = req.body.gifUrl;
    }

    const comment = await prisma.comment.create({
      data: {
        text: req.body.text,
        imageUrl,
        user: { connect: { id: req.user.id } },
        post: { connect: { id: parent.postId } },
        parent: { connect: { id: parent.id } },
      },

      include: { user: true, likes: true, replies: true, reposts: true },
    });

    await prisma.notification.create({
      data: {
        type: 'reply',
        sourceUser: { connect: { id: req.user.id } },
        targetUser: { connect: { id: parent.userId } },
        comment: { connect: { id: parent.id } },
      },
    });

    return res.json({ comment });
  }),
];

exports.getComment = asyncHandler(async (req, res, next) => {
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(req.params.commentId, 10) },

    include: {
      ...commentInclusions,

      replies: {
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: { user: true, likes: true, replies: true, reposts: true },
      },
    },
  });

  if (!comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    return next(err);
  }

  const commentChain = [];
  let currentComment = comment;

  while (currentComment.parentId) {
    // eslint-disable-next-line no-await-in-loop
    currentComment = await prisma.comment.findUnique({
      where: { id: currentComment.parentId },
      include: { user: true, likes: true, replies: true, reposts: true },
    });

    commentChain.unshift(currentComment);
  }

  comment.commentChain = commentChain;
  return res.json({ comment });
});

exports.getUserComments = asyncHandler(async (req, res, next) => {
  const { commentId } = req.query;

  const comments = await prisma.comment.findMany({
    where: { userId: parseInt(req.params.userId, 10) },
    orderBy: { timestamp: 'desc' },
    take: 20,
    cursor: commentId ? { id: parseInt(commentId, 10) } : undefined,
    skip: req.query.commentId ? 1 : 0,
    distinct: ['postId'],

    include: {
      ...commentInclusions,

      parent: {
        include: { user: true, likes: true, reposts: true, replies: true },
      },
    },
  });

  return res.json({ comments });
});

exports.getPostComments = asyncHandler(async (req, res, next) => {
  const comments = await prisma.comment.findMany({
    where: { postId: parseInt(req.params.postId, 10), parentId: null },
    orderBy: { timestamp: 'desc' },
    take: 20,
    cursor: { id: parseInt(req.query.commentId, 10) },
    skip: 1,
    include: { user: true, likes: true, reposts: true, replies: true },
  });

  return res.json({ comments });
});

exports.getReplies = asyncHandler(async (req, res, next) => {
  const replies = await prisma.comment.findMany({
    where: { parentId: parseInt(req.params.commentId, 10) },
    orderBy: { timestamp: 'desc' },
    take: 20,
    cursor: { id: parseInt(req.query.replyId, 10) },
    skip: 1,
    include: { user: true, likes: true, replies: true, reposts: true },
  });

  return res.json({ replies });
});

exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(req.params.commentId, 10) },
  });

  if (!comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    return next(err);
  }

  if (comment.userId !== req.user.id) {
    const err = new Error('You cannot delete this comment');
    err.status = 403;
    return next(err);
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  return res.json({ comment });
});

exports.updateComment = [
  upload.single('image'),
  body('text').trim(),

  asyncHandler(async (req, res, next) => {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(req.params.commentId, 10) },
    });

    if (!comment) {
      const err = new Error('Comment not found');
      err.status = 404;
      return next(err);
    }

    if (comment.userId !== req.user.id) {
      const err = new Error('You cannot edit this comment');
      err.status = 403;
      return next(err);
    }

    let imageUrl;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      unlink(req.file.path);
    }

    if (req.body.gifUrl !== '') {
      imageUrl = req.body.gifUrl;
    }

    const updatedComment = await prisma.comment.update({
      where: { id: comment.id },
      data: { text: req.body.text, imageUrl },

      include: {
        ...commentInclusions,

        replies: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: { user: true, likes: true, replies: true, reposts: true },
        },
      },
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

  await prisma.notification.create({
    data: {
      type: 'like',
      sourceUser: { connect: { id: req.user.id } },
      targetUser: { connect: { id: comment.userId } },
      comment: { connect: { id: comment.id } },
    },
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
