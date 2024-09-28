const express = require('express');
const passport = require('passport');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');

const router = express.Router();

router.post('/users', userController.createUser);
router.post('/users/login', userController.login);
router.use(passport.authenticate('jwt', { session: false }));

router.post('/posts', postController.createPost);
router.put('/posts/:postId', postController.likePost);

module.exports = router;
