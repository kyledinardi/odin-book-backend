const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getNotifications = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.query;

  const notifications = await prisma.notification.findMany({
    where: { targetUserId: req.user.id },
    orderBy: { timestamp: 'desc' },
    take: 20,
    cursor: notificationId ? { id: parseInt(notificationId, 10) } : undefined,
    skip: notificationId ? 1 : 0,
    include: { sourceUser: true },
  });

  await prisma.notification.updateMany({ data: { isRead: true } });
  return res.json({ notifications });
});

exports.refreshNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await prisma.notification.findMany({
    where: {
      targetUserId: req.user.id,
      timestamp: { gt: new Date(req.query.timestamp) },
    },

    orderBy: { timestamp: 'desc' },
    take: 20,
    include: { sourceUser: true },
  });

  return res.json({ notifications });
});
