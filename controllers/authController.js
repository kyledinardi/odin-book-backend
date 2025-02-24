require('dotenv').config();
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const passport = require('passport');

exports.local = [
  body('username').trim(),
  body('password').trim(),

  (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res
          .status(400)
          .json({ expectedError: { message: info.message } });
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

exports.github = passport.authenticate('github', { scope: ['user:email'] });

exports.githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=${info.message}`,
      );
    }

    req.login(user, { session: false }, async (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      const token = jwt.sign(user, process.env.JWT_SECRET);

      return res.redirect(
        `${process.env.FRONTEND_URL}/login?token=${token}&userId=${user.id}`,
      );
    });

    return res.end();
  })(req, res, next);
};
