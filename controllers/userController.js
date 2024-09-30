const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { unlink } = require('fs/promises');
const Crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const storage = multer.diskStorage({
  destination: 'uploads/',

  filename(req, file, cb) {
    cb(null, `${crypto.randomUUID()}.${file.originalname.split('.').pop()}`);
  },
});

const upload = multer({ storage });
const prisma = new PrismaClient();

exports.createUser = [
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
    .custom((value, { req }) => value === req.body.password),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const usernameHash = Crypto.createHash('sha256')
      .update(req.body.username.toLowerCase())
      .digest('hex');

    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        passwordHash,
        pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
      },
    });

    return res.json({ user });
  }),
];

exports.login = [
  body('username').trim(),
  body('password').trim(),

  (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message });
      }

      req.login(user, { session: false }, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        const token = jwt.sign(user, process.env.JWT_SECRET);
        return res.json({ user, token });
      });

      return null;
    })(req, res, next);
  },
];

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await prisma.user.findMany({ orderBy: { username: 'asc' } });
  return res.json({ users });
});

exports.follow = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { following: { connect: { id: req.body.userId } } },
    include: { following: true },
  });

  return res.json({ user });
});

exports.updateBio = [
  body('bio').trim(),

  asyncHandler(async (req, res, next) => {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { bio: req.body.bio },
    });

    return res.json({ user });
  }),
];

exports.updatePfp = [
  upload.single('pfpUrl'),

  asyncHandler(async (req, res, next) => {
    const result = await cloudinary.uploader.upload(req.file.path);

    const [user] = await Promise.all([
      prisma.user.update({
        where: { id: req.user.id },
        data: { pfpUrl: result.secure_url },
      }),

      unlink(req.file.path),
    ]);

    return res.json({ user });
  }),
];
