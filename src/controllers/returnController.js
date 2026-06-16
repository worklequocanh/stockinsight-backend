const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');

function generateReturnCode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RET-${timestamp}-${random}`;
}

async function listReturns(req, res, next) {
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
      prisma.returnReceipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.returnReceipt.count({ where }),
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

async function getReturnById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.returnReceipt.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy phiếu trả hàng', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createReturn(req, res, next) {
  try {
    const { reason, originalExportId, items } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return sendError(res, 'Vui lòng nhập lý do trả hàng', 400);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Vui lòng chọn ít nhất một sản phẩm để trả lại', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.returnReceipt.create({
        data: {
          code: generateReturnCode(),
          reason,
          originalExportId: originalExportId || null,
          createdById: userId,
          status: 'PENDING',
        },
      });

      const returnItemsData = items.map((item) => ({
        returnReceiptId: receipt.id,
        productId: item.productId,
        quantity: Number(item.quantity),
        qualityStatus: item.qualityStatus || 'Mới',
      }));

      await tx.returnItem.createMany({
        data: returnItemsData,
      });

      return receipt;
    });

    return sendSuccess(res, { item: result }, 'Tạo phiếu trả hàng thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function processReturn(req, res, next) {
  try {
    const { id } = req.params;
    const { action, batchDetails } = req.body; 
    // action: 'RETURNED_TO_STOCK' | 'DISCARDED'
    // batchDetails: { [productId]: { lotNumber: string, expiryDate: string } } (Cần nếu RETURNED_TO_STOCK)

    if (!['RETURNED_TO_STOCK', 'DISCARDED'].includes(action)) {
      return sendError(res, 'Hành động xử lý không hợp lệ', 400);
    }

    const receipt = await prisma.returnReceipt.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!receipt) return sendError(res, 'Không tìm thấy phiếu trả hàng', 404);
    if (receipt.status === 'RETURNED_TO_STOCK' || receipt.status === 'DISCARDED') {
      return sendError(res, 'Phiếu này đã được xử lý', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'RETURNED_TO_STOCK') {
        // Cộng lại kho
        for (const item of receipt.items) {
          const detail = batchDetails && batchDetails[item.productId];
          const lotNumber = detail?.lotNumber || `RET-${receipt.code}`;
          // Mặc định hạn sử dụng là 1 năm kể từ lúc trả hàng nếu không có
          const expiryDate = detail?.expiryDate ? new Date(detail.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          // Tạo lô hàng mới cho hàng hoàn trả
          await tx.stockBatch.create({
            data: {
              productId: item.productId,
              lotNumber,
              expiryDate,
              quantity: item.quantity,
              remainingQuantity: item.quantity,
            },
          });

          // Tăng tổng kho
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }

      return tx.returnReceipt.update({
        where: { id },
        data: { status: action },
      });
    });

    const msg = action === 'RETURNED_TO_STOCK' ? 'Đã nhập lại kho hàng trả về' : 'Đã xuất hủy hàng trả về';
    return sendSuccess(res, { item: result }, msg);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listReturns,
  getReturnById,
  createReturn,
  processReturn,
};
