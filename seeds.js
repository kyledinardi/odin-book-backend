const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const Crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHashPromises = [];
  const userPromises = [];
  const postPromises = [];
  const commentPromises = [];

  for (let i = 0; i < 10; i += 1) {
    passwordHashPromises.push(bcrypt.hash(faker.internet.password(), 10));
  }

  passwordHashPromises.push(bcrypt.hash('1', 10));
  console.log('Hashing passwords...');
  const passwordHashes = await Promise.all(passwordHashPromises);

  for (let i = 0; i < 10; i += 1) {
    const username = faker.internet.userName();

    const usernameHash = Crypto.createHash('sha256')
      .update(username.toLowerCase())
      .digest('hex');

    userPromises.push(
      prisma.user.create({
        data: {
          username,
          passwordHash: passwordHashes[i],
          pfpUrl: `https://www.gravatar.com/avatar/${usernameHash}?d=identicon`,
        },
      }),
    );
  }

  userPromises.push(
    prisma.user.create({
      data: {
        username: 'Guest',
        passwordHash: passwordHashes[10],

        pfpUrl:
          'https://www.gravatar.com/avatar/5ed8944a85a9763fd315852f448cb7de36c5e928e13b3be427f98f7dc455f141?d=identicon',
      },
    }),
  );

  console.log('Creating users...');
  await Promise.all(userPromises);

  for (let i = 0; i < 20; i += 1) {
    postPromises.push(
      prisma.post.create({
        data: {
          text: faker.lorem.text(),
          author: { connect: { id: Math.ceil(Math.random() * 10) } },
        },
      }),
    );
  }

  console.log('Creating posts...');
  await Promise.all(postPromises);

  for (let i = 0; i < 50; i += 1) {
    commentPromises.push(
      prisma.comment.create({
        data: {
          text: faker.lorem.text(),
          user: { connect: { id: Math.ceil(Math.random() * 10) } },
          post: { connect: { id: Math.ceil(Math.random() * 20) } },
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
