const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const env = require('./env');

function createPrismaClient() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
  });

  return prisma;
}

module.exports = {
  createPrismaClient,
};
