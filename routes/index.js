const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const roomController = require('../controllers/roomController');
const messageController = require('../controllers/messageController');
const notifController = require('../controllers/notificationController');
const pollController = require('../controllers/pollController');
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

router.get('/users/:userId/following', userController.getFollowing);
router.get('/users/:userId/followers', userController.getFollowers);
router.get('/users/:userId/mutuals', userController.getMutuals);
router.get('/users/:userId/followedFollowers', userController.getFfs);

router.put('/users', userController.updateProfile);
router.put('/users/password', userController.updatePassword);
router.put('/users/follow', userController.follow);
router.put('/users/unfollow', userController.unfollow);

router.post('/posts', postController.createPost);
router.get('/posts', postController.getIndexPosts);
router.get('/posts/refresh', postController.refreshIndexPosts);
router.get('/posts/search', postController.searchPosts);
router.get('/posts/:postId', postController.getPost);

router.get('/users/:userId/posts', postController.getUserPosts);
router.get('/users/:userId/posts/images', postController.getImagePosts);
router.get('/users/:userId/posts/likes', postController.getLikedPosts);

router.delete('/posts/:postId', postController.deletePost);
router.put('/posts/:postId', postController.updatePost);
router.put('/posts/:postId/like', postController.likePost);
router.put('/posts/:postId/unlike', postController.unlikePost);

router.post('/posts/:postId/comments', commentController.createRootComment);
router.post('/comments/:commentId', commentController.createReply);

router.get('/comments/:commentId', commentController.getComment);
router.get('/users/:userId/comments', commentController.getUserComments);
router.get('/posts/:postId/comments', commentController.getPostComments);
router.get('/comments/:commentId/replies', commentController.getReplies);

router.delete('/comments/:commentId', commentController.deleteComment);
router.put('/comments/:commentId', commentController.updateComment);
router.put('/comments/:commentId/like', commentController.likeComment);
router.put('/comments/:commentId/unlike', commentController.unlikeComment);

router.post('/polls', pollController.createPoll);
router.put('/polls/:pollId', pollController.voteInPoll);
router.post('/reposts', repostController.repost);
router.delete('/reposts', repostController.unrepost);

router.post('/rooms', roomController.findOrCreateRoom);
router.get('/rooms', roomController.getAllRooms);
router.get('/rooms/:roomId', roomController.getRoom);
router.post('/rooms/:roomId/messages', messageController.createMessage);
router.get('/rooms/:roomId/messages', messageController.getMessages);

router.delete('/messages/:messageId', messageController.deleteMessage);
router.put('/messages/:messageId', messageController.updateMessage);
router.get('/notifications', notifController.getNotifications);
router.get('/notifications/refresh', notifController.refreshNotifications);

module.exports = router;
