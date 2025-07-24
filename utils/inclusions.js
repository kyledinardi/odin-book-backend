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
  pollChoices: { include: { votes: true } },

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
    include: { user: true, likes: true, replies: true, reposts: true },
    take: 20,
  },
};

const repostInclusions = {
  user: true,
  post: { include: postInclusions },
  comment: { include: commentInclusions },
};

const roomInclusions = {
  users: true,

  messages: {
    orderBy: { timestamp: 'asc' },
    include: { user: true },
    take: 20,
  },
};

module.exports = {
  userInclusions,
  postInclusions,
  commentInclusions,
  repostInclusions,
  roomInclusions,
};
