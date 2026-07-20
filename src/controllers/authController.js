const prisma = require('../config/prisma');
const { comparePassword, hashPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { writeAuditLog } = require('../utils/auditLog');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
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

    if (!user.isActive) {
      return sendError(res, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
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

    await writeAuditLog(user.id, 'LOGIN', 'User', user.id, { email: user.email, role: user.role });

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

async function updateProfile(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();

    if (!name) {
      return sendError(res, 'Tên hiển thị không được bỏ trống', 400);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAuditLog(req.user.id, 'UPDATE_PROFILE', 'User', req.user.id, { name });

    return sendSuccess(res, { user }, 'Cập nhật hồ sơ thành công');
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return sendError(res, 'Vui lòng nhập mật khẩu cũ và mật khẩu mới', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'Mật khẩu mới phải có ít nhất 6 ký tự', 400);
    }

    if (oldPassword === newPassword) {
      return sendError(res, 'Mật khẩu mới không được trùng với mật khẩu cũ', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isOldValid = await comparePassword(oldPassword, user.password);
    if (!isOldValid) {
      return sendError(res, 'Mật khẩu cũ không chính xác', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    await writeAuditLog(req.user.id, 'CHANGE_PASSWORD', 'User', req.user.id, { email: user.email });

    return sendSuccess(res, null, 'Đổi mật khẩu thành công');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  me,
  updateProfile,
  changePassword,
};
