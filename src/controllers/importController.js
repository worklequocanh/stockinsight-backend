const prisma = require('../config/prisma');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { mapPrismaError } = require('../utils/prismaError');
const { normalizeSearch, toPositiveInt } = require('../utils/request');
const { ReceiptStatus } = require('@prisma/client');
const { writeAuditLog } = require('../utils/auditLog');
const { getIO } = require('../utils/socket');

function generateReceiptCode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `IMP-${timestamp}-${random}`;
}

async function listImports(req, res, next) {
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
      prisma.importReceipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.importReceipt.count({ where }),
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

async function getImportById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.importReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            batch: true,
            location: true,
          }
        },
      },
    });

    if (!item) {
      return sendError(res, 'Không tìm thấy phiếu nhập', 404);
    }

    return sendSuccess(res, { item });
  } catch (error) {
    return next(error);
  }
}

async function createImport(req, res, next) {
  try {
    const supplierId = String(req.body?.supplierId || '').trim();
    const note = String(req.body?.note || '').trim();
    const items = req.body?.items || [];
    const userId = req.user.id;

    if (!supplierId || !items.length) {
      return sendError(res, 'Vui lòng chọn nhà cung cấp và ít nhất một sản phẩm', 400);
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice || !item.lotNumber || !item.expiryDate) {
        return sendError(res, 'Thông tin sản phẩm không hợp lệ (yêu cầu: sản phẩm, số lượng, giá nhập, số lô, hạn sử dụng)', 400);
      }
      if (item.quantity <= 0 || item.unitPrice < 0) {
        return sendError(res, 'Số lượng và giá nhập phải lớn hơn 0', 400);
      }
      if (item.locationId) {
        const loc = await prisma.location.findUnique({ where: { id: item.locationId } });
        if (!loc) {
          return sendError(res, `Không tìm thấy vị trí lưu kho với ID: ${item.locationId}`, 400);
        }
      }
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return sendError(res, 'Không tìm thấy nhà cung cấp', 400);
    }

    const receipt = await prisma.importReceipt.create({
      data: {
        code: generateReceiptCode(),
        supplierId,
        note: note || null,
        createdById: userId,
        status: ReceiptStatus.PENDING,
        items: {
          create: items.map(i => ({
            productId: i.productId,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            lotNumber: String(i.lotNumber),
            expiryDate: new Date(i.expiryDate),
            locationId: i.locationId ? String(i.locationId) : null,
          })),
        }
      },
      include: { items: true }
    });

    return sendSuccess(res, { item: receipt }, 'Tạo phiếu nhập thành công', 201);
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.statusCode);
    }
    return next(error);
  }
}

async function approveImport(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const receipt = await prisma.importReceipt.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!receipt) {
      return sendError(res, 'Không tìm thấy phiếu nhập', 404);
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      return sendError(res, 'Chỉ có thể duyệt phiếu đang ở trạng thái Chờ Duyệt', 400);
    }

    // Transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Update status
      await tx.importReceipt.update({
        where: { id },
        data: {
          status: ReceiptStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        }
      });

      // 2. Process items
      for (const item of receipt.items) {
        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity }
          }
        });

        // Create stock batch
        const batch = await tx.stockBatch.create({
          data: {
            productId: item.productId,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            remainingQuantity: item.quantity,
            locationId: item.locationId,
          }
        });

        // Link batch to item
        await tx.importItem.update({
          where: { id: item.id },
          data: { batchId: batch.id }
        });
      }
    });

    // Ghi audit log
    await writeAuditLog(userId, 'APPROVE_IMPORT', 'ImportReceipt', id, {
      supplierId: receipt.supplierId,
      itemCount: receipt.items.length,
    });

    try {
      getIO().emit('stock_updated', { type: 'IMPORT_APPROVED', id });
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    return sendSuccess(res, null, 'Duyệt phiếu nhập thành công');
  } catch (error) {
    return next(error);
  }
}

async function rejectImport(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return sendError(res, 'Vui lòng nhập lý do từ chối', 400);
    }

    const receipt = await prisma.importReceipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return sendError(res, 'Không tìm thấy phiếu nhập', 404);
    }

    if (receipt.status !== ReceiptStatus.PENDING) {
      return sendError(res, 'Chỉ có thể từ chối phiếu đang ở trạng thái Chờ Duyệt', 400);
    }

    await prisma.importReceipt.update({
      where: { id },
      data: {
        status: ReceiptStatus.REJECTED,
        rejectedReason: reason,
        approvedById: userId,
        approvedAt: new Date(),
      }
    });

    return sendSuccess(res, null, 'Đã từ chối phiếu nhập');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listImports,
  getImportById,
  createImport,
  approveImport,
  rejectImport,
};
