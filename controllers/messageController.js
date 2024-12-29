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

exports.createMessage = [
  upload.single('image'),
  body('text').trim(),

  asyncHandler(async (req, res, next) => {
    let imageUrl;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      unlink(req.file.path);
    }

    if (req.body.gifUrl !== '') {
      imageUrl = req.body.gifUrl;
    }

    const message = await prisma.message.create({
      data: {
        text: req.body.text,
        imageUrl,
        user: { connect: { id: req.user.id } },
        room: { connect: { id: parseInt(req.params.roomId, 10) } },
      },

      include: { user: true },
    });

    await prisma.room.update({
      where: { id: message.roomId },
      data: { lastUpdated: new Date() },
    });

    return res.json({ message });
  }),
];

exports.getMessages = asyncHandler(async (req, res, next) => {
  const { messageId } = req.query;

  const messages = await prisma.message.findMany({
    where: { roomId: parseInt(req.params.roomId, 10) },
    orderBy: { timestamp: 'desc' },
    take: 20,
    cursor: { id: parseInt(messageId, 10) },
    skip: 1,
    include: { user: true },
  });

  return res.json({ messages });
});

exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await prisma.message.findUnique({
    where: { id: parseInt(req.params.messageId, 10) },
  });

  if (!message) {
    const err = new Error('Message not found');
    err.status = 404;
    return next(err);
  }

  if (message.userId !== req.user.id) {
    const err = new Error('You cannot delete this message');
    err.status = 403;
    return next(err);
  }

  await prisma.message.delete({ where: { id: message.id } });
  return res.json({ message });
});

exports.updateMessage = [
  body('text').trim(),

  asyncHandler(async (req, res, next) => {
    const message = await prisma.message.findUnique({
      where: { id: parseInt(req.params.messageId, 10) },
    });

    if (!message) {
      const err = new Error('Message not found');
      err.status = 404;
      return next(err);
    }

    if (message.userId !== req.user.id) {
      const err = new Error('You cannot edit this message');
      err.status = 403;
      return next(err);
    }

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: { text: req.body.text },
      include: { user: true },
    });

    return res.json({ message: updatedMessage });
  }),
];
