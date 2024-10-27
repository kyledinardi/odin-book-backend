/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const Crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function RNG(max) {
  return Math.ceil(Math.random() * max);
}

async function main() {
  const passwordHashPromises = [];
  const userPromises = [];
  const followPromises = [];
  const postPromises = [];
  const postLikePromises = [];
  const commentPromises = [];
  const commentLikePromises = [];

  passwordHashPromises.push(bcrypt.hash('1', 10));

  for (let i = 1; i < 10; i += 1) {
    passwordHashPromises.push(bcrypt.hash(faker.internet.password(), 10));
  }

  passwordHashPromises.push(bcrypt.hash('1', 10));
  console.log('Hashing passwords...');
  const passwordHashes = await Promise.all(passwordHashPromises);

  for (let i = 0; i < 10; i += 1) {
    let username;
    let displayName;
    let bio;

    if (i === 0) {
      displayName = 'Guest';
      username = 'Guest';
    } else {
      bio = faker.person.bio();
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
          passwordHash: passwordHashes[i],
          pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
          bio,
        },
      }),
    );
  }

  console.log('Creating users...');
  await Promise.all(userPromises);

  for (let i = 0; i < 50; i += 1) {
    const randomId1 = RNG(10);
    let randomId2 = RNG(10);

    while (randomId1 === randomId2) {
      randomId2 = RNG(10);
    }

    followPromises.push(
      prisma.user.update({
        where: { id: randomId1 },
        data: { following: { connect: { id: randomId2 } } },
      }),
    );
  }

  console.log('Following users...');
  await Promise.all(followPromises);

  for (let i = 0; i < 20; i += 1) {
    postPromises.push(
      prisma.post.create({
        data: {
          text: faker.lorem.text(),
          author: { connect: { id: RNG(10) } },
        },
      }),
    );
  }

  console.log('Creating posts...');
  await Promise.all(postPromises);

  for (let i = 0; i < 100; i += 1) {
    postLikePromises.push(
      prisma.post.update({
        where: { id: RNG(20) },
        data: { likes: { connect: { id: RNG(10) } } },
      }),
    );
  }

  console.log('Liking posts...');
  await Promise.all(postLikePromises);

  for (let i = 0; i < 50; i += 1) {
    commentPromises.push(
      prisma.comment.create({
        data: {
          text: faker.lorem.text(),
          user: { connect: { id: RNG(10) } },
          post: { connect: { id: RNG(20) } },
        },
      }),
    );
  }

  console.log('Creating comments...');
  await Promise.all(commentPromises);

  for (let i = 0; i < 200; i += 1) {
    commentLikePromises.push(
      prisma.comment.update({
        where: { id: RNG(50) },
        data: { likes: { connect: { id: RNG(10) } } },
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
