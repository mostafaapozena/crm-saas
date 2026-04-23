const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
<<<<<<< HEAD
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
=======
>>>>>>> 4d2f059 (initial project upload)
});

module.exports = prisma;
