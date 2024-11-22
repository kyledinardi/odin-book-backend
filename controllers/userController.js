const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { unlink } = require('fs/promises');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Crypto = require('crypto');
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

exports.getListedUsers = asyncHandler(async (req, res, next) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { following: { include: { following: true } } },
  });

  const filterList = currentUser.following.map((user) => user.id);
  filterList.push(currentUser.id);

  const followed = currentUser.following
    .map((user) => user.following)
    .flat()
    .filter((user) => !filterList.includes(user.id));

  let users;

  if (followed.length > 0) {
    const suggestions = [];

    followed.forEach((user) => {
      const i = suggestions.findIndex(
        (suggestion) => suggestion.userId === user.id,
      );

      if (i > -1) {
        suggestions[i].count += 1;
      } else {
        suggestions.push({ userId: user.id, count: 1 });
      }
    });

    suggestions.sort((a, b) => (a.count > b.count ? -1 : 1));
    const minCount = suggestions[4] ? suggestions[4].count : 1;

    const suggestionIds = suggestions
      .filter((suggestion) => suggestion.count >= minCount)
      .map((suggestion) => suggestion.userId);

    users = suggestionIds.map((suggestionId) =>
      followed.find((user) => user.id === suggestionId),
    );
  } else {
    users = await prisma.user.findMany({
      where: { NOT: { id: { in: filterList } } },
      orderBy: { followers: { _count: 'desc' } },
      take: 5,
    });
  }

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

exports.searchUsers = asyncHandler(async (req, res, next) => {
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

  return res.json({ users });
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

exports.updateProfile = [
  upload.fields([{ name: 'pfp' }, { name: 'headerImage' }]),
  body('bio').trim(),
  body('displayName').trim(),
  body('website', 'Website must be a valid URL').trim().isURL(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty() && req.body.website !== '') {
      return res.status(400).json({ expectedErrors: errors.array() });
    }

    if (req.user.username === 'Guest') {
      const err = new Error('Cannot edit guest account');
      err.status = 403;
      return next(err);
    }

    const data = {
      bio: req.body.bio,
      displayName: req.body.displayName,
      website: req.body.website,
    };

    if (req.files.pfp) {
      const pfp = req.files.pfp[0];
      const result = await cloudinary.uploader.upload(pfp.path);
      await unlink(pfp.path);
      data.pfpUrl = result.secure_url;
    }

    if (req.files.headerImage) {
      const headerImage = req.files.headerImage[0];
      const result = await cloudinary.uploader.upload(headerImage.path);
      await unlink(headerImage.path);
      data.headerUrl = result.secure_url;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { following: true },
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
    if (req.user.username === 'Guest') {
      const err = new Error('Cannot change guest password');
      err.status = 403;
      return next(err);
    }

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
