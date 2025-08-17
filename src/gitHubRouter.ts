import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import { FRONTEND_URL, JWT_SECRET } from './utils/config';

import type { RequestHandler } from 'express';

const gitHubRouter = express.Router();
gitHubRouter.get('/', [
  passport.authenticate('github', { scope: ['user:email'] }),
]);

gitHubRouter.get('/callback', (req, res, next) => {
  const githubAuthMiddleware = passport.authenticate(
    'github',
    { session: false },
    (
      err: Error,
      user: { id: string; username: string; displayName: string },
      info: { message: string },
    ) => {
      if (err) {
        next(err);
        return;
      }

      if (!user) {
        res.redirect(`${FRONTEND_URL}/login?error=${info.message}`);
        return;
      }

      req.login(user, { session: false }, (loginErr) => {
        if (loginErr) {
          next(loginErr);
          return;
        }

        const token = jwt.sign(user, JWT_SECRET);

        res.redirect(`${FRONTEND_URL}/login?token=${token}&userId=${user.id}`);
      });
    },
  ) as RequestHandler;

  githubAuthMiddleware(req, res, next);
});

export default gitHubRouter;
