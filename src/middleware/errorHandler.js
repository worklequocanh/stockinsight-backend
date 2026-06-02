const { sendError } = require('../utils/apiResponse');

function notFound(req, res, next) {
  const error = new Error(`Không tìm thấy đường dẫn: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Lỗi hệ thống';

  if (statusCode >= 500) {
    console.error(error);
  }

  return sendError(res, message, statusCode, error.errors);
}

module.exports = {
  notFound,
  errorHandler,
};
