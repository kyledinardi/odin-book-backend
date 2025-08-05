const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { FRONTEND_URL } = require('./config');

const prisma = new PrismaClient();

function setupSocketIo(server) {
  const io = new Server(server, { cors: { origin: FRONTEND_URL } });

  io.on('connection', (socket) => {
    socket.on('joinUserRoom', (userId) => socket.join(`userRoom-${userId}`));
    socket.on('joinChatRoom', (roomId) => {
      socket.join(`chatRoom-${roomId}`);
    });

    socket.on('sendNotification', ({ userId }) =>
      socket.broadcast.to(`userRoom-${userId}`).emit('receiveNotification')
    );

    socket.on('sendNewPost', async ({ userId }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { followers: true },
      });

      const followerIds = user.followers.map((follower) => follower.id);

      followerIds.forEach((followerId) => {
        socket.broadcast.to(`userRoom-${followerId}`).emit('receiveNewPost');
      });
    });

    socket.on('sendIsTyping', ({ isTyping, roomId }) =>
      socket.broadcast
        .to(`chatRoom-${roomId}`)
        .emit('receiveIsTyping', isTyping)
    );

    socket.on('submitMessage', ({ message, roomId }) =>
      io.to(`chatRoom-${roomId}`).emit('addNewMessage', message)
    );

    socket.on('updateMessage', ({ updatedMessage, roomId }) =>
      io.to(`chatRoom-${roomId}`).emit('replaceMessage', updatedMessage)
    );

    socket.on('deleteMessage', ({ deletedMessageId, roomId }) =>
      io.to(`chatRoom-${roomId}`).emit('removeMessage', deletedMessageId)
    );
  });
}

module.exports = { setupSocketIo };
