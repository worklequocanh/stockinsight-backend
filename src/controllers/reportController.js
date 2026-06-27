const prisma = require('../config/prisma');
const { catchAsync } = require('../utils/errorHandler');

exports.getOverview = catchAsync(async (req, res) => {
  // Total Products
  const totalProducts = await prisma.product.count();

  // Total Categories
  const totalCategories = await prisma.category.count();

  // Total Suppliers
  const totalSuppliers = await prisma.supplier.count();

  // Low stock products
  const lowStockResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product" WHERE "currentStock" <= "minStock"`;
  const lowStockCount = Number(lowStockResult[0].count);

  // Expiring Batches (in next 30 days)
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);
  const expiringBatchesCount = await prisma.stockBatch.count({
    where: {
      expiryDate: { lte: next30Days },
      remainingQuantity: { gt: 0 }
    }
  });

  // Total Inventory Value
  const products = await prisma.product.findMany({
    select: { currentStock: true, costPrice: true }
  });
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.currentStock * Number(p.costPrice)), 0);

  // Pending Receipts
  const pendingImports = await prisma.importReceipt.count({ where: { status: 'PENDING' } });
  const pendingExports = await prisma.exportReceipt.count({ where: { status: 'PENDING' } });

  res.status(200).json({
    status: 'success',
    data: {
      totalProducts,
      totalCategories,
      totalSuppliers,
      lowStockProducts: lowStockCount,
      totalStockValue: totalInventoryValue,
      expiringBatches: expiringBatchesCount,
      pendingImports,
      pendingExports
    }
  });
});

exports.getRecentActivities = catchAsync(async (req, res) => {
  const recentImports = await prisma.importReceipt.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { supplier: { select: { name: true } }, createdBy: { select: { name: true } } }
  });

  const recentExports = await prisma.exportReceipt.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } }
  });

  let activities = [
    ...recentImports.map(item => ({ ...item, type: 'IMPORT' })),
    ...recentExports.map(item => ({ ...item, type: 'EXPORT' }))
  ];
  
  activities.sort((a, b) => b.createdAt - a.createdAt);
  activities = activities.slice(0, 10);

  res.status(200).json({ status: 'success', data: { activities } });
});

exports.getLowStockProducts = catchAsync(async (req, res) => {
  const lowStockProducts = await prisma.$queryRaw`
    SELECT id, sku, name, unit, "minStock", "currentStock"
    FROM "Product"
    WHERE "currentStock" <= "minStock"
    ORDER BY "currentStock" ASC
  `;
  res.status(200).json({ status: 'success', data: { products: lowStockProducts } });
});

exports.getMonthlyData = catchAsync(async (req, res) => {
  // Generate last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      month: `${d.getMonth() + 1}/${d.getFullYear()}`,
      importValue: 0,
      exportValue: 0,
      year: d.getFullYear(),
      m: d.getMonth()
    });
  }

  // Get data for these months (Approximation)
  // To keep it simple without complex SQL, we'll fetch all approved receipts and aggregate in JS 
  // (Assuming data is not too huge for a demo, otherwise raw SQL GROUP BY is better)
  
  const imports = await prisma.importItem.findMany({
    where: { importReceipt: { status: 'APPROVED' } },
    include: { importReceipt: true }
  });
  
  const exports = await prisma.exportItem.findMany({
    where: { exportReceipt: { status: 'APPROVED' } },
    include: { exportReceipt: true }
  });

  imports.forEach(item => {
    const d = new Date(item.importReceipt.approvedAt || item.importReceipt.createdAt);
    const mStr = `${d.getMonth() + 1}/${d.getFullYear()}`;
    const mObj = months.find(m => m.month === mStr);
    if (mObj) {
      mObj.importValue += item.quantity * Number(item.unitPrice);
    }
  });

  exports.forEach(item => {
    const d = new Date(item.exportReceipt.approvedAt || item.exportReceipt.createdAt);
    const mStr = `${d.getMonth() + 1}/${d.getFullYear()}`;
    const mObj = months.find(m => m.month === mStr);
    if (mObj) {
      mObj.exportValue += item.quantity * Number(item.unitPrice);
    }
  });

  res.status(200).json({ status: 'success', data: months });
});

