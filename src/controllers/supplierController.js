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
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ],
  };
}

async function listSuppliers(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;
    const where = buildWhere(search);

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
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

async function getSupplierById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy nhà cung cấp', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim();
    const address = String(req.body?.address || '').trim();

    if (!name) {
      return sendError(res, 'Vui lòng nhập tên nhà cung cấp', 400, [
        { field: 'name', message: 'Tên nhà cung cấp là bắt buộc' },
      ]);
    }

    const item = await prisma.supplier.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    return sendSuccess(res, { item }, 'Thêm nhà cung cấp thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim();
    const address = String(req.body?.address || '').trim();

    if (!name) {
      return sendError(res, 'Vui lòng nhập tên nhà cung cấp', 400, [
        { field: 'name', message: 'Tên nhà cung cấp là bắt buộc' },
      ]);
    }

    const item = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    return sendSuccess(res, { item }, 'Cập nhật nhà cung cấp thành công');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Xóa nhà cung cấp thành công');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

module.exports = {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
