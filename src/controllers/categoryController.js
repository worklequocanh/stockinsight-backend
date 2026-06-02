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
      { description: { contains: search, mode: 'insensitive' } },
    ],
  };
}

async function listCategories(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;
    const where = buildWhere(search);

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.category.count({ where }),
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

async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.category.findUnique({
      where: { id },
    });

    if (!item) {
      return sendError(res, 'Category not found', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!name) {
      return sendError(res, 'Name is required', 400, [
        { field: 'name', message: 'Name is required' },
      ]);
    }

    const item = await prisma.category.create({
      data: {
        name,
        description: description || null,
      },
    });

    return sendSuccess(res, { item }, 'Category created', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!name) {
      return sendError(res, 'Name is required', 400, [
        { field: 'name', message: 'Name is required' },
      ]);
    }

    const item = await prisma.category.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    return sendSuccess(res, { item }, 'Category updated');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Category deleted');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
