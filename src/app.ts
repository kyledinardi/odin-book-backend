import express from 'express';
import http from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from '@apollo/server';
import { default as graphqlUploadExpress } from 'graphql-upload/graphqlUploadExpress.mjs';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import './utils/passport';
import typeDefs from './schema';
import resolvers from './resolvers';
import { PORT, JWT_SECRET } from './utils/config';
import parseJWTPayload from './utils/parseJwtPayload';
import setupSocketIo from './utils/socketIo';

const startServer = async () => {
  const app = express();
  const httpServer = http.createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  app.use(
    '/',

    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),

    cors(),
    compression(),
    express.json(),
    express.urlencoded({ extended: false }),
    graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 10 }),

    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req?.headers.authorization;

        if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
          return {};
        }

        if (!JWT_SECRET) {
          throw new GraphQLError('JWT_SECRET is not defined', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }

        const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);

        return Promise.resolve({
          currentUser: { id: parseJWTPayload(decodedToken) },
        });
      },
    })
  );

  setupSocketIo(httpServer);
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
