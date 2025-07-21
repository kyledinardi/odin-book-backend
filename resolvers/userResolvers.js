const { PrismaClient } = require('@prisma/client');
const { GraphQLError } = require('graphql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash } = require('node:crypto');
const cloudinary = require('cloudinary').v2;
const authenticate = require('../utils/authenticate');
const { JWT_SECRET } = require('../utils/config');
const { userInclusions } = require('../utils/inclusions');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const userQueries = {
  getListedUsers: authenticate(async (parent, args, { currentUser }) => {
    const users = await prisma.user.findMany({
      where: {
        followers: { none: { id: currentUser.id } },
        NOT: { id: currentUser.id },
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      take: 10,
    });

    return users;
  }),

  getCurrentUser: authenticate((parent, args, { currentUser }) => {
    const currentUserWithInclusions = prisma.user.findUnique({
      where: { id: currentUser.id },
      include: userInclusions,
    });

    return currentUserWithInclusions;
  }),

  searchUsers: authenticate(async (parent, { query, userId }) => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(userId),
    });

    return users;
  }),

  getUser: authenticate(async (parent, { userId }) => {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: userInclusions,
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return user;
  }),

  getFollowing: authenticate(async (parent, { userId, cursor }) => {
    const following = await prisma.user.findMany({
      where: { followers: { some: { id: Number(userId) } } },
      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return following;
  }),

  getFollowers: authenticate(async (parent, { userId, cursor }) => {
    const followers = await prisma.user.findMany({
      where: { following: { some: { id: Number(userId) } } },
      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return followers;
  }),

  getMutuals: authenticate(async (parent, { userId, cursor }) => {
    const mutuals = await prisma.user.findMany({
      where: {
        followers: { some: { id: Number(userId) } },
        following: { some: { id: Number(userId) } },
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return mutuals;
  }),

  getFfs: authenticate(async (parent, { userId, cursor }, { currentUser }) => {
    const ffs = await prisma.user.findMany({
      where: {
        following: { some: { id: Number(userId) } },
        followers: { some: { id: currentUser.id } },
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return ffs;
  }),
};

const userMutations = {
  localLogin: async (parent, args) => {
    const username = args.username.trim();
    const password = args.password.trim();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!user || !match) {
      throw new GraphQLError('Incorrect username or password', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const userForToken = {
      username: user.username,
      id: user.id,
    };

    const token = jwt.sign(userForToken, JWT_SECRET);
    return { user, token };
  },

  createUser: async (parent, args) => {
    const username = args.username.trim();
    const displayName = args.displayName?.trim();
    const password = args.password.trim();
    const passwordConfirmation = args.passwordConfirmation.trim();
    const errors = [];

    if (!username) {
      errors.push('Username must not be empty');
    } else {
      const usernameInDatabase = await prisma.user.findUnique({
        where: { username },
      });

      if (usernameInDatabase) {
        errors.push('A user already exists with this username');
      }
    }

    if (!password) {
      errors.push('Password must not be empty');
    } else if (password !== passwordConfirmation) {
      errors.push('Passwords did not match');
    }

    if (errors.length > 0) {
      throw new GraphQLError(errors.join(', '), {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const usernameHash = createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      include: userInclusions,

      data: {
        username,
        displayName: displayName || username,
        passwordHash,
        pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
      },
    });

    return user;
  },

  updateProfile: authenticate(async (parent, args, { currentUser }) => {
    if (currentUser.username === 'Guest' || currentUser.username === 'Guest2') {
      throw new GraphQLError('Cannot change guest profile', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const data = {
      displayName: args.displayName?.trim(),
      bio: args.bio?.trim(),
      location: args.location?.trim(),
      website: args.website?.trim(),
    };

    try {
      // eslint-disable-next-line no-unused-vars
      const isValidUrl = new URL(data.website);
    } catch (err) {
      throw new GraphQLError('Website must be a valid URL', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (args.pfp) {
      const pfp = await args.pfp;
      const result = await cloudinary.uploader.upload(pfp.path);
      data.pfpUrl = result.secure_url;
    }

    if (args.headerImage) {
      const headerImage = await args.headerImage;
      const result = await cloudinary.uploader.upload(headerImage.path);
      data.headerImageUrl = result.secure_url;
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      include: userInclusions,
      data,
    });

    return user;
  }),

  updatePassword: authenticate(async (parent, args, { currentUser }) => {
    const currentPassword = args.currentPassword.trim();
    const newPassword = args.newPassword.trim();
    const newPasswordConfirmation = args.newPasswordConfirmation.trim();

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (user.username === 'Guest' || user.username === 'Guest2') {
      throw new GraphQLError('Cannot change guest password', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const errors = [];

    if (!currentPassword) {
      errors.push('Current password must not be empty');
    } else {
      const match = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!match) {
        errors.push('Incorrect current password');
      }
    }

    if (!newPassword) {
      errors.push('New Password must not be empty');
    } else if (newPassword !== newPasswordConfirmation) {
      errors.push('Passwords did not match');
    }

    if (errors.length > 0) {
      throw new GraphQLError(errors.join(', '), {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: newPasswordHash },
    });

    return updatedUser;
  }),

  follow: authenticate(async (parent, { userId }, { currentUser }) => {
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { following: { connect: { id: Number(userId) } } },
      include: { following: true },
    });

    await prisma.notification.create({
      data: {
        type: 'follow',
        sourceUser: { connect: { id: currentUser.id } },
        targetUser: { connect: { id: Number(userId) } },
      },
    });

    return user;
  }),

  unfollow: authenticate(async (parent, { userId }, { currentUser }) => {
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { following: { disconnect: { id: Number(userId) } } },
      include: { following: true },
    });

    return user;
  }),
};

module.exports = { userQueries, userMutations };
