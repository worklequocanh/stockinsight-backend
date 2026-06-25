const prisma = require('../../src/config/prisma');

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  const tableNames = [
    'AuditLog', 'ReturnItem', 'ReturnReceipt', 'InventoryCheckItem', 
    'InventoryCheck', 'Location', 'ExportItem', 'ExportReceipt', 
    'ImportItem', 'StockBatch', 'ImportReceipt', 'Product', 
    'Category', 'Supplier', 'User', 'Customer'
  ];

  for (const tableName of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    } catch (error) {
      // Ignore if table doesn't exist yet
    }
  }
});
