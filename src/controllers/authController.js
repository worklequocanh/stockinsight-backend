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
      return sendError(res, 'Email và mật khẩu không được bỏ trống', 400, [
        { field: 'email', message: 'Vui lòng nhập Email' },
        { field: 'password', message: 'Vui lòng nhập Mật khẩu' },
      ]);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return sendError(res, 'Email hoặc mật khẩu không chính xác', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 'Email hoặc mật khẩu không chính xác', 401);
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return sendSuccess(res, {
      accessToken,
      user: sanitizeUser(user),
    }, 'Đăng nhập thành công');
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      return sendError(res, 'Không có quyền truy cập', 401);
    }

    return sendSuccess(res, {
      user: req.user,
    }, 'Đã tải thông tin người dùng');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  me,
};
