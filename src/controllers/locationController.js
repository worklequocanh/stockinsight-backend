const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');

function buildWhere(search) {
  if (!search) {
    return {};
  }

  return {
    OR: [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ],
  };
}

async function listLocations(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;
    const where = buildWhere(search);

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.location.count({ where }),
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

async function getLocationById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.location.findUnique({
      where: { id },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy vị trí lưu kho', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createLocation(req, res, next) {
  try {
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!code || !name) {
      return sendError(res, 'Vui lòng nhập đầy đủ mã và tên vị trí', 400);
    }

    const item = await prisma.location.create({
      data: {
        code,
        name,
        description: description || null,
      },
    });

    return sendSuccess(res, { item }, 'Thêm vị trí lưu kho thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!code || !name) {
      return sendError(res, 'Vui lòng nhập đầy đủ mã và tên vị trí', 400);
    }

    const item = await prisma.location.update({
      where: { id },
      data: {
        code,
        name,
        description: description || null,
      },
    });

    return sendSuccess(res, { item }, 'Cập nhật vị trí lưu kho thành công');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function deleteLocation(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.location.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Xóa vị trí lưu kho thành công');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

module.exports = {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
};
