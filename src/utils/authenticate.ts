import { GraphQLError } from 'graphql';

const authenticate = (currentUser: { id: number }) => {
  if (!currentUser) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

export default authenticate;
