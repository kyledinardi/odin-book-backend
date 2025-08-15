import passport from 'passport';
import bcrypt from 'bcryptjs';
// import Crypto from 'crypto';
import { Strategy as LocalStrategy } from 'passport-local';
// import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import {
  /*GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,*/ JWT_SECRET,
} from './config';
import { JwtPayload } from 'jsonwebtoken';
import parseJWTPayload from './parseJwtPayload';

const prisma = new PrismaClient();

passport.use(
  new LocalStrategy((username, password, done) => {
    const handleLocalAuth = async () => {
      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        return done(null, false, { message: 'Username does not exist' });
      }

      if (typeof user.passwordHash !== 'string') {
        return done(null, false, { message: 'Password does not exist' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);

      if (!match) {
        return done(null, false, { message: 'Incorrect password' });
      }

      return done(null, user);
    };

    handleLocalAuth().catch((err) => done(err));
  })
);

// passport.use(
//   new GitHubStrategy(
//     {
//       clientID: GITHUB_CLIENT_ID,
//       clientSecret: GITHUB_CLIENT_SECRET,
//       callbackUrl: 'http://localhost:3000/auth/github/callback',
//     },

//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         const { username } = profile;

//         const existingGitHubUser = await prisma.user.findFirst({
//           where: { provider: 'GitHub', providerProfileId: profile.id },
//         });

//         if (existingGitHubUser) {
//           return done(null, existingGitHubUser);
//         }

//         const nonGitHubUser = await prisma.user.findUnique({
//           where: { username },
//         });

//         if (nonGitHubUser) {
//           return done(null, false, {
//             message: 'Your GitHub username is already in use',
//           });
//         }

//         const usernameHash = Crypto.createHash('sha256')
//           .update(username.toLowerCase())
//           .digest('hex');

//         const newUser = await prisma.user.create({
//           data: {
//             username,
//             displayName: profile.displayName,
//             pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
//             provider: 'GitHub',
//             providerProfileId: profile.id,
//           },
//         });

//         return done(null, newUser);
//       } catch (err) {
//         return done(err);
//       }
//     }
//   )
// );

if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET is not defined');
}

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

        return done(null, user || false);
      };

      handleJwtAuth().catch((err) => done(err));
    }
  )
);
