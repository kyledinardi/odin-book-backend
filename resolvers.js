const { postQueries, postMutations } = require('./resolvers/postResolvers');
const { userQueries, userMutations } = require('./resolvers/userResolvers');

const resolvers = {
  Query: { ...userQueries, ...postQueries },
  Mutation: { ...userMutations, ...postMutations },
};

module.exports = resolvers;
