const { default: GraphQLUpload } = require('graphql-upload/GraphQLUpload.mjs');
const { userQueries, userMutations } = require('./resolvers/userResolvers');
const { postQueries, postMutations } = require('./resolvers/postResolvers');
const {
  commentQueries,
  commentMutations,
} = require('./resolvers/commentResolvers');
const { roomQueries, roomMutations } = require('./resolvers/roomResolvers');
const { messageMutations } = require('./resolvers/messageResolvers');
const { miscQueries, miscMutations } = require('./resolvers/miscResolvers');

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
    ...miscQueries,
  },

  Mutation: {
    ...userMutations,
    ...postMutations,
    ...commentMutations,
    ...roomMutations,
    ...messageMutations,
    ...miscMutations,
  },
};

module.exports = resolvers;
