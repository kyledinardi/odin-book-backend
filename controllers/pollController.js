const asyncHandler = require('express-async-handler');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createPoll = [
  body('question').trim(),

  body('choices').customSanitizer((value) =>
    value.map((choice) => choice.trim()),
  ),

  asyncHandler(async (req, res, next) => {
    const choices = req.body.choices.filter((choice) => choice !== '');

    const post = await prisma.post.create({
      data: {
        text: req.body.question,
        poll: { create: { choices } },
        user: { connect: { id: req.user.id } },
      },

      include: { user: true, likes: true, comments: true, poll: true },
    });

    return res.json({ post });
  }),
];

exports.voteInPoll = asyncHandler(async (req, res, next) => {
  const pollVotedIn = await prisma.poll.findFirst({
    where: { voters: { has: req.user.id } },
  });

  if (pollVotedIn) {
    const err = new Error('You already voted in this poll');
    err.status = 400;
    return next(err);
  }

  const poll = await prisma.poll.update({
    where: { id: parseInt(req.params.pollId, 10) },
    data: {
      voters: { push: req.user.id },
      [`choice${req.body.choiceNumber}Votes`]: { push: req.user.id },
    },
  });

  return res.json({ poll });
});
