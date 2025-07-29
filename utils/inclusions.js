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
  _count: { select: { comments: true } },
};

const commentInclusions = {
  user: true,
  likes: true,
  reposts: true,
  _count: { select: { replies: true } },
};

const repostInclusions = {
  user: true,
  post: { include: postInclusions },
  
  comment: {
    include: {
      ...commentInclusions,
      post: { include: { user: true } },
      parent: { include: { user: true } },
    },
  },
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
