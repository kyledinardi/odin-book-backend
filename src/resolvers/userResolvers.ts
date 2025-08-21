import { createHash } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

import authenticate from '../utils/authenticate';
import { JWT_SECRET } from '../utils/config';
import { userInclusions } from '../utils/inclusions';
import getPaginationOptions from '../utils/paginationOptions';
import uploadToCloudinary from '../utils/uploadToCloudinary';

import type {
  CreateUserArgs,
  LoginResponse,
  UpdatePasswordArgs,
  UpdateProfileArgs,
  UserBase,
  UserWithInclusions,
} from '../types';

const prisma = new PrismaClient();

const throwInputError = (message: string) => {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
};

export const userQueries = {
  getListedUsers: async (
    _: unknown,
    _args: unknown,
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

    const users = await prisma.user.findMany({
      where: {
        followers: { none: { id: currentUserId } },
        NOT: { id: currentUserId },
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      take: 10,
    });

    return users;
  },

  getCurrentUser: async (
    _: unknown,
    _args: unknown,
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions> => {
    authenticate(currentUserId);

    const currentUserIdWithInclusions = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: userInclusions,
    });

    if (!currentUserIdWithInclusions) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return currentUserIdWithInclusions;
  },

  searchUsers: async (
    _: unknown,
    { query, cursor }: { query: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return users;
  },

  getUser: async (
    _: unknown,
    { userId }: { userId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions> => {
    authenticate(currentUserId);

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
  },

  getFollowing: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

    const following = await prisma.user.findMany({
      where: { followers: { some: { id: Number(userId) } } },
      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return following;
  },

  getFollowers: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

    const followers = await prisma.user.findMany({
      where: { following: { some: { id: Number(userId) } } },
      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return followers;
  },

  getMutuals: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

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
  },

  getFollowedFollowers: async (
    _: unknown,
    { userId, cursor }: { userId: string; cursor?: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions[]> => {
    authenticate(currentUserId);

    const followedFollowers = await prisma.user.findMany({
      where: {
        following: { some: { id: Number(userId) } },
        followers: { some: { id: currentUserId } },
      },

      include: userInclusions,
      orderBy: [{ followers: { _count: 'desc' } }, { joinDate: 'asc' }],
      ...getPaginationOptions(cursor),
    });

    return followedFollowers;
  },
};

export const userMutations = {
  localLogin: async (
    _: unknown,
    args: { username: string; password: string },
  ): Promise<LoginResponse> => {
    const username = args.username.trim();
    const password = args.password.trim();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throwInputError('Incorrect username or password');
    }

    if (!user?.passwordHash) {
      throw new GraphQLError('User has no password', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      throwInputError('Incorrect username or password');
    }

    const userForToken = {
      username: user.username,
      id: user.id,
    };

    const token = jwt.sign(userForToken, JWT_SECRET);
    return { user, token };
  },

  createUser: async (
    _: unknown,
    args: CreateUserArgs,
  ): Promise<LoginResponse> => {
    const username = args.username.trim();
    const displayName = args.displayName?.trim();
    const password = args.password.trim();
    const passwordConfirmation = args.passwordConfirmation.trim();

    if (!username) {
      throwInputError('Username must not be empty');
    }

    if (!password) {
      throwInputError('Password must not be empty');
    }

    const usernameInDatabase = await prisma.user.findUnique({
      where: { username },
    });

    if (usernameInDatabase) {
      throwInputError('A user already exists with this username');
    }

    if (password !== passwordConfirmation) {
      throwInputError('Passwords did not match');
    }

    const usernameHash = createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      include: userInclusions,

      data: {
        username,
        displayName: displayName ?? username,
        passwordHash,
        pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
      },
    });

    const userForToken = {
      username: user.username,
      id: user.id,
    };

    const token = jwt.sign(userForToken, JWT_SECRET);
    return { user, token };
  },

  updateProfile: async (
    _: unknown,
    args: UpdateProfileArgs,
    { currentUserId }: { currentUserId: number },
  ): Promise<UserBase> => {
    authenticate(currentUserId);

    if (currentUserId === 1 || currentUserId === 2) {
      throw new GraphQLError('Cannot change guest profile', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const data: Record<string, string | undefined> = {
      displayName: args.displayName?.trim(),
      bio: args.bio?.trim(),
      location: args.location?.trim(),
      website: args.website?.trim(),
    };

    if (args.pfp) {
      data.pfpUrl = await uploadToCloudinary(args.pfp);
    }

    if (args.headerImage) {
      data.headerUrl = await uploadToCloudinary(args.headerImage);
    }

    const user = await prisma.user.update({
      where: { id: currentUserId },
      data,
    });

    return user;
  },

  updatePassword: async (
    _: unknown,
    args: UpdatePasswordArgs,
    { currentUserId }: { currentUserId: number },
  ): Promise<UserBase> => {
    authenticate(currentUserId);

    const currentPassword = args.currentPassword.trim();
    const newPassword = args.newPassword.trim();
    const newPasswordConfirmation = args.newPasswordConfirmation.trim();

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (user.username === 'Guest' || user.username === 'Guest2') {
      throw new GraphQLError('Cannot change guest password', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (!user.passwordHash) {
      throw new GraphQLError('User has no password', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (!currentPassword) {
      throwInputError('Current password must not be empty');
    }

    if (!newPassword) {
      throwInputError('New Password must not be empty');
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!match) {
      throwInputError('Incorrect current password');
    }

    if (newPassword !== newPasswordConfirmation) {
      throwInputError('Passwords did not match');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: { passwordHash: newPasswordHash },
    });

    return updatedUser;
  },

  follow: async (
    _: unknown,
    { userId }: { userId: string },
    { currentUserId }: { currentUserId: number },
  ): Promise<UserWithInclusions> => {
    authenticate(currentUserId);

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { followers: true },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (user.id === currentUserId) {
      throw new GraphQLError('You cannot follow yourself', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    let followAction = 'connect';

    if (user.followers.some((follower) => follower.id === currentUserId)) {
      followAction = 'disconnect';
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: { following: { [followAction]: { id: Number(userId) } } },
      include: userInclusions,
    });

    if (followAction === 'connect') {
      await prisma.notification.create({
        data: {
          type: 'follow',
          sourceUser: { connect: { id: currentUserId } },
          targetUser: { connect: { id: Number(userId) } },
        },
      });
    }

    return updatedUser;
  },
};
