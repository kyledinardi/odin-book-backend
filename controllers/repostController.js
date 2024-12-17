const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.repost = asyncHandler(async (req, res, next) => {
  const { contentType, id } = req.body;

  if (contentType !== 'post' && contentType !== 'comment') {
    const err = new Error('Invalid contentType');
    err.status = 400;
    return next(err);
  }

  const isAlreadyReposted = await prisma.repost.findFirst({
    where: { userId: req.user.id, [`${contentType}Id`]: id },
  });

  if (isAlreadyReposted) {
    const err = new Error(`You have already reposted this ${contentType}`);
    err.status = 400;
    return next(err);
  }

  const content = await prisma[contentType].findUnique({
    where: { id },
  });

  if (!content) {
    const err = new Error(`${contentType} not found`);
    err.status = 404;
    return next(err);
  }

  const repost = await prisma.repost.create({
    data: {
      user: { connect: { id: req.user.id } },
      [contentType]: { connect: { id } },
    },
  });

  await prisma.notification.create({
    data: {
      type: 'repost',
      sourceUser: { connect: { id: req.user.id } },
      targetUser: { connect: { id: content.userId } },
      post: contentType === 'post' ? { connect: { id } } : undefined,
      comment: contentType === 'comment' ? { connect: { id } } : undefined,
    },
  });

  return res.json({ repost });
});

exports.unrepost = asyncHandler(async (req, res, next) => {
  const repost = await prisma.repost.delete({
    where: { id: req.body.id },
  });

  return res.json({ repost });
});
