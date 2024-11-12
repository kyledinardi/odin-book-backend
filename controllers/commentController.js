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

exports.createComment = [
  upload.single('image'),
  body('text').trim(),

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

    const comment = await prisma.comment.create({
      data: {
        text: req.body.text,
        imageUrl,
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

  await prisma.comment.delete({ where: { id: comment.id } });
  return res.json({ comment });
});

exports.updateComment = [
  body('text').trim(),

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
