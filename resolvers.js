const { default: GraphQLUpload } = require('graphql-upload/GraphQLUpload.mjs');
const { userQueries, userMutations } = require('./resolvers/userResolvers');
const { postQueries, postMutations } = require('./resolvers/postResolvers');
const {
  commentQueries,
  commentMutations,
} = require('./resolvers/commentResolvers');
const { roomQueries, roomMutations } = require('./resolvers/roomResolvers');
const {
  messageQueries,
  messageMutations,
} = require('./resolvers/messageResolvers');
const { notificationQueries } = require('./resolvers/notificationResolvers');

const resolvers = {
  Upload: GraphQLUpload,

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
    ...roomMutations,
    ...messageMutations,
  },
};

module.exports = resolvers;
