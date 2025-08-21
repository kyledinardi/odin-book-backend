import Crypto from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET } from './config';
import parseJWTPayload from './parseJwtPayload';

import type { JwtPayload } from 'jsonwebtoken';
import type { VerifyCallback } from 'passport-oauth2';

const prisma = new PrismaClient();

passport.use(
  new LocalStrategy((username, password, done) => {
    const handleLocalAuth = async () => {
      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        done(null, false, { message: 'Username does not exist' });
        return;
      }

      if (typeof user.passwordHash !== 'string') {
        done(null, false, { message: 'Password does not exist' });
        return;
      }

      const match = await bcrypt.compare(password, user.passwordHash);

      if (!match) {
        done(null, false, { message: 'Incorrect password' });
        return;
      }

      done(null, user);
    };

    handleLocalAuth().catch((err) => done(err));
  }),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback',
    },
    (
      _accessToken: string,
      _refreshToken: string,
      profile: { id: string; username: string; displayName: string },
      done: VerifyCallback,
    ) => {
      const handleGitHubAuth = async () => {
        const { id, username, displayName } = profile;

        const existingGitHubUser = await prisma.user.findFirst({
          where: { provider: 'GitHub', providerProfileId: id },
        });

        if (existingGitHubUser) {
          done(null, existingGitHubUser);
          return;
        }

        const nonGitHubUser = await prisma.user.findUnique({
          where: { username },
        });

        if (nonGitHubUser) {
          done(null, false, {
            message: 'Your GitHub username is already in use',
          });

          return;
        }

        const usernameHash = Crypto.createHash('sha256')
          .update(username.toLowerCase())
          .digest('hex');

        const newUser = await prisma.user.create({
          data: {
            username,
            displayName,
            pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
            provider: 'GitHub',
            providerProfileId: id,
          },
        });

        done(null, newUser);
      };

      handleGitHubAuth().catch((err) => done(err));
    },
  ),
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },

    (jwtPayload: JwtPayload, done) => {
      const handleJwtAuth = async () => {
        const user = await prisma.user.findUnique({
          where: { id: parseJWTPayload(jwtPayload) },
        });

        done(null, user ?? false);
      };

      handleJwtAuth().catch((err) => done(err));
    },
  ),
);
