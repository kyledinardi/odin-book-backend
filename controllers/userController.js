const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { unlink } = require('fs/promises');
const Crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: 'uploads/',

  filename(req, file, cb) {
    cb(null, `${crypto.randomUUID()}.${file.originalname.split('.').pop()}`);
  },
});

const upload = multer({ storage });
const prisma = new PrismaClient();

exports.createUser = [
  body('displayName').trim(),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username must not be empty')

    .custom(async (username) => {
      const usernameInDatabase = await prisma.user.findUnique({
        where: { username },
      });

      if (usernameInDatabase) {
        throw new Error('A user already exists with this username');
      }
    }),

  body('password', 'Password must not be empty').trim().notEmpty(),

  body('passwordConfirmation', 'Passwords did not match')
    .trim()
    .custom((password, { req }) => password === req.body.password),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ expectedErrors: errors.array() });
    }

    const usernameHash = Crypto.createHash('sha256')
      .update(req.body.username.toLowerCase())
      .digest('hex');

    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const displayName =
      req.body.displayName === '' ? req.body.username : req.body.displayName;

    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        displayName,
        passwordHash,
        pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
      },
    });

    return res.json({ user });
  }),
];

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await prisma.user.findMany({
    where: { NOT: { id: req.user.id } },
    orderBy: { followers: { _count: 'desc' } },
    take: 20,
  });

  return res.json({ users });
});

exports.getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { following: true },
  });

  if (!user) {
    const err = new Error('You are not logged in');
    err.status = 401;
    return next(err);
  }

  return res.json({ user });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.userId, 10) },

    include: {
      followers: { orderBy: { followers: { _count: 'desc' } } },
      following: { orderBy: { followers: { _count: 'desc' } } },
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    return next(err);
  }

  return res.json({ user });
});

exports.search = asyncHandler(async (req, res, next) => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: req.query.query, mode: 'insensitive' } },
        { displayName: { contains: req.query.query, mode: 'insensitive' } },
      ],
    },

    orderBy: { followers: { _count: 'desc' } },
    take: 20,
  });

  res.json({ users });
});

exports.updateProfile = [
  upload.single('pfp'),
  body('bio').trim(),

  asyncHandler(async (req, res, next) => {
    const userData = { bio: req.body.bio, displayName: req.body.displayName };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      await unlink(req.file.path);
      userData.pfpUrl = result.secure_url;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: userData,
    });

    return res.json({ user });
  }),
];

exports.updatePassword = [
  body('currentPassword', 'Current password must not be empty')
    .trim()
    .notEmpty()

    .custom(async (password, { req }) => {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const match = await bcrypt.compare(password, user.passwordHash);

      if (!match) {
        throw new Error('Incorrect current password');
      }
    }),

  body('newPassword', 'New Password must not be empty').trim().notEmpty(),

  body('newPasswordConfirmation', 'Passwords did not match')
    .trim()
    .custom((password, { req }) => password === req.body.newPassword),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ expectedErrors: errors.array() });
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    return res.json({ user });
  }),
];

exports.follow = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { following: { connect: { id: req.body.userId } } },
    include: { following: true },
  });

  return res.json({ user });
});

exports.unfollow = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { following: { disconnect: { id: req.body.userId } } },
    include: { following: true },
  });

  return res.json({ user });
});
