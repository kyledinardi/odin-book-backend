const express = require('express');
const passport = require('passport');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');

const router = express.Router();

router.post('/users', userController.createUser);
router.post('/users/login', userController.login);

router.use(passport.authenticate('jwt', { session: false }));
router.get('/users', userController.getAllUsers);
router.get('/users/currentUser', userController.getCurrentUser);
router.get('/users/:userId', userController.getUser);

router.put('/users/follow', userController.follow);
router.put('/users/unfollow', userController.unfollow);
router.put('/users/profile', userController.updateProfile);

router.post('/posts', postController.createPost);
router.get('/posts/index', postController.getIndexPosts);
router.get('/posts/user/:userId', postController.getUserPosts);
router.get('/posts/:postId', postController.getPost);

router.put('/posts/:postId/like', postController.likePost);
router.put('/posts/:postId/unlike', postController.unlikePost);

router.post('/posts/:postId/comments', commentController.createComment);

module.exports = router;
