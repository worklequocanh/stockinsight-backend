require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const env = require('../src/config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  // 1. Seed Users
  const [admin, manager, employee] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@stockinsight.local' },
      update: {},
      create: { name: 'Quản trị viên', email: 'admin@stockinsight.local', password, role: Role.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: 'manager@stockinsight.local' },
      update: {},
      create: { name: 'Quản lý kho', email: 'manager@stockinsight.local', password, role: Role.WAREHOUSE_MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'employee@stockinsight.local' },
      update: {},
      create: { name: 'Nhân viên', email: 'employee@stockinsight.local', password, role: Role.EMPLOYEE },
    }),
  ]);

  // 2. Seed Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Đồ uống' },
      update: {},
      create: { name: 'Đồ uống', description: 'Nước giải khát và đồ uống đóng chai' },
    }),
    prisma.category.upsert({
      where: { name: 'Đồ khô' },
      update: {},
      create: { name: 'Đồ khô', description: 'Thực phẩm khô và hàng tiêu dùng' },
    }),
    prisma.category.upsert({
      where: { name: 'Gia vị' },
      update: {},
      create: { name: 'Gia vị', description: 'Nước mắm, bột ngọt, hạt nêm' },
    }),
  ]);

  // 3. Seed Suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { name: 'Công ty TNHH Nước Giải Khát' },
      update: {},
      create: { name: 'Công ty TNHH Nước Giải Khát', phone: '0900000001', email: 'contact@beverage.vn' },
    }),
    prisma.supplier.upsert({
      where: { name: 'Công ty CP Thực Phẩm Khô' },
      update: {},
      create: { name: 'Công ty CP Thực Phẩm Khô', phone: '0900000002', email: 'contact@dryfood.vn' },
    }),
  ]);

  // 4. Seed Products
  const productsData = [
    { sku: 'SKU-001', barcode: '893850123001', name: 'Nước suối 500ml', unit: 'chai', minStock: 50, costPrice: 3000, salePrice: 5000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-002', barcode: '893850123002', name: 'Mì gói Hảo Hảo', unit: 'thùng', minStock: 20, costPrice: 90000, salePrice: 110000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-003', barcode: '893850123003', name: 'Nước mắm Nam Ngư', unit: 'chai', minStock: 30, costPrice: 25000, salePrice: 32000, categoryId: categories[2].id, supplierId: suppliers[1].id },
    { sku: 'SKU-004', barcode: '893850123004', name: 'Bột ngọt Ajinomoto 1kg', unit: 'gói', minStock: 15, costPrice: 40000, salePrice: 55000, categoryId: categories[2].id, supplierId: suppliers[1].id },
    { sku: 'SKU-005', barcode: '893850123005', name: 'Bia Heineken (Thùng 24 lon)', unit: 'thùng', minStock: 10, costPrice: 400000, salePrice: 450000, categoryId: categories[0].id, supplierId: suppliers[0].id },
  ];

  const products = [];
  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { currentStock: 0 }, // Reset to 0 before generating
      create: { ...p, currentStock: 0 },
    });
    products.push(prod);
  }

  // Helper to generate past dates
  const getPastDate = (monthsAgo) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setHours(Math.floor(Math.random() * 8) + 8, Math.floor(Math.random() * 60), 0);
    return d;
  };

  // Helper to generate future dates (for expiry)
  const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  };

  // 5. Generate Imports and StockBatches across 6 months
  console.log('Generating Imports & Stock Batches...');
  for (let i = 5; i >= 0; i--) {
    const date = getPastDate(i);

    // Create an import receipt for this month
    const importReceipt = await prisma.importReceipt.create({
      data: {
        code: `IMP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${i + 1}`,
        supplierId: suppliers[i % 2].id,
        status: 'APPROVED',
        createdById: manager.id,
        approvedById: admin.id,
        approvedAt: date,
        createdAt: date,
        updatedAt: date,
        items: {
          create: products.map((p, index) => {
            const qty = Math.floor(Math.random() * 100) + 50; // 50-150
            return {
              productId: p.id,
              quantity: qty,
              unitPrice: p.costPrice,
              expiryDate: getFutureDate(i * 30 + Math.floor(Math.random() * 60)), // Expire in 0-180 days
              lotNumber: `LOT-${p.sku}-${date.getFullYear()}${date.getMonth() + 1}`,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Create StockBatches for this import
    for (const item of importReceipt.items) {
      const batch = await prisma.stockBatch.create({
        data: {
          productId: item.productId,
          lotNumber: item.lotNumber,
          quantity: item.quantity,
          remainingQuantity: item.quantity,
          expiryDate: item.expiryDate,
          createdAt: date,
          updatedAt: date,
        },
      });

      await prisma.importItem.update({
        where: { id: item.id },
        data: { batchId: batch.id }
      });

      // Update currentStock
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });
    }
  }

  // 6. Generate Exports across 6 months
  console.log('Generating Exports...');
  for (let i = 5; i >= 0; i--) {
    const date = getPastDate(i);
    date.setDate(date.getDate() + 5); // Export 5 days after import

    for (let j = 0; j < 3; j++) { // 3 exports per month
      date.setHours(date.getHours() + j);

      const exportReceipt = await prisma.exportReceipt.create({
        data: {
          code: `EXP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${i * 3 + j + 1}`,
          exportType: 'SALE',
          status: 'APPROVED',
          createdById: employee.id,
          approvedById: manager.id,
          approvedAt: date,
          createdAt: date,
          updatedAt: date,
        },
      });

      // Pick 2 random products to export
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 2);

      for (const p of shuffledProducts) {
        const qtyToExport = Math.floor(Math.random() * 20) + 5; // 5-25

        // Get batches using FEFO
        const batches = await prisma.stockBatch.findMany({
          where: { productId: p.id, remainingQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        });

        let remainingToExport = qtyToExport;
        let actualExported = 0;

        for (const batch of batches) {
          if (remainingToExport <= 0) break;
          const qtyFromBatch = Math.min(remainingToExport, batch.remainingQuantity);

          await prisma.stockBatch.update({
            where: { id: batch.id },
            data: { remainingQuantity: { decrement: qtyFromBatch } },
          });

          await prisma.exportItem.create({
            data: {
              exportReceiptId: exportReceipt.id,
              productId: p.id,
              stockBatchId: batch.id,
              quantity: qtyFromBatch,
              unitPrice: p.salePrice,
            },
          });

          await prisma.product.update({
            where: { id: p.id },
            data: { currentStock: { decrement: qtyFromBatch } },
          });

          remainingToExport -= qtyFromBatch;
        }
      }
    }
  }

  // Force some batches to be expired or close to expiry to show up in alerts
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 5);

  const someProduct = products[0];
  const alertBatch = await prisma.stockBatch.findFirst({
    where: { productId: someProduct.id, remainingQuantity: { gt: 10 } }
  });
  if (alertBatch) {
    await prisma.stockBatch.update({
      where: { id: alertBatch.id },
      data: { expiryDate: nextWeek }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
