const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.findOrCreateRoom = asyncHandler(async (req, res, next) => {
  let room = await prisma.room.findFirst({
    where: {
      AND: [
        { users: { some: { id: req.user.id } } },
        { users: { some: { id: req.body.userId } } },
      ],
    },
  });

  if (!room) {
    room = await prisma.room.create({
      data: {
        users: {
          connect: [{ id: req.user.id }, { id: req.body.userId }],
        },
      },
    });
  }

  return res.json({ room });
});

exports.getAllRooms = asyncHandler(async (req, res, next) => {
  const { roomId } = req.query;

  const rooms = await prisma.room.findMany({
    where: { users: { some: { id: req.user.id } } },
    orderBy: { lastUpdated: 'desc' },
    take: 20,
    cursor: roomId ? { id: parseInt(roomId, 10) } : undefined,
    skip: roomId ? 1 : 0,

    include: {
      users: true,
      messages: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
  });

  return res.json({ rooms });
});

exports.getRoom = asyncHandler(async (req, res, next) => {
  const room = await prisma.room.findUnique({
    where: { id: parseInt(req.params.roomId, 10) },

    include: {
      users: true,

      messages: {
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: { user: true },
      },
    },
  });

  if (!room.users.find((user) => user.id === req.user.id)) {
    const err = new Error('You cannot enter this chatroom');
    err.status = 403;
    return next(err);
  }

  return res.json({ room });
});
