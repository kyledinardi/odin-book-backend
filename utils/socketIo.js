const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { FRONTEND_URL } = require('./config');

const prisma = new PrismaClient();

function setupSocketIo(server) {
  const io = new Server(server, { cors: { origin: FRONTEND_URL } });

  io.on('connection', (socket) => {
    socket.on('joinUserRoom', (userId) => socket.join(`userRoom-${userId}`));
    socket.on('joinChatRoom', (roomId) => socket.join(`chatRoom-${roomId}`));

    socket.on('sendNotification', (data) =>
      socket.broadcast
        .to(`userRoom-${data.userId}`)
        .emit('receiveNotification'),
    );

    socket.on('sendNewPost', async (data) => {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { followers: true },
      });

      const followerIds = user.followers.map((follower) => follower.id);

      followerIds.forEach((followerId) => {
        socket.broadcast.to(`userRoom-${followerId}`).emit('receiveNewPost');
      });
    });

    socket.on('sendIsTyping', (data) =>
      socket.broadcast
        .to(`chatRoom-${data.roomId}`)
        .emit('receiveIsTyping', data.isTyping),
    );

    socket.on('submitMessage', (data) =>
      io.to(`chatRoom-${data.roomId}`).emit('addNewMessage', data.message),
    );

    socket.on('updateMessage', (data) =>
      io.to(`chatRoom-${data.roomId}`).emit('replaceMessage', data.message),
    );

    socket.on('deleteMessage', (data) =>
      io.to(`chatRoom-${data.roomId}`).emit('removeMessage', data.messageId),
    );
  });
}

module.exports = { setupSocketIo };
