const { userQueries, userMutations } = require('./resolvers/userResolvers');
const { postQueries, postMutations } = require('./resolvers/postResolvers');
const {
  commentQueries,
  commentMutations,
} = require('./resolvers/commentResolvers');

const resolvers = {
  Query: { ...userQueries, ...postQueries, ...commentQueries },
  Mutation: { ...userMutations, ...postMutations, ...commentMutations },
};

module.exports = resolvers;
