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

function RNG(max) {
  return Math.ceil(Math.random() * max);
}

async function main() {
  const userPromises = [];
  const followPromises = [];
  const postPromises = [];
  const commentPromises = [];
  const postLikePromises = [];
  const commentLikePromises = [];

  const guestPasswordHash = await bcrypt.hash('1', 10);

  for (let i = 0; i < 100; i += 1) {
    let username;
    let displayName;
    let bio;
    let passwordHash;

    if (i === 0) {
      displayName = 'Guest';
      username = 'Guest';
      passwordHash = guestPasswordHash;
    } else {
      bio = faker.person.bio();
      passwordHash = crypto.randomUUID();
      displayName = faker.person.fullName();
      const splitDisplayName = displayName.split(' ');

      username = faker.internet.username({
        firstName: splitDisplayName[0],
        lastName: splitDisplayName[splitDisplayName.length - 1],
      });
    }

    const usernameHash = Crypto.createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    userPromises.push(
      prisma.user.create({
        data: {
          displayName,
          username,
          passwordHash,
          pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
          bio,
          joinDate: faker.date.between({ from: getDate(50), to: getDate(20) }),
        },
      }),
    );
  }

  console.log('Creating users...');
  await Promise.all(userPromises);

  for (let i = 0; i < 500; i += 1) {
    const randomId1 = RNG(100);
    let randomId2 = RNG(100);

    while (randomId1 === randomId2) {
      randomId2 = RNG(100);
    }

    followPromises.push(
      prisma.user.update({
        where: { id: randomId1 },
        data: {
          following: { connect: { id: randomId2 } },
        },
      }),
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
          user: { connect: { id: RNG(100) } },
        },
      }),
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
          user: { connect: { id: RNG(100) } },
          post: { connect: { id: RNG(200) } },
        },
      }),
    );
  }

  console.log('Creating comments...');
  await Promise.all(commentPromises);
  console.log('Creating replies');

  for (let i = 0; i < 100; i += 1) {
    const comment = await prisma.comment.findUnique({
      where: { id: RNG(500 + i) },
    });

    await prisma.comment.create({
      data: {
        text: faker.lorem.text(),
        timestamp: faker.date.between({ from: getDate(5), to: getDate(2) }),
        user: { connect: { id: RNG(100) } },
        post: { connect: { id: comment.postId } },
        parent: { connect: { id: comment.id } },
      },
    });
  }

  for (let i = 0; i < 2000; i += 1) {
    postLikePromises.push(
      prisma.post.update({
        where: { id: RNG(200) },
        data: { likes: { connect: { id: RNG(100) } } },
      }),
    );
  }

  console.log('Liking posts...');
  await Promise.all(postLikePromises);

  for (let i = 0; i < 1000; i += 1) {
    commentLikePromises.push(
      prisma.comment.update({
        where: { id: RNG(600) },
        data: { likes: { connect: { id: RNG(100) } } },
      }),
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
