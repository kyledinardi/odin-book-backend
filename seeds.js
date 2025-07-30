/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const Crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getDate(billionMs) {
  return Date.now() - billionMs * 1_000_000_000;
}

function rng(max) {
  return Math.ceil(Math.random() * max);
}

async function main() {
  const userPromises = [];
  const messagePromises = [];
  const followPromises = [];

  const postPromises = [];
  const commentPromises = [];
  const postLikePromises = [];
  const commentLikePromises = [];

  const guestPasswordHash = await bcrypt.hash('1', 10);
  const guestHash = Crypto.createHash('sha256').update('guest').digest('hex');
  const guest2Hash = Crypto.createHash('sha256').update('guest2').digest('hex');

  await prisma.user.create({
    data: {
      displayName: 'Guest',
      username: 'Guest',
      passwordHash: guestPasswordHash,
      pfpUrl: `https://www.gravatar.com/avatar/${guestHash}?d=identicon`,
      joinDate: faker.date.between({ from: getDate(50), to: getDate(20) }),
    },
  });

  await prisma.user.create({
    data: {
      displayName: 'Guest2',
      username: 'Guest2',
      passwordHash: guestPasswordHash,
      pfpUrl: `https://www.gravatar.com/avatar/${guest2Hash}?d=identicon`,
      joinDate: faker.date.between({ from: getDate(50), to: getDate(20) }),
    },
  });

  for (let i = 0; i < 100; i += 1) {
    const displayName = faker.person.fullName();
    const splitDisplayName = displayName.split(' ');

    const username = faker.internet.username({
      firstName: splitDisplayName[0],
      lastName: splitDisplayName[splitDisplayName.length - 1],
    });

    const usernameHash = Crypto.createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    userPromises.push(
      prisma.user.create({
        data: {
          displayName,
          username,
          passwordHash: crypto.randomUUID(),
          pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
          bio: faker.person.bio(),
          joinDate: faker.date.between({ from: getDate(50), to: getDate(20) }),
        },
      })
    );
  }

  console.log('Creating users...');
  await Promise.all(userPromises);
  console.log('Creating chatroom...');

  await prisma.room.create({
    data: { users: { connect: [{ id: 1 }, { id: 2 }] } },
  });

  for (let i = 0; i < 100; i += 1) {
    messagePromises.push(
      prisma.message.create({
        data: {
          text: faker.lorem.sentence(),
          user: { connect: { id: rng(2) } },
          room: { connect: { id: 1 } },
          timestamp: faker.date.between({ from: getDate(1), to: getDate(0) }),
        },
      })
    );
  }

  console.log('Creating messages...');
  await Promise.all(messagePromises);

  for (let i = 0; i < 500; i += 1) {
    const randomId1 = rng(100);
    let randomId2 = rng(100);

    while (randomId1 === randomId2) {
      randomId2 = rng(100);
    }

    followPromises.push(
      prisma.user.update({
        where: { id: randomId1 },
        data: {
          following: { connect: { id: randomId2 } },
        },
      })
    );
  }

  console.log('Following users...');
  await Promise.all(followPromises);

  for (let i = 0; i < 200; i += 1) {
    postPromises.push(
      prisma.post.create({
        data: {
          text: faker.lorem.text(),
          timestamp: faker.date.between({ from: getDate(20), to: getDate(10) }),
          user: { connect: { id: rng(100) } },
        },
      })
    );
  }

  console.log('Creating posts...');
  await Promise.all(postPromises);

  for (let i = 0; i < 500; i += 1) {
    commentPromises.push(
      prisma.comment.create({
        data: {
          text: faker.lorem.text(),
          timestamp: faker.date.between({ from: getDate(10), to: getDate(5) }),
          user: { connect: { id: rng(100) } },
          post: { connect: { id: rng(200) } },
        },
      })
    );
  }

  console.log('Creating comments...');
  await Promise.all(commentPromises);
  console.log('Creating replies');

  for (let i = 0; i < 100; i += 1) {
    const comment = await prisma.comment.findUnique({
      where: { id: rng(500 + i) },
    });

    await prisma.comment.create({
      data: {
        text: faker.lorem.text(),
        timestamp: faker.date.between({ from: getDate(5), to: getDate(2) }),
        user: { connect: { id: rng(100) } },
        post: { connect: { id: comment.postId } },
        parent: { connect: { id: comment.id } },
      },
    });
  }

  for (let i = 0; i < 2000; i += 1) {
    postLikePromises.push(
      prisma.post.update({
        where: { id: rng(200) },
        data: { likes: { connect: { id: rng(100) } } },
      })
    );
  }

  console.log('Liking posts...');
  await Promise.all(postLikePromises);

  for (let i = 0; i < 1000; i += 1) {
    commentLikePromises.push(
      prisma.comment.update({
        where: { id: rng(600) },
        data: { likes: { connect: { id: rng(100) } } },
      })
    );
  }

  console.log('Liking comments...');
  await Promise.all(commentLikePromises);
  console.log('Seeding complete');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