exports.getTopSelling = catchAsync(async (req, res) => {
  // Aggregate export items
  const exports = await prisma.exportItem.findMany({
    where: { exportReceipt: { status: 'APPROVED' } },
    include: { product: true }
  });

  const salesMap = {};
  exports.forEach(item => {
    if (!salesMap[item.productId]) {
      salesMap[item.productId] = {
        id: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        totalSold: 0
      };
    }
    salesMap[item.productId].totalSold += item.quantity;
  });

  let topSelling = Object.values(salesMap);
  topSelling.sort((a, b) => b.totalSold - a.totalSold);
  topSelling = topSelling.slice(0, 5);

  res.status(200).json({ status: 'success', data: topSelling });
});

const ExcelJS = require('exceljs');

exports.exportExcel = catchAsync(async (req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo tồn kho');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Tên Sản Phẩm', key: 'name', width: 40 },
    { header: 'Danh mục', key: 'category', width: 30 },
    { header: 'Đơn vị', key: 'unit', width: 15 },
    { header: 'Tồn Kho', key: 'stock', width: 15 },
    { header: 'Tồn Tối Thiểu', key: 'minStock', width: 20 },
    { header: 'Trạng thái', key: 'status', width: 20 }
  ];

  products.forEach(p => {
    worksheet.addRow({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      unit: p.unit,
      stock: p.currentStock,
      minStock: p.minStock,
      status: p.currentStock <= p.minStock ? 'Tồn thấp' : 'Bình thường'
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + 'Bao_Cao_Ton_Kho.xlsx'
  );

  await workbook.xlsx.write(res);
  res.status(200).end();
});

exports.getInventoryReport = catchAsync(async (req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true, supplier: true }
  });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const exportsList = await prisma.exportItem.findMany({
    where: { 
      exportReceipt: { 
        status: 'APPROVED',
        createdAt: { gte: thirtyDaysAgo } 
      }
    }
  });

  const exportMap = {};
  exportsList.forEach(item => {
    exportMap[item.productId] = (exportMap[item.productId] || 0) + item.quantity;
  });

  const data = products.map(p => {
    const exportedLast30 = exportMap[p.id] || 0;
    const avgDailyExport = Math.round((exportedLast30 / 30) * 10) / 10;
    const daysRemaining = avgDailyExport > 0 ? Math.floor(p.currentStock / avgDailyExport) : null;
    const isLowStock = p.currentStock <= p.minStock;
    const suggestedOrder = isLowStock ? Math.max(0, p.minStock * 2 - p.currentStock) : 0;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category ? p.category.name : '-',
      supplier: p.supplier ? p.supplier.name : '-',
      currentStock: p.currentStock,
      unit: p.unit,
      minStock: p.minStock,
      avgDailyExport,
      daysRemaining,
      isLowStock,
      suggestedOrder
    };
  });

  res.status(200).json({ status: 'success', data });
});

exports.getExpiringReport = catchAsync(async (req, res) => {
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);

  const expiringBatches = await prisma.stockBatch.findMany({
    where: {
      expiryDate: { lte: next30Days },
      remainingQuantity: { gt: 0 }
    },
    include: { product: true },
    orderBy: { expiryDate: 'asc' }
  });

  const data = expiringBatches.map(batch => {
    const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    let severity = 'approved';
    if (daysUntilExpiry <= 7) severity = 'danger';
    else if (daysUntilExpiry <= 15) severity = 'warning';

    return {
      id: batch.id,
      productName: batch.product.name,
      productSku: batch.product.sku,
      lotNumber: batch.lotNumber,
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
      daysUntilExpiry,
      severity
    };
  });

  res.status(200).json({ status: 'success', data });
});
