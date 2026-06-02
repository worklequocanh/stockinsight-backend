const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const { sendError } = require('../utils/apiResponse');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

async function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return sendError(res, 'Unauthorized', 401);
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return sendError(res, 'Invalid or expired token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return sendError(res, 'Unauthorized', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRoles,
};
