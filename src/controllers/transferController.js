const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');
const { ReceiptStatus } = require('@prisma/client');
const { writeAuditLog } = require('../utils/auditLog');
const { getIO } = require('../utils/socket');

function generateTransferCode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${timestamp}-${random}`;
}

async function listTransfers(req, res, next) {
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
    if (status && Object.values(ReceiptStatus).includes(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.internalTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.internalTransfer.count({ where }),
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

async function getTransferById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
            fromBatch: true,
            toBatch: true,
          }
        },
      },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy phiếu chuyển kho', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createTransfer(req, res, next) {
  try {
    const note = String(req.body?.note || '').trim();
    const items = req.body?.items || [];
    const userId = req.user.id;

    if (!items.length) {
      return sendError(res, 'Vui lòng chọn ít nhất một sản phẩm để chuyển kho', 400);
    }

    const preparedItems = [];
    for (const item of items) {
      if (!item.productId || !item.fromLocationId || !item.toLocationId || !item.quantity) {
        return sendError(res, 'Thông tin sản phẩm không hợp lệ (yêu cầu: sản phẩm, vị trí từ, vị trí đến, số lượng)', 400);
      }
      if (item.quantity <= 0) {
        return sendError(res, 'Số lượng chuyển phải lớn hơn 0', 400);
      }
      if (item.fromLocationId === item.toLocationId) {
        return sendError(res, 'Vị trí chuyển đến phải khác vị trí chuyển đi', 400);
      }

      let batchId = String(item.fromBatchId || '').trim();
      if (!batchId || !batchId.includes('-') || batchId.length < 30) {
        const activeBatch = await prisma.stockBatch.findFirst({
          where: {
            productId: item.productId,
            locationId: item.fromLocationId || undefined,
            remainingQuantity: { gte: Number(item.quantity) || 1 }
          },
          orderBy: { expiryDate: 'asc' }
        }) || await prisma.stockBatch.findFirst({
          where: {
            productId: item.productId,
            remainingQuantity: { gt: 0 }
          },
          orderBy: { expiryDate: 'asc' }
        });

        if (!activeBatch) {
          return sendError(res, `Không tìm thấy lô hàng khả dụng cho sản phẩm ở kho gửi để điều chuyển`, 400);
        }
        batchId = activeBatch.id;
      }

      preparedItems.push({
        productId: item.productId,
        fromLocationId: item.fromLocationId,
        toLocationId: item.toLocationId,
        quantity: Number(item.quantity),
        fromBatchId: batchId,
      });
    }

    const receipt = await prisma.internalTransfer.create({
      data: {
        code: generateTransferCode(),
        note: note || null,
        createdById: userId,
        status: ReceiptStatus.PENDING,
        items: {
          create: preparedItems,
        }
      },
      include: { items: true }
    });

    await writeAuditLog(userId, 'CREATE_TRANSFER', 'InternalTransfer', receipt.id, {
      code: receipt.code,
      itemCount: preparedItems.length,
    });

    return sendSuccess(res, { item: receipt }, 'Tạo phiếu chuyển kho thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function approveTransfer(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const receipt = await prisma.internalTransfer.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!receipt) {
      return sendError(res, 'Không tìm thấy phiếu chuyển kho', 404);
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      return sendError(res, 'Chỉ có thể duyệt phiếu đang ở trạng thái Chờ Duyệt', 400);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái phiếu
      await tx.internalTransfer.update({
        where: { id },
        data: {
          status: ReceiptStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        }
      });

      // 2. Xử lý logic chuyển kho cho từng item
      for (const item of receipt.items) {
        // Lấy lô hàng từ
        const fromBatch = await tx.stockBatch.findUnique({ where: { id: item.fromBatchId } });
        if (!fromBatch || fromBatch.remainingQuantity < item.quantity) {
          throw new Error(`Tồn kho lô ở vị trí gửi không đủ (Lô ID: ${item.fromBatchId}). Vui lòng từ chối phiếu này.`);
        }

        // Trừ tồn kho ở lô cũ
        await tx.stockBatch.update({
          where: { id: item.fromBatchId },
          data: {
            remainingQuantity: { decrement: item.quantity }
          }
        });

        // Tìm xem lô này ở vị trí mới đã tồn tại chưa
        const existingToBatch = await tx.stockBatch.findFirst({
          where: {
            productId: item.productId,
            lotNumber: fromBatch.lotNumber,
            expiryDate: fromBatch.expiryDate,
            locationId: item.toLocationId
          }
        });

        let toBatchId;

        if (existingToBatch) {
          // Nếu đã tồn tại lô tương tự ở vị trí mới -> cộng dồn
          await tx.stockBatch.update({
            where: { id: existingToBatch.id },
            data: {
              remainingQuantity: { increment: item.quantity },
              quantity: { increment: item.quantity }
            }
          });
          toBatchId = existingToBatch.id;
        } else {
          // Tạo lô mới ở vị trí đến
          const newBatch = await tx.stockBatch.create({
            data: {
              productId: item.productId,
              lotNumber: fromBatch.lotNumber,
              expiryDate: fromBatch.expiryDate,
              quantity: item.quantity,
              remainingQuantity: item.quantity,
              locationId: item.toLocationId
            }
          });
          toBatchId = newBatch.id;
        }

        // Liên kết lô mới vào item của phiếu chuyển
        await tx.internalTransferItem.update({
          where: { id: item.id },
          data: { toBatchId }
        });
      }
    });

    await writeAuditLog(userId, 'APPROVE_TRANSFER', 'InternalTransfer', id, {
      itemCount: receipt.items.length,
    });

    try {
      getIO().emit('stock_updated', { type: 'TRANSFER_APPROVED', id });
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    return sendSuccess(res, null, 'Duyệt phiếu chuyển kho thành công');
  } catch (error) {
    if (error.message.includes('Tồn kho lô')) {
      return sendError(res, error.message, 400);
    }
    return next(error);
  }
}

async function rejectTransfer(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return sendError(res, 'Vui lòng nhập lý do từ chối', 400);
    }

    const receipt = await prisma.internalTransfer.findUnique({
      where: { id },
    });

    if (!receipt) {
      return sendError(res, 'Không tìm thấy phiếu chuyển kho', 404);
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      return sendError(res, 'Chỉ có thể từ chối phiếu đang ở trạng thái Chờ Duyệt', 400);
    }

    await prisma.internalTransfer.update({
      where: { id },
      data: {
        status: ReceiptStatus.REJECTED,
        rejectedReason: reason,
        approvedById: userId,
        approvedAt: new Date(),
      }
    });

    return sendSuccess(res, null, 'Đã từ chối phiếu chuyển kho');
  } catch (error) {
    return next(error);
  }
}

async function getAvailableBatches(req, res, next) {
  try {
    const { productId } = req.query;
    const where = { remainingQuantity: { gt: 0 } };
    if (productId) where.productId = productId;

    const batches = await prisma.stockBatch.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });

    return sendSuccess(res, { batches });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  getAvailableBatches,
};
