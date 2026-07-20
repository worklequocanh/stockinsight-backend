require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Role, ReceiptStatus, ExportType, CheckStatus, ReturnStatus } = require('@prisma/client');
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
  console.log('🌱 Seeding database with clean, matched demo data...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.returnReceipt.deleteMany();
  await prisma.inventoryCheckItem.deleteMany();
  await prisma.inventoryCheck.deleteMany();
  await prisma.internalTransferItem.deleteMany();
  await prisma.internalTransfer.deleteMany();
  await prisma.exportItem.deleteMany();
  await prisma.exportReceipt.deleteMany();
  await prisma.importItem.deleteMany();
  await prisma.importReceipt.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.location.deleteMany();
  await prisma.category.deleteMany();

  const password = await bcrypt.hash('admin123', 10);

  // 1. Users
  console.log('1. Users...');
  const [admin, manager, employee] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@stockinsight.local' },
      update: { password },
      create: { name: 'Nguyễn Văn Quản Trị (Admin)', email: 'admin@stockinsight.local', password, role: Role.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: 'manager@stockinsight.local' },
      update: { password },
      create: { name: 'Trần Thị Quản Lý Kho', email: 'manager@stockinsight.local', password, role: Role.WAREHOUSE_MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'employee@stockinsight.local' },
      update: { password },
      create: { name: 'Lê Hoàng Nhân Viên', email: 'employee@stockinsight.local', password, role: Role.EMPLOYEE },
    }),
  ]);

  // 2. Categories
  console.log('2. Categories...');
  const categoriesData = [
    { name: 'Đồ uống', desc: 'Nước giải khát, bia, rượu, nước ép' },
    { name: 'Đồ khô', desc: 'Thực phẩm khô, mì gói, miến, bún, gạo' },
    { name: 'Gia vị', desc: 'Nước mắm, bột ngọt, đường, muối, hạt nêm' },
    { name: 'Đồ hộp', desc: 'Cá hộp, thịt hộp, pate, trái cây đóng hộp' },
    { name: 'Hóa mỹ phẩm', desc: 'Dầu gội, sữa tắm, nước giặt, kem đánh răng' },
    { name: 'Đồ dùng gia đình', desc: 'Giấy vệ sinh, khăn giấy, túi rác' }
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.create({ data: { name: c.name, description: c.desc } });
    categories.push(cat);
  }

  // 3. Suppliers
  console.log('3. Suppliers...');
  const suppliersData = [
    { name: 'Công ty TNHH Nước Giải Khát Suntory Pepsico', phone: '028-3829-1111', email: 'pepsico@beverage.vn', address: 'Quận 1, TP. Hồ Chí Minh' },
    { name: 'Công ty CP Thực Phẩm Khô Acecook Việt Nam', phone: '028-3815-4000', email: 'order@acecook.vn', address: 'KCN Tân Bình, TP. Hồ Chí Minh' },
    { name: 'Tập đoàn Unilever Việt Nam', phone: '028-5413-5688', email: 'supply@unilever.vn', address: 'Quận 7, TP. Hồ Chí Minh' },
    { name: 'Tổng kho Gia vị & Đồ hộp Masan Consumer', phone: '028-3827-3300', email: 'sales@masan.vn', address: 'Quận 1, TP. Hồ Chí Minh' }
  ];

  const suppliers = [];
  for (const s of suppliersData) {
    const sup = await prisma.supplier.create({ data: s });
    suppliers.push(sup);
  }

  // 4. Customers
  console.log('4. Customers...');
  const customersData = [
    { name: 'Hệ thống Siêu thị Co.opmart Nguyễn Đình Chiểu', phone: '028-3930-1234', email: 'orders@coopmart.vn', address: '168 Nguyễn Đình Chiểu, Q.3, TP.HCM' },
    { name: 'Chuỗi Cửa Hàng Tiện Lợi WinMart+ Quận 10', phone: '024-7106-6868', email: 'winmart.q10@wincommerce.vn', address: '283 Cách Mạng Tháng 8, Q.10, TP.HCM' },
    { name: 'Bách Hóa Xanh Chi Nhánh Tân Phú', phone: '1900-1908', email: 'bhx.tanphu@bachhoaxanh.com', address: '102 Lũy Bán Bích, Q.Tân Phú, TP.HCM' },
    { name: 'Chuỗi Tiện Lợi Circle K Việt Nam', phone: '1900-3110', email: 'supply@circlek.com.vn', address: '160 Bùi Thị Xuân, Q.1, TP.HCM' },
    { name: 'Cửa Hàng Tiện Lợi GS25 Bến Thành', phone: '1900-636-078', email: 'store.ben-thanh@gs25.com.vn', address: '45 Lê Thị Hồng Gấm, Q.1, TP.HCM' }
  ];

  const customers = [];
  for (const cust of customersData) {
    const c = await prisma.customer.create({ data: cust });
    customers.push(c);
  }

  // 5. Locations (24 Grid Cells: Zone A, B, C)
  console.log('5. Locations...');
  const locations = [];
  const zones = ['A', 'B', 'C'];
  for (const z of zones) {
    for (let i = 1; i <= 8; i++) {
      const code = `Z${z}-0${i}`;
      const loc = await prisma.location.create({
        data: {
          code,
          name: `Kệ hàng Khu ${z} - Ô ${i}`,
          description: `Khu vực kho ${z}, Kệ lưu trữ tải trọng 500kg`,
        }
      });
      locations.push(loc);
    }
  }

  // 6. Products (30 Products)
  console.log('6. Products...');
  const rawProducts = [
    { sku: 'SKU-001', name: 'Nước suối Aquafina 500ml', unit: 'chai', minStock: 100, costPrice: 3500, salePrice: 5000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-002', name: 'Nước suối Dasani 500ml', unit: 'chai', minStock: 100, costPrice: 3200, salePrice: 4500, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-003', name: 'Coca Cola lon 330ml', unit: 'lon', minStock: 150, costPrice: 7500, salePrice: 10000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-004', name: 'Pepsi lon 330ml', unit: 'lon', minStock: 150, costPrice: 7200, salePrice: 10000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-005', name: 'Bia Tiger (Thùng 24 lon)', unit: 'thùng', minStock: 50, costPrice: 320000, salePrice: 360000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-006', name: 'Bia Heineken (Thùng 24 lon)', unit: 'thùng', minStock: 40, costPrice: 400000, salePrice: 440000, categoryId: categories[0].id, supplierId: suppliers[0].id },
    { sku: 'SKU-007', name: 'Nước ép Cam Twister 1L', unit: 'chai', minStock: 30, costPrice: 18000, salePrice: 25000, categoryId: categories[0].id, supplierId: suppliers[0].id },

    { sku: 'SKU-008', name: 'Mì gói Hảo Hảo Tôm Chua Cay', unit: 'thùng', minStock: 30, costPrice: 95000, salePrice: 115000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-009', name: 'Mì Omachi Xốt Vang', unit: 'thùng', minStock: 25, costPrice: 180000, salePrice: 210000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-010', name: 'Phở bò Vifon 120g', unit: 'thùng', minStock: 20, costPrice: 150000, salePrice: 180000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-011', name: 'Gạo ST25 Ông Thọ (Túi 5kg)', unit: 'túi', minStock: 40, costPrice: 150000, salePrice: 190000, categoryId: categories[1].id, supplierId: suppliers[1].id },
    { sku: 'SKU-012', name: 'Bún khô Safoco 500g', unit: 'gói', minStock: 50, costPrice: 22000, salePrice: 29000, categoryId: categories[1].id, supplierId: suppliers[1].id },

    { sku: 'SKU-013', name: 'Nước mắm Nam Ngư 750ml', unit: 'chai', minStock: 80, costPrice: 32000, salePrice: 42000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-014', name: 'Nước mắm Chinsu Đệ Nhị 500ml', unit: 'chai', minStock: 60, costPrice: 38000, salePrice: 49000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-015', name: 'Bột ngọt Ajinomoto 1kg', unit: 'gói', minStock: 40, costPrice: 58000, salePrice: 68000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-016', name: 'Hạt nêm Knorr Nấm 400g', unit: 'gói', minStock: 50, costPrice: 34000, salePrice: 42000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-017', name: 'Dầu ăn Tường An Gold 1L', unit: 'chai', minStock: 100, costPrice: 42000, salePrice: 52000, categoryId: categories[2].id, supplierId: suppliers[3].id },
    { sku: 'SKU-018', name: 'Đường kính trắng Biên Hòa 1kg', unit: 'gói', minStock: 80, costPrice: 22000, salePrice: 28000, categoryId: categories[2].id, supplierId: suppliers[3].id },

    { sku: 'SKU-019', name: 'Cá mòi 3 Cô Gái 155g', unit: 'hộp', minStock: 60, costPrice: 12000, salePrice: 17000, categoryId: categories[3].id, supplierId: suppliers[3].id },
    { sku: 'SKU-020', name: 'Pate gan Hạ Long 170g', unit: 'hộp', minStock: 40, costPrice: 18000, salePrice: 24000, categoryId: categories[3].id, supplierId: suppliers[3].id },
    { sku: 'SKU-021', name: 'Ngô ngọt đóng hộp 400g', unit: 'hộp', minStock: 30, costPrice: 20000, salePrice: 27000, categoryId: categories[3].id, supplierId: suppliers[3].id },

    { sku: 'SKU-022', name: 'Dầu gội Clear Bạc Hà 630g', unit: 'chai', minStock: 25, costPrice: 120000, salePrice: 149000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-023', name: 'Dầu gội Sunsilk Mềm Mượt 650g', unit: 'chai', minStock: 25, costPrice: 110000, salePrice: 139000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-024', name: 'Sữa tắm Lifebuoy Bảo Vệ 850g', unit: 'chai', minStock: 30, costPrice: 140000, salePrice: 172000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-025', name: 'Nước giặt OMO Matic Bề Trên 2.8kg', unit: 'túi', minStock: 40, costPrice: 155000, salePrice: 189000, categoryId: categories[4].id, supplierId: suppliers[2].id },
    { sku: 'SKU-026', name: 'Kem đánh răng P/S Trà Xanh 230g', unit: 'hộp', minStock: 50, costPrice: 32000, salePrice: 41000, categoryId: categories[4].id, supplierId: suppliers[2].id },

    { sku: 'SKU-027', name: 'Giấy vệ sinh Bless You (Lốc 10 cuộn)', unit: 'lốc', minStock: 60, costPrice: 75000, salePrice: 98000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-028', name: 'Khăn giấy lụa Pulppy 180 tờ', unit: 'hộp', minStock: 40, costPrice: 18000, salePrice: 24000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-029', name: 'Túi rác đen tự hủy 1kg', unit: 'cuộn', minStock: 30, costPrice: 35000, salePrice: 46000, categoryId: categories[5].id, supplierId: suppliers[2].id },
    { sku: 'SKU-030', name: 'Nước rửa chén Sunlight Chanh 1.5kg', unit: 'chai', minStock: 50, costPrice: 38000, salePrice: 48000, categoryId: categories[5].id, supplierId: suppliers[2].id }
  ];

  const products = [];
  for (let idx = 0; idx < rawProducts.length; idx++) {
    const p = rawProducts[idx];
    const barcode = `893850000${(idx + 1).toString().padStart(3, '0')}`;
    const prod = await prisma.product.create({ data: { ...p, barcode, currentStock: 0 } });
    products.push(prod);
  }

  const getPastDate = (monthsAgo) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setHours(10, 0, 0);
    return d;
  };

  const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  };

  // 7. Seed Initial Import Receipts & Batches (1 initial batch per product)
  console.log('7. Imports & Stock Batches...');
  const seededBatches = [];

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const p = products[pIdx];
    const date = getPastDate(pIdx % 6);
    const supplier = suppliers[pIdx % suppliers.length];
    const location = locations[pIdx % locations.length];
    const qty = 200 + pIdx * 10;
    const expiryDate = getFutureDate(30 + pIdx * 10);
    const lotNumber = `LOT-${p.sku.replace('SKU-', '')}-${date.getFullYear()}-01`;

    const importReceipt = await prisma.importReceipt.create({
      data: {
        code: `IMP-2026-${(pIdx + 1).toString().padStart(2, '0')}`,
        supplierId: supplier.id,
        status: ReceiptStatus.APPROVED,
        note: `Nhập kho ban đầu sản phẩm ${p.name}`,
        createdById: manager.id,
        approvedById: admin.id,
        approvedAt: date,
        createdAt: date,
        updatedAt: date,
      }
    });

    const batch = await prisma.stockBatch.create({
      data: {
        productId: p.id,
        lotNumber,
        quantity: qty,
        remainingQuantity: qty,
        expiryDate,
        locationId: location.id,
        createdAt: date,
        updatedAt: date,
      }
    });
    seededBatches.push(batch);

    await prisma.importItem.create({
      data: {
        importReceiptId: importReceipt.id,
        productId: p.id,
        quantity: qty,
        unitPrice: p.costPrice,
        lotNumber,
        expiryDate,
        batchId: batch.id,
        locationId: location.id
      }
    });

    await prisma.product.update({
      where: { id: p.id },
      data: { currentStock: qty }
    });
  }

  // 8. Seed Sales Exports
  console.log('8. Sales Exports...');
  for (let m = 5; m >= 0; m--) {
    const date = getPastDate(m);
    date.setDate(15);
    const customer = customers[m % customers.length];

    const exportReceipt = await prisma.exportReceipt.create({
      data: {
        code: `EXP-2026-0${m + 1}`,
        exportType: ExportType.SALE,
        status: ReceiptStatus.APPROVED,
        note: `Đơn xuất bán cho ${customer.name}`,
        customerId: customer.id,
        createdById: employee.id,
        approvedById: manager.id,
        approvedAt: date,
        createdAt: date,
        updatedAt: date,
      }
    });

    const exportProducts = products.slice(m * 4, (m + 1) * 4 + 2);

    for (const p of exportProducts) {
      const qtyToExport = 40;
      const batch = seededBatches.find(b => b.productId === p.id && b.remainingQuantity >= qtyToExport);

      if (batch) {
        batch.remainingQuantity -= qtyToExport;
        await prisma.stockBatch.update({
          where: { id: batch.id },
          data: { remainingQuantity: { decrement: qtyToExport } }
        });

        await prisma.exportItem.create({
          data: {
            exportReceiptId: exportReceipt.id,
            productId: p.id,
            stockBatchId: batch.id,
            quantity: qtyToExport,
            unitPrice: p.salePrice,
          }
        });

        await prisma.product.update({
          where: { id: p.id },
          data: { currentStock: { decrement: qtyToExport } }
        });
      }
    }
  }

  // 9. Internal Transfers
  console.log('9. Internal Transfers...');
  for (let t = 0; t < 3; t++) {
    const fromLoc = locations[t];
    const toLoc = locations[t + 8];
    const prod = products[t];
    const batch = seededBatches[t];

    if (batch) {
      await prisma.internalTransfer.create({
        data: {
          code: `TRF-2026-0${t + 1}`,
          note: `Điều chuyển kệ kho ${fromLoc.code} sang ${toLoc.code}`,
          status: ReceiptStatus.APPROVED,
          createdById: manager.id,
          approvedById: admin.id,
          approvedAt: new Date(),
          items: {
            create: [
              {
                productId: prod.id,
                fromBatchId: batch.id,
                fromLocationId: fromLoc.id,
                toLocationId: toLoc.id,
                quantity: 10
              }
            ]
          }
        }
      });
    }
  }

  // 10. Inventory Checks
  console.log('10. Inventory Checks...');
  await prisma.inventoryCheck.create({
    data: {
      code: `CHK-2026-01`,
      status: CheckStatus.COMPLETED,
      note: 'Đối soát tồn kho định kỳ Quý 1 toàn hệ thống',
      createdById: manager.id,
      createdAt: getPastDate(1),
      items: {
        create: products.slice(0, 5).map(p => ({
          productId: p.id,
          systemQty: p.currentStock,
          actualQty: p.currentStock,
          difference: 0
        }))
      }
    }
  });

  // 11. Customer Returns
  console.log('11. Customer Returns...');
  await prisma.returnReceipt.create({
    data: {
      code: `RET-2026-01`,
      status: ReturnStatus.RETURNED_TO_STOCK,
      reason: 'Khách hàng đổi trả sản phẩm bao bì bị trầy xước trong vận chuyển',
      createdById: employee.id,
      createdAt: getPastDate(0),
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 5,
            qualityStatus: 'Bao bì mới 99% - Nhập lại kho'
          }
        ]
      }
    }
  });

  // 12. Audit Logs
  console.log('12. Audit Logs...');
  const auditLogs = [
    { action: 'LOGIN', resource: 'User', details: { message: 'Đăng nhập hệ thống thành công' } },
    { action: 'CREATE_IMPORT', resource: 'ImportReceipt', details: { message: 'Tạo mới phiếu nhập kho từ nhà cung cấp' } },
    { action: 'APPROVE_EXPORT', resource: 'ExportReceipt', details: { message: 'Duyệt phiếu xuất kho FEFO bán hàng' } },
    { action: 'TRANSFER_STOCK', resource: 'InternalTransfer', details: { message: 'Điều chuyển hàng giữa các kệ kho' } },
    { action: 'INVENTORY_CHECK', resource: 'InventoryCheck', details: { message: 'Hoàn tất kiểm kê đối soát tồn kho' } }
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: log.action,
        resource: log.resource,
        details: log.details,
        createdAt: getPastDate(0)
      }
    });
  }

  // 13. Notifications
  console.log('13. Notifications...');
  await prisma.notification.createMany({
    data: [
      { title: '⚡ Phát hiện lô hàng cận date', message: 'Lô hàng Tiger Thùng hết hạn trong 12 ngày tới. Ưu tiên xuất FEFO.', type: 'WARNING' },
      { title: '📦 Cảnh báo cạn tồn kho', message: 'Sản phẩm Coca Cola 330ml đã chạm ngưỡng tối thiểu minStock.', type: 'ERROR' },
      { title: '🎉 Đơn xuất kho đã được duyệt', message: 'Phiếu xuất EXP-2026-01 đã được Quản lý kho phê duyệt thành công.', type: 'INFO' }
    ]
  });

  console.log('🎉 SUCCESS: All 13 tables seeded with 100% matched, realistic demo data!');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
