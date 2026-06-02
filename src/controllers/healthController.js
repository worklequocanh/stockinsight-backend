const env = require('../config/env');
const prisma = require('../config/prisma');
const { sendSuccess } = require('../utils/apiResponse');

async function getHealth(req, res, next) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(
      res,
      {
        status: 'ok',
        app: 'stockinsight-backend',
        environment: env.nodeEnv,
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      'Service is healthy',
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHealth,
};
