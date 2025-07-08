/* eslint-disable no-console */
require('./utils/passport');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { useServer } = require('graphql-ws');
const { ApolloServer } = require('@apollo/server');
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
const { setupSocketIo } = require('./utils/socketIo');

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer({ server: httpServer, path: '/' });
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();
  const prisma = new PrismaClient();

  app.use(
    '/',
    helmet(),
    cors(),
    compression(),
    express.json(),
    express.urlencoded({ extended: false }),
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

  setupSocketIo(server);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
