export const userInclusions = {
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

export const postInclusions = {
  user: true,
  likes: true,
  reposts: true,
  pollChoices: { include: { votes: true } },
  _count: { select: { comments: true } },
};

export const commentInclusions = {
  user: true,
  likes: true,
  reposts: true,
  _count: { select: { replies: true } },
};

export const repostInclusions = {
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
