const { sendError } = require('../utils/apiResponse');

function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(error);
  }

  return sendError(res, message, statusCode, error.errors);
}

module.exports = {
  notFound,
  errorHandler,
};
