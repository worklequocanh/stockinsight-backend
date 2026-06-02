const prisma = require('../config/prisma');
const { comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { sendError, sendSuccess } = require('../utils/apiResponse');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return sendError(res, 'Email and password are required', 400, [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' },
      ]);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return sendSuccess(res, {
      accessToken,
      user: sanitizeUser(user),
    }, 'Login successful');
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    return sendSuccess(res, {
      user: req.user,
    }, 'Current user loaded');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  me,
};
