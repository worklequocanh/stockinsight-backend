const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function start() {
  try {
    await prisma.$connect();

    app.listen(env.port, () => {
      console.log(`Backend is running at http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

start();
