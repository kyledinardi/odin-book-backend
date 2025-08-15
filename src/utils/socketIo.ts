import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { FRONTEND_URL } from './config';

const prisma = new PrismaClient();

const setupSocketIo = (server: http.Server) => {
  const io = new Server(server, { cors: { origin: FRONTEND_URL } });

  io.on('connection', (socket) => {
    socket.on('joinUserRoom', (userId) => socket.join(`userRoom-${userId}`));
    socket.on('joinChatRoom', (roomId) => socket.join(`chatRoom-${roomId}`));

    socket.on('sendNotification', ({ userId }) =>
      socket.broadcast.to(`userRoom-${userId}`).emit('receiveNotification')
    );

    socket.on('sendNewPost', async ({ userId }: { userId: number }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { followers: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

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
};

export default setupSocketIo;
