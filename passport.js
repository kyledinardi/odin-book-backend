const passport = require('passport');
const bcrypt = require('bcryptjs');
const Crypto = require('crypto');
const LocalStragetgy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

passport.use(
  new LocalStragetgy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        return done(null, false, { message: 'Username does not exist' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);

      if (!match) {
        return done(null, false, { message: 'Incorrect password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: 'http://localhost:3000/auth/github/callback',
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const { username } = profile;

        const existingGitHubUser = await prisma.user.findFirst({
          where: { provider: 'GitHub', providerProfileId: profile.id },
        });

        if (existingGitHubUser) {
          return done(null, existingGitHubUser);
        }

        const nonGitHubUser = await prisma.user.findUnique({
          where: { username },
        });

        if (nonGitHubUser) {
          return done(null, false, {
            message: 'Your GitHub username is already in use',
          });
        }

        const usernameHash = Crypto.createHash('sha256')
          .update(username.toLowerCase())
          .digest('hex');

        const newUser = await prisma.user.create({
          data: {
            username,
            displayName: profile.displayName,
            pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
            provider: 'GitHub',
            providerProfileId: profile.id,
          },
        });

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },

    async (jwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: jwtPayload.id },
        });

        return done(null, user || false);
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);
