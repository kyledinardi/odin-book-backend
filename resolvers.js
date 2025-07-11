const { userQueries, userMutations } = require('./resolvers/userResolvers');

const resolvers = { Query: { ...userQueries }, Mutation: { ...userMutations } };
module.exports = resolvers;
