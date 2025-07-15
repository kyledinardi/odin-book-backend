const { userQueries, userMutations } = require('./resolvers/userResolvers');
const { postQueries, postMutations } = require('./resolvers/postResolvers');
const {
  commentQueries,
  commentMutations,
} = require('./resolvers/commentResolvers');
const { repostMutations } = require('./resolvers/repostResolvers');
const { roomQueries, roomMutations } = require('./resolvers/roomResolvers');
const {
  messageQueries,
  messageMutations,
} = require('./resolvers/messageResolvers');
const { notificationQueries } = require('./resolvers/notificationResolvers');

const resolvers = {
  Query: {
    ...userQueries,
    ...postQueries,
    ...commentQueries,
    ...roomQueries,
    ...messageQueries,
    ...notificationQueries,
  },

  Mutation: {
    ...userMutations,
    ...postMutations,
    ...commentMutations,
    ...repostMutations,
    ...roomMutations,
    ...messageMutations,
  },

  PostOrRepost: {
    __resolveType: (obj) => {
      if (obj.feedItemType === 'post') {
        return 'Post';
      }

      if (obj.feedItemType === 'repost') {
        return 'Repost';
      }

      return null;
    },
  },
};

module.exports = resolvers;
