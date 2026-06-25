const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');
const { writeAuditLog } = require('../utils/auditLog');

function generateCheckCode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CHK-${timestamp}-${random}`;
}

async function listChecks(req, res, next) {
  try {
    const search = normalizeSearch(req.query.search);
    const status = req.query.status;
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.inventoryCheck.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.inventoryCheck.count({ where }),
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

async function getCheckById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.inventoryCheck.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            batch: { select: { id: true, lotNumber: true, expiryDate: true, location: true } },
          },
        },
      },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy phiếu kiểm kê', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createCheck(req, res, next) {
  try {
    const { note, productIds } = req.body;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      // Create Header
      const check = await tx.inventoryCheck.create({
        data: {
          code: generateCheckCode(),
          note: note || null,
          createdById: userId,
          status: 'DRAFT',
        },
      });

      // Prepare items to snapshot
      let batchesToSnapshot = [];
      if (productIds && productIds.length > 0) {
        batchesToSnapshot = await tx.stockBatch.findMany({
          where: { productId: { in: productIds } },
        });
      } else {
        // Snapshot all products with stock
        batchesToSnapshot = await tx.stockBatch.findMany({});
      }

      if (batchesToSnapshot.length > 0) {
        const checkItemsData = batchesToSnapshot.map((batch) => ({
          inventoryCheckId: check.id,
          productId: batch.productId,
          stockBatchId: batch.id,
          systemQty: batch.remainingQuantity,
        }));

        await tx.inventoryCheckItem.createMany({
          data: checkItemsData,
        });
      }

      return check;
    });

    return sendSuccess(res, { item: result }, 'Tạo phiếu kiểm kê thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function updateCheckItems(req, res, next) {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { id: string (checkItemId), actualQty: number }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Dữ liệu kiểm kê không hợp lệ', 400);
    }

    const check = await prisma.inventoryCheck.findUnique({ where: { id } });
    if (!check) return sendError(res, 'Không tìm thấy phiếu kiểm kê', 404);
    if (check.status === 'COMPLETED' || check.status === 'CANCELED') {
      return sendError(res, 'Không thể cập nhật phiếu đã chốt hoặc đã hủy', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Mark as IN_PROGRESS if DRAFT
      if (check.status === 'DRAFT') {
        await tx.inventoryCheck.update({
          where: { id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      for (const item of items) {
        if (typeof item.actualQty !== 'number' || item.actualQty < 0) continue;

        const checkItem = await tx.inventoryCheckItem.findUnique({ where: { id: item.id } });
        if (checkItem && checkItem.inventoryCheckId === id) {
          const difference = item.actualQty - checkItem.systemQty;
          await tx.inventoryCheckItem.update({
            where: { id: item.id },
            data: {
              actualQty: item.actualQty,
              difference,
            },
          });
        }
      }
    });

    return sendSuccess(res, null, 'Cập nhật số liệu kiểm kê thành công');
  } catch (error) {
    return next(error);
  }
}

async function approveCheck(req, res, next) {
  try {
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const check = await tx.inventoryCheck.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!check) throw new Error('Không tìm thấy phiếu kiểm kê');
      if (check.status === 'COMPLETED') throw new Error('Phiếu kiểm kê đã được chốt từ trước');
      if (check.status === 'CANCELED') throw new Error('Không thể chốt phiếu đã hủy');

      // Adjust stocks based on differences
      for (const item of check.items) {
        if (item.actualQty !== null && item.difference !== 0) {
          // Adjust batch
          if (item.stockBatchId) {
            await tx.stockBatch.update({
              where: { id: item.stockBatchId },
              data: { remainingQuantity: item.actualQty },
            });
          }
          // Adjust overall product stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.difference } },
          });
        }
      }

      // Update check status
      return tx.inventoryCheck.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    });

    // Ghi audit log
    await writeAuditLog(req.user.id, 'COMPLETE_INVENTORY_CHECK', 'InventoryCheck', id, {
      note: result.note,
    });

    return sendSuccess(res, { item: result }, 'Chốt phiếu kiểm kê thành công, đã cân bằng kho');
  } catch (error) {
    if (error.message === 'Không tìm thấy phiếu kiểm kê') return sendError(res, error.message, 404);
    if (error.message.includes('đã được chốt') || error.message.includes('đã hủy')) return sendError(res, error.message, 400);
    return next(error);
  }
}

async function cancelCheck(req, res, next) {
  try {
    const { id } = req.params;
    const check = await prisma.inventoryCheck.findUnique({ where: { id } });

    if (!check) return sendError(res, 'Không tìm thấy phiếu kiểm kê', 404);
    if (check.status === 'COMPLETED') return sendError(res, 'Không thể hủy phiếu đã chốt', 400);

    const result = await prisma.inventoryCheck.update({
      where: { id },
      data: { status: 'CANCELED' },
    });

    return sendSuccess(res, { item: result }, 'Đã hủy phiếu kiểm kê');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listChecks,
  getCheckById,
  createCheck,
  updateCheckItems,
  approveCheck,
  cancelCheck,
};
