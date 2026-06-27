const cron = require('node-cron');
const prisma = require('../config/prisma');

// Run every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Running Inventory Cron Job: Checking for expiring batches and low stock...');
  try {
    // 1. Check Low Stock
    const lowStockProducts = await prisma.$queryRaw`
      SELECT id, name, "currentStock", "minStock" 
      FROM "Product" 
      WHERE "currentStock" <= "minStock"
    `;

    for (const product of lowStockProducts) {
      // Check if a notification already exists for this today to avoid spam
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const existingNotif = await prisma.notification.findFirst({
        where: {
          title: 'Cảnh báo tồn kho thấp',
          message: { contains: product.name },
          createdAt: { gte: startOfDay }
        }
      });

      if (!existingNotif) {
        await prisma.notification.create({
          data: {
            title: 'Cảnh báo tồn kho thấp',
            message: `Sản phẩm ${product.name} đang có số lượng tồn (${product.currentStock}) dưới mức tối thiểu (${product.minStock}).`,
            type: 'WARNING'
          }
        });
      }
    }

    // 2. Check Expiring Batches (within next 30 days)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const expiringBatches = await prisma.stockBatch.findMany({
      where: {
        expiryDate: { lte: next30Days },
        remainingQuantity: { gt: 0 }
      },
      include: { product: true }
    });

    for (const batch of expiringBatches) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const existingNotif = await prisma.notification.findFirst({
        where: {
          title: 'Cảnh báo hàng sắp hết hạn',
          message: { contains: batch.lotNumber },
          createdAt: { gte: startOfDay }
        }
      });

      if (!existingNotif) {
        const daysLeft = Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        await prisma.notification.create({
          data: {
            title: 'Cảnh báo hàng sắp hết hạn',
            message: `Lô hàng ${batch.lotNumber} của sản phẩm ${batch.product.name} sẽ hết hạn trong ${daysLeft} ngày nữa.`,
            type: 'ERROR'
          }
        });
      }
    }

    console.log('Inventory Cron Job completed successfully.');
  } catch (error) {
    console.error('Error running inventory cron job:', error);
  }
});
