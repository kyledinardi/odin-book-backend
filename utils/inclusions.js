const userInclusions = {
  following: true,

  _count: {
    select: {
      posts: true,
      followers: true,
      following: true,
      receivedNotifications: { where: { isRead: false } },
    },
  },
};

const postInclusions = {
  user: true,
  likes: true,
  poll: true,
  reposts: true,
  _count: { select: { comments: true } },

  comments: {
    where: { parentId: null },
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: { user: true, likes: true, replies: true, reposts: true },
  },
};

module.exports = { userInclusions, postInclusions };
