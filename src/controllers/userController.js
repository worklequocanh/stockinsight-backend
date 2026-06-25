const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');
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

async function listUsers(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const role = req.query.role;
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && ['ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE'].includes(role)) {
      where.role = role;
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendSuccess(res, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return sendError(res, 'Không tìm thấy người dùng', 404);
    }

    return sendSuccess(res, { item: user });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role || 'EMPLOYEE';

    if (!name || !email || !password) {
      return sendError(res, 'Vui lòng điền đầy đủ tên, email và mật khẩu', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Mật khẩu phải có ít nhất 6 ký tự', 400);
    }

    if (!['ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE'].includes(role)) {
      return sendError(res, 'Vai trò không hợp lệ', 400);
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
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

    await writeAuditLog(req.user.id, 'CREATE_USER', 'User', user.id, { name, email, role });

    return sendSuccess(res, { item: user }, 'Tạo tài khoản thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role;
    const isActive = req.body?.isActive;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Không tìm thấy người dùng', 404);
    }

    // Không cho admin tự khóa chính mình
    if (req.user.id === id && isActive === false) {
      return sendError(res, 'Bạn không thể tự khóa tài khoản của chính mình', 400);
    }

    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role && ['ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE'].includes(role)) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data,
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

    await writeAuditLog(req.user.id, 'UPDATE_USER', 'User', id, data);

    return sendSuccess(res, { item: user }, 'Cập nhật tài khoản thành công');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const password = String(req.body?.password || '');

    if (password.length < 6) {
      return sendError(res, 'Mật khẩu phải có ít nhất 6 ký tự', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Không tìm thấy người dùng', 404);
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await writeAuditLog(req.user.id, 'RESET_USER_PASSWORD', 'User', id, { email: existing.email });

    return sendSuccess(res, null, 'Đặt lại mật khẩu thành công');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  sanitizeUser,
};
