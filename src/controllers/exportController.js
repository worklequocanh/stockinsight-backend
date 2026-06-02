const prisma = require('../config/prisma');

exports.listExports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, exportType, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (exportType) {
      where.exportType = exportType;
    }
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      prisma.exportReceipt.count({ where }),
      prisma.exportReceipt.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getExportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.exportReceipt.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            stockBatch: true,
          },
        },
      },
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Export receipt not found' });
    }

    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

exports.createExport = async (req, res, next) => {
  try {
    const { exportType, note, items } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Export Receipt header
      const receipt = await tx.exportReceipt.create({
        data: {
          code: `EXP-${Date.now()}`,
          exportType,
          note,
          createdById: req.user.id,
          status: 'PENDING',
        },
      });

      // Prepare final ExportItems based on FEFO
      const exportItemsToCreate = [];

      for (const item of items) {
        let remainingToFulfill = Number(item.quantity);

        // Fetch all batches for this product ordered by expiryDate ASC
        const batches = await tx.stockBatch.findMany({
          where: { 
            productId: item.productId,
            remainingQuantity: { gt: 0 }
          },
          orderBy: { expiryDate: 'asc' },
        });

        // Check total available stock
        const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
        if (totalAvailable < remainingToFulfill) {
          throw new Error(`Product ${item.productId} does not have enough stock. Requested: ${remainingToFulfill}, Available: ${totalAvailable}`);
        }

        for (const batch of batches) {
          if (remainingToFulfill <= 0) break;

          const takeQty = Math.min(batch.remainingQuantity, remainingToFulfill);
          remainingToFulfill -= takeQty;

          exportItemsToCreate.push({
            exportReceiptId: receipt.id,
            productId: item.productId,
            stockBatchId: batch.id,
            quantity: takeQty,
            unitPrice: item.unitPrice,
          });
        }
      }

      await tx.exportItem.createMany({
        data: exportItemsToCreate,
      });

      return receipt;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('does not have enough stock')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.approveExport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.exportReceipt.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!receipt) throw new Error('Receipt not found');
      if (receipt.status !== 'PENDING') throw new Error('Receipt is not pending');

      // Deduct stock for each item
      for (const item of receipt.items) {
        // Validate batch remaining quantity
        const batch = await tx.stockBatch.findUnique({ where: { id: item.stockBatchId } });
        if (batch.remainingQuantity < item.quantity) {
          throw new Error(`Insufficient stock in batch ${batch.lotNumber}. Please reject this receipt and recreate it.`);
        }

        // Deduct from batch
        await tx.stockBatch.update({
          where: { id: item.stockBatchId },
          data: { remainingQuantity: { decrement: item.quantity } },
        });

        // Deduct from product total stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }

      // Update status
      return tx.exportReceipt.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: req.user.id,
          approvedAt: new Date(),
        },
      });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Receipt not found') return res.status(404).json({ success: false, message: error.message });
    if (error.message === 'Receipt is not pending') return res.status(400).json({ success: false, message: error.message });
    if (error.message.includes('Insufficient stock')) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

exports.rejectExport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const receipt = await prisma.exportReceipt.findUnique({ where: { id } });
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    if (receipt.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Receipt is not pending' });

    const updated = await prisma.exportReceipt.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        approvedById: req.user.id,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
