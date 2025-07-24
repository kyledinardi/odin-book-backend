const { GraphQLError } = require('graphql');

function authenticate(resolver) {
  return async (_, args, context) => {
    if (!context.currentUser) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return resolver(_, args, context);
  };
}

module.exports = authenticate;
