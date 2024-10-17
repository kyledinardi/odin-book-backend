const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');

const router = express.Router();

router.post('/auth/local', authController.local);
router.get('/auth/github', authController.github);
router.get('/auth/github/callback', authController.githubCallback);
router.post('/users', userController.createUser);
router.use(passport.authenticate('jwt', { session: false }));

router.get('/users', userController.getAllUsers);
router.get('/users/currentUser', userController.getCurrentUser);
router.get('/users/search', userController.search);
router.get('/users/:userId', userController.getUser);

router.put('/users/profile', userController.updateProfile);
router.put('/users/follow', userController.follow);
router.put('/users/unfollow', userController.unfollow);

router.post('/posts', postController.createPost);
router.get('/users/:userId/posts', postController.getUserPosts);
router.get('/posts/index', postController.getIndexPosts);
router.get('/posts/search', postController.search);
router.get('/posts/:postId', postController.getPost);
router.delete('/posts/:postId', postController.deletePost);

router.put('/posts/:postId/', postController.updatePost);
router.put('/posts/:postId/like', postController.likePost);
router.put('/posts/:postId/unlike', postController.unlikePost);

router.post('/posts/:postId/comments', commentController.createComment);
router.delete('/comments/:commentId', commentController.deleteComment);
router.put('/comments/:commentId', commentController.updateComment);
router.put('/comments/:commentId/like', commentController.likeComment);
router.put('/comments/:commentId/unlike', commentController.unlikeComment);

module.exports = router;
