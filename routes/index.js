const express = require('express');
const passport = require('passport');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/users', userController.createUser);
router.post('/users/login', userController.login);
router.use(passport.authenticate('jwt', { session: false }));

module.exports = router;
