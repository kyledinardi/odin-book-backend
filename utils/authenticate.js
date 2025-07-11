const { GraphQLError } = require('graphql');

function authenticate(resolver) {
  return async (parent, args, context) => {
    if (!context.currentUser) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return resolver(parent, args, context);
  };
}

module.exports = authenticate;
