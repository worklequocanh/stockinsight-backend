const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');

function buildWhere({ search, categoryId, supplierId }) {
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }

  return where;
}

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function validateProductRefs({ categoryId, supplierId }) {
  const [category, supplier] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.supplier.findUnique({ where: { id: supplierId } }),
  ]);

  if (!category) {
    return 'Category not found';
  }

  if (!supplier) {
    return 'Supplier not found';
  }

  return null;
}

async function listProducts(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const categoryId = normalizeSearch(req.query.categoryId);
    const supplierId = normalizeSearch(req.query.supplierId);
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;
    const where = buildWhere({ search, categoryId, supplierId });

    const [items, total, categories, suppliers] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          category: true,
          supplier: true,
        },
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return sendSuccess(res, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        categories,
        suppliers,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (!item) {
      return sendError(res, 'Product not found', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const sku = String(req.body?.sku || '').trim();
    const barcode = String(req.body?.barcode || '').trim();
    const name = String(req.body?.name || '').trim();
    const unit = String(req.body?.unit || '').trim();
    const categoryId = String(req.body?.categoryId || '').trim();
    const supplierId = String(req.body?.supplierId || '').trim();
    const minStock = parseNumber(req.body?.minStock, 0);
    const costPrice = parseNumber(req.body?.costPrice);
    const salePrice = parseNumber(req.body?.salePrice);
    const currentStock = parseNumber(req.body?.currentStock, 0);

    if (!sku || !name || !unit || !categoryId || !supplierId || costPrice === null || salePrice === null) {
      return sendError(res, 'Required fields are missing', 400, [
        { field: 'sku', message: 'SKU is required' },
        { field: 'name', message: 'Name is required' },
        { field: 'unit', message: 'Unit is required' },
        { field: 'categoryId', message: 'Category is required' },
        { field: 'supplierId', message: 'Supplier is required' },
        { field: 'costPrice', message: 'Cost price is required' },
        { field: 'salePrice', message: 'Sale price is required' },
      ]);
    }

    const refError = await validateProductRefs({ categoryId, supplierId });
    if (refError) {
      return sendError(res, refError, 400);
    }

    const item = await prisma.product.create({
      data: {
        sku,
        barcode: barcode || null,
        name,
        unit,
        minStock,
        costPrice,
        salePrice,
        currentStock,
        categoryId,
        supplierId,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    return sendSuccess(res, { item }, 'Product created', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const sku = String(req.body?.sku || '').trim();
    const barcode = String(req.body?.barcode || '').trim();
    const name = String(req.body?.name || '').trim();
    const unit = String(req.body?.unit || '').trim();
    const categoryId = String(req.body?.categoryId || '').trim();
    const supplierId = String(req.body?.supplierId || '').trim();
    const minStock = parseNumber(req.body?.minStock, 0);
    const costPrice = parseNumber(req.body?.costPrice);
    const salePrice = parseNumber(req.body?.salePrice);
    const currentStock = parseNumber(req.body?.currentStock, 0);

    if (!sku || !name || !unit || !categoryId || !supplierId || costPrice === null || salePrice === null) {
      return sendError(res, 'Required fields are missing', 400, [
        { field: 'sku', message: 'SKU is required' },
        { field: 'name', message: 'Name is required' },
        { field: 'unit', message: 'Unit is required' },
        { field: 'categoryId', message: 'Category is required' },
        { field: 'supplierId', message: 'Supplier is required' },
        { field: 'costPrice', message: 'Cost price is required' },
        { field: 'salePrice', message: 'Sale price is required' },
      ]);
    }

    const refError = await validateProductRefs({ categoryId, supplierId });
    if (refError) {
      return sendError(res, refError, 400);
    }

    const item = await prisma.product.update({
      where: { id },
      data: {
        sku,
        barcode: barcode || null,
        name,
        unit,
        minStock,
        costPrice,
        salePrice,
        currentStock,
        categoryId,
        supplierId,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    return sendSuccess(res, { item }, 'Product updated');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Product deleted');
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
