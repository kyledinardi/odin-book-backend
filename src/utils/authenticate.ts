import { GraphQLError } from 'graphql';

const authenticate = (currentUserId: number): void => {
  if (!currentUserId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

export default authenticate;
