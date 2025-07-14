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
  reposts: true,
  pollChoices: true,

  comments: {
    where: { parentId: null },
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: { user: true, likes: true, replies: true, reposts: true },
  },
};

const commentInclusions = {
  user: true,
  likes: true,
  reposts: true,
  post: { include: postInclusions },

  parent: {
    include: { user: true, likes: true, replies: true, reposts: true },
  },

  replies: {
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: { user: true, likes: true, replies: true, reposts: true },
  },
};

const roomInclusions = {
  users: true,

  messages: {
    orderBy: { timestamp: 'asc' },
    take: 20,
    include: { user: true },
  },
};

module.exports = {
  userInclusions,
  postInclusions,
  commentInclusions,
  roomInclusions,
};
