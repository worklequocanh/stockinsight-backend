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
  const categoriesData = [
    { name: 'Đồ uống', desc: 'Nước giải khát, bia, rượu, nước ép' },
    { name: 'Đồ khô', desc: 'Thực phẩm khô, mì gói, miến, bún' },
    { name: 'Gia vị', desc: 'Nước mắm, bột ngọt, đường, muối, hạt nêm' },
    { name: 'Đồ hộp', desc: 'Cá hộp, thịt hộp, pate, trái cây đóng hộp' },
    { name: 'Hóa mỹ phẩm', desc: 'Dầu gội, sữa tắm, nước giặt, kem đánh răng' },
    { name: 'Đồ dùng gia đình', desc: 'Giấy vệ sinh, khăn giấy, túi rác' }
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, description: c.desc },
    });
    categories.push(cat);
  }

  // 3. Seed Suppliers
  const suppliersData = [
    { name: 'Công ty TNHH Nước Giải Khát', phone: '0900000001', email: 'contact@beverage.vn' },
    { name: 'Công ty CP Thực Phẩm Khô', phone: '0900000002', email: 'contact@dryfood.vn' },
    { name: 'Nhà Phân Phối Hóa Mỹ Phẩm', phone: '0900000003', email: 'contact@cosmetics.vn' },
    { name: 'Tổng kho Gia vị & Đồ hộp', phone: '0900000004', email: 'contact@general.vn' }
  ];

  const suppliers = [];
  for (const s of suppliersData) {
    const sup = await prisma.supplier.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    suppliers.push(sup);
  }

  // 4. Seed Products (30 products)
  const rawProducts = [
    // Đồ uống
    { sku: 'SKU-001', name: 'Nước suối Aquafina 500ml', unit: 'chai', minStock: 100, costPrice: 3500, salePrice: 5000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-002', name: 'Nước suối Dasani 500ml', unit: 'chai', minStock: 100, costPrice: 3200, salePrice: 4500, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-003', name: 'Coca Cola lon 330ml', unit: 'lon', minStock: 150, costPrice: 7500, salePrice: 10000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-004', name: 'Pepsi lon 330ml', unit: 'lon', minStock: 150, costPrice: 7200, salePrice: 10000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-005', name: 'Bia Tiger (Thùng 24 lon)', unit: 'thùng', minStock: 50, costPrice: 320000, salePrice: 350000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-006', name: 'Bia Heineken (Thùng 24 lon)', unit: 'thùng', minStock: 40, costPrice: 400000, salePrice: 430000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-007', name: 'Nước ép Cam Twister 1L', unit: 'chai', minStock: 30, costPrice: 18000, salePrice: 24000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    // Đồ khô
    { sku: 'SKU-008', name: 'Mì gói Hảo Hảo Tôm Chua Cay', unit: 'thùng', minStock: 30, costPrice: 95000, salePrice: 110000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-009', name: 'Mì Omachi Xốt Vang', unit: 'thùng', minStock: 25, costPrice: 180000, salePrice: 200000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-010', name: 'Phở bò Vifon', unit: 'thùng', minStock: 20, costPrice: 150000, salePrice: 175000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-011', name: 'Gạo ST25 (Túi 5kg)', unit: 'túi', minStock: 40, costPrice: 150000, salePrice: 180000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-012', name: 'Bún khô Safoco 500g', unit: 'gói', minStock: 50, costPrice: 22000, salePrice: 28000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    // Gia vị
    { sku: 'SKU-013', name: 'Nước mắm Nam Ngư 750ml', unit: 'chai', minStock: 80, costPrice: 32000, salePrice: 42000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-014', name: 'Nước mắm Chinsu 500ml', unit: 'chai', minStock: 60, costPrice: 38000, salePrice: 48000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-015', name: 'Bột ngọt Ajinomoto 1kg', unit: 'gói', minStock: 40, costPrice: 58000, salePrice: 65000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-016', name: 'Hạt nêm Knorr 400g', unit: 'gói', minStock: 50, costPrice: 34000, salePrice: 41000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-017', name: 'Dầu ăn Tường An 1L', unit: 'chai', minStock: 100, costPrice: 42000, salePrice: 50000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-018', name: 'Đường kính trắng Biên Hòa 1kg', unit: 'gói', minStock: 80, costPrice: 22000, salePrice: 28000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    // Đồ hộp
    { sku: 'SKU-019', name: 'Cá mòi 3 Cô Gái', unit: 'hộp', minStock: 60, costPrice: 12000, salePrice: 16000, categoryId: categories[3].id, supplierId: suppliers[3].id },
    { sku: 'SKU-020', name: 'Pate gan Hạ Long', unit: 'hộp', minStock: 40, costPrice: 18000, salePrice: 23000, categoryId: categories[3].id, supplierId: suppliers[3].id },
    { sku: 'SKU-021', name: 'Ngô ngọt đóng hộp', unit: 'hộp', minStock: 30, costPrice: 20000, salePrice: 26000, categoryId: categories[3].id, supplierId: suppliers[3].id },
    // Hóa mỹ phẩm
    { sku: 'SKU-022', name: 'Dầu gội Clear 630g', unit: 'chai', minStock: 25, costPrice: 120000, salePrice: 145000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-023', name: 'Dầu gội Sunsilk 650g', unit: 'chai', minStock: 25, costPrice: 110000, salePrice: 135000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-024', name: 'Sữa tắm Lifebuoy 850g', unit: 'chai', minStock: 30, costPrice: 140000, salePrice: 165000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-025', name: 'Nước giặt OMO Matic 2.8kg', unit: 'túi', minStock: 40, costPrice: 155000, salePrice: 185000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-026', name: 'Kem đánh răng P/S 230g', unit: 'hộp', minStock: 50, costPrice: 32000, salePrice: 39000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    // Đồ dùng gia đình
    { sku: 'SKU-027', name: 'Giấy vệ sinh Bless You (Lốc 10 cuộn)', unit: 'lốc', minStock: 60, costPrice: 75000, salePrice: 95000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-028', name: 'Khăn giấy lụa Pulppy', unit: 'hộp', minStock: 40, costPrice: 18000, salePrice: 23000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-029', name: 'Túi rác đen cuộn 1kg', unit: 'cuộn', minStock: 30, costPrice: 35000, salePrice: 45000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-030', name: 'Nước rửa chén Sunlight 1.5kg', unit: 'chai', minStock: 50, costPrice: 38000, salePrice: 46000, categoryId: categories[5].id, supplierId: suppliers[2].id }
  ];

  const products = [];
  for (let idx = 0; idx < rawProducts.length; idx++) {
    const p = rawProducts[idx];
    const barcode = `893850000${(idx + 1).toString().padStart(3, '0')}`;
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { currentStock: 0 }, // Reset to 0 before generating
      create: { ...p, barcode, currentStock: 0 },
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
    // 4 Import receipts per month
    for (let k = 1; k <= 4; k++) {
      const date = getPastDate(i);
      date.setDate(Math.floor(Math.random() * 25) + 1); // Random day in month
      
      const supplierId = suppliers[Math.floor(Math.random() * suppliers.length)].id;

      // Pick 8-15 random products for this import
      const numItems = Math.floor(Math.random() * 8) + 8;
      const importProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numItems);

      const importReceipt = await prisma.importReceipt.create({
        data: {
          code: `IMP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${k}-${Math.floor(Math.random() * 100000)}`,
          supplierId: supplierId,
          status: 'APPROVED',
          createdById: manager.id,
          approvedById: admin.id,
          approvedAt: date,
          createdAt: date,
          updatedAt: date,
          items: {
            create: importProducts.map((p) => {
              const qty = Math.floor(Math.random() * 200) + 100; // 100-300
              const expDays = Math.floor(Math.random() * 150) + 30; // 30-180 days
              return {
                productId: p.id,
                quantity: qty,
                unitPrice: p.costPrice,
                expiryDate: getFutureDate(i * 30 + expDays), 
                lotNumber: `LOT-${p.sku}-${date.getFullYear()}${date.getMonth() + 1}-${k}-${Math.floor(Math.random() * 100000)}`,
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
  }

  // 6. Generate Exports across 6 months
  console.log('Generating Exports...');
  for (let i = 5; i >= 0; i--) {
    
    // 20 Export receipts per month
    for (let j = 1; j <= 20; j++) {
      const date = getPastDate(i);
      date.setDate(Math.floor(Math.random() * 28) + 1); // Random day

      const exportReceipt = await prisma.exportReceipt.create({
        data: {
          code: `EXP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${j}-${Math.floor(Math.random() * 100000)}`,
          exportType: 'SALE',
          status: 'APPROVED',
          createdById: employee.id,
          approvedById: manager.id,
          approvedAt: date,
          createdAt: date,
          updatedAt: date,
        },
      });

      // Pick 3-6 random products to export
      const numExportItems = Math.floor(Math.random() * 4) + 3;
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numExportItems);

      for (const p of shuffledProducts) {
        const qtyToExport = Math.floor(Math.random() * 30) + 10; // 10-40

        // Get batches using FEFO
        const batches = await prisma.stockBatch.findMany({
          where: { productId: p.id, remainingQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        });

        let remainingToExport = qtyToExport;

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
  console.log('Generating Alert Batches...');
  const today = new Date();
  
  // Create an expiring soon batch (7 days)
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 5);
  
  const alertBatch1 = await prisma.stockBatch.findFirst({
    where: { productId: products[0].id, remainingQuantity: { gt: 20 } }
  });
  if (alertBatch1) {
    await prisma.stockBatch.update({
      where: { id: alertBatch1.id },
      data: { expiryDate: nextWeek }
    });
  }

  // Create an expiring soon batch (14 days)
  const twoWeeks = new Date();
  twoWeeks.setDate(today.getDate() + 12);
  const alertBatch2 = await prisma.stockBatch.findFirst({
    where: { productId: products[10].id, remainingQuantity: { gt: 20 } }
  });
  if (alertBatch2) {
    await prisma.stockBatch.update({
      where: { id: alertBatch2.id },
      data: { expiryDate: twoWeeks }
    });
  }

  // Make some products have low stock by exporting specifically them
  const lowStockProducts = products.slice(5, 8);
  for (const p of lowStockProducts) {
    const currentProd = await prisma.product.findUnique({ where: { id: p.id }});
    if (currentProd.currentStock > p.minStock) {
      const diffToMakeItLow = currentProd.currentStock - p.minStock + 5; // Export down to minStock - 5
      
      const exportReceipt = await prisma.exportReceipt.create({
        data: {
          code: `EXP-LOWSTOCK-${p.sku}-${Math.floor(Math.random() * 100000)}`,
          exportType: 'SALE',
          status: 'APPROVED',
          createdById: employee.id,
          approvedById: manager.id,
          approvedAt: today,
          createdAt: today,
          updatedAt: today,
        },
      });

      const batches = await prisma.stockBatch.findMany({
        where: { productId: p.id, remainingQuantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
      });

      let remainingToExport = diffToMakeItLow;
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

  console.log('Seed completed successfully with heavy data!');
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
