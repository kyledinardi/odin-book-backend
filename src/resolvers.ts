import { GraphQLError } from 'graphql';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';

import { commentMutations, commentQueries } from './resolvers/commentResolvers';
import messageMutations from './resolvers/messageResolvers';
import { miscMutations, miscQueries } from './resolvers/miscResolvers';
import { postMutations, postQueries } from './resolvers/postResolvers';
import { roomMutations, roomQueries } from './resolvers/roomResolvers';
import { userMutations, userQueries } from './resolvers/userResolvers';

import type { PostOrRepost } from './types';

const resolvers = {
  Upload: GraphQLUpload,

  PostOrRepost: {
    __resolveType: (feedItem: PostOrRepost): 'Post' | 'Repost' => {
      if (feedItem.feedItemType === 'post') {
        return 'Post';
      }

      if (feedItem.feedItemType === 'repost') {
        return 'Repost';
      }

      throw new GraphQLError('Invalid feed item type', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
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

export default resolvers;
