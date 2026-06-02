const { createPrismaClient } = require('./prismaFactory');

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma__ || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma__ = prisma;
}

module.exports = prisma;
