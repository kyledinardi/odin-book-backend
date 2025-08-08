/* eslint-disable no-console */
const express = require('express');
const http = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
// eslint-disable-next-line import/no-unresolved
const { ApolloServer } = require('@apollo/server');
const {
  default: graphqlUploadExpress,
} = require('graphql-upload/graphqlUploadExpress.mjs');
const { expressMiddleware } = require('@apollo/server/express4');
const {
  ApolloServerPluginDrainHttpServer,
} = require('@apollo/server/plugin/drainHttpServer');
const { PrismaClient } = require('@prisma/client');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { PORT, JWT_SECRET } = require('./utils/config');
require('./utils/passport');
const { setupSocketIo } = require('./utils/socketIo');

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();
  const prisma = new PrismaClient();

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
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),

    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;

        if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
          return null;
        }

        const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);

        const currentUser = await prisma.user.findUnique({
          where: { id: decodedToken.id },
        });

        return { currentUser };
      },
    })
  );

  setupSocketIo(httpServer);
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
