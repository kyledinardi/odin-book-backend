const { Server } = require('socket.io');

function setupSocketIo(server) {
  const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL } });

  io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => socket.join(roomId));

    socket.on('submitMessage', (data) =>
      io.to(data.roomId).emit('addNewMessage', data.message),
    );

    socket.on('updateMessage', (data) =>
      io.to(data.roomId).emit('replaceMessage', data.message),
    );

    socket.on('deleteMessage', (data) =>
      io.to(data.roomId).emit('removeMessage', data.messageId),
    );
  });
}

module.exports = { setupSocketIo };
