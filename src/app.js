const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/apiResponse');

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép tất cả các origin hợp lệ từ Frontend (Fly.io, Vercel, localhost)
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  return sendSuccess(res, {
    message: 'stockinsight-backend is running',
    api: '/api/health',
    swagger: '/api-docs'
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
