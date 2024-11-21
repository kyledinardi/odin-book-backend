const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const pollController = require('../controllers/pollController');
const commentController = require('../controllers/commentController');
const repostController = require('../controllers/repostController');

const router = express.Router();

router.post('/auth/local', authController.local);
router.get('/auth/github', authController.github);
router.get('/auth/github/callback', authController.githubCallback);
router.post('/users', userController.createUser);
router.use(passport.authenticate('jwt', { session: false }));

router.get('/users', userController.getListedUsers);
router.get('/users/currentUser', userController.getCurrentUser);
router.get('/users/search', userController.searchUsers);
router.get('/users/:userId', userController.getUser);

router.put('/users', userController.updateProfile);
router.put('/users/password', userController.updatePassword);
router.put('/users/follow', userController.follow);
router.put('/users/unfollow', userController.unfollow);

router.post('/posts', postController.createPost);
router.get('/users/:userId/posts', postController.getUserPosts);
router.get('/users/:userId/likes', postController.getLikedPosts);
router.get('/posts', postController.getIndexPosts);
router.get('/posts/search', postController.searchPosts);
router.get('/posts/:postId', postController.getPost);

router.delete('/posts/:postId', postController.deletePost);
router.put('/posts/:postId', postController.updatePost);
router.put('/posts/:postId/like', postController.likePost);
router.put('/posts/:postId/unlike', postController.unlikePost);

router.post('/posts/:postId/comments', commentController.createRootComment);
router.post('/comments/:commentId', commentController.createReply);
router.get('/comments/:commentId', commentController.getComment);
router.delete('/comments/:commentId', commentController.deleteComment);

router.put('/comments/:commentId', commentController.updateComment);
router.put('/comments/:commentId/like', commentController.likeComment);
router.put('/comments/:commentId/unlike', commentController.unlikeComment);

router.post('/polls', pollController.createPoll);
router.put('/polls/:pollId', pollController.voteInPoll);
router.post('/reposts', repostController.repost);
router.delete('/reposts', repostController.unrepost);

module.exports = router;
