const resolvers = {
  Query: {
    getCurrentUser: (parent, args, { currentUser }) => currentUser,
  },
};

module.exports = resolvers;
