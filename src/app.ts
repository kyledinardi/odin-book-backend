/* eslint-disable no-console */
import http from 'node:http';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

import gitHubRouter from './gitHubRouter';
import resolvers from './resolvers';
import typeDefs from './schema';
import { JWT_SECRET, PORT } from './utils/config';
import parseJWTPayload from './utils/parseJwtPayload';
import './utils/passport';
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
  app.use('/auth/github', gitHubRouter);

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

        if (!auth?.toLowerCase().startsWith('bearer ')) {
          return {};
        }

        const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);

        return Promise.resolve({
          currentUser: { id: parseJWTPayload(decodedToken) },
        });
      },
    }),
  );

  setupSocketIo(httpServer);
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer().catch((error: Error) => {
  throw new Error(error.message);
});
