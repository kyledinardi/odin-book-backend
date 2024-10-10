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
  const likePromises = [];
  const commentPromises = [];

  passwordHashPromises.push(bcrypt.hash('1', 10));

  for (let i = 1; i < 10; i += 1) {
    passwordHashPromises.push(bcrypt.hash(faker.internet.password(), 10));
  }

  passwordHashPromises.push(bcrypt.hash('1', 10));
  console.log('Hashing passwords...');
  const passwordHashes = await Promise.all(passwordHashPromises);

  for (let i = 0; i < 10; i += 1) {
    const username = i === 0 ? 'Guest' : faker.internet.userName();

    const usernameHash = Crypto.createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    userPromises.push(
      prisma.user.create({
        data: {
          username,
          passwordHash: passwordHashes[i],
          pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
          bio: faker.lorem.sentence(),
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
    likePromises.push(
      prisma.post.update({
        where: { id: RNG(20) },
        data: { likes: { connect: { id: RNG(10) } } },
      }),
    );
  }

  console.log('Liking posts...');
  await Promise.all(likePromises);

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
