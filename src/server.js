const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

// Init Cron Jobs
require('./jobs/inventoryCron');

async function start() {
  try {
    await prisma.$connect();

    const server = app.listen(env.port, () => {
      console.log(`Backend is running at http://localhost:${env.port}`);
    });

    // Initialize Socket.io
    const io = require('./utils/socket').init(server);

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

start();
