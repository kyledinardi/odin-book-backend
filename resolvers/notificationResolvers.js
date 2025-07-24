const { PrismaClient } = require('@prisma/client');
const authenticate = require('../utils/authenticate');
const getPaginationOptions = require('../utils/paginationOptions');

const prisma = new PrismaClient();

const notificationQueries = {
  getNotifications: authenticate(
    async (_, { cursor }, { currentUser }) => {
      const notifications = await prisma.notification.findMany({
        where: { targetUserId: currentUser.id },
        orderBy: { timestamp: 'desc' },
        include: { sourceUser: true },
        ...getPaginationOptions(cursor),
      });

      await prisma.notification.updateMany({
        where: { targetUserId: currentUser.id },
        data: { isRead: true },
      });

      return notifications;
    }
  ),

  refreshNotifications: authenticate(
    async (_, { timestamp }, { currentUser }) => {
      const notifications = await prisma.notification.findMany({
        where: {
          targetUserId: currentUser.id,
          timestamp: { gt: new Date(timestamp) },
        },

        orderBy: { timestamp: 'desc' },
        include: { sourceUser: true },
        take: 20,
      });

      return notifications;
    }
  ),
};

module.exports = { notificationQueries };
