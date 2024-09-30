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
router.put('/users/follow', userController.follow);
router.put('/users/bio', userController.updateBio);
router.put('/users/pfp', userController.updatePfp);

router.post('/posts', postController.createPost);
router.get('/posts/index', postController.getIndexPosts);
router.get('/posts/user', postController.getUserPosts);
router.get('/posts/:postId', postController.getPost);
router.put('/posts/:postId', postController.likePost);

router.post('/posts/:postId/comments', commentController.createComment);

module.exports = router;
