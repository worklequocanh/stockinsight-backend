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

  const [admin, manager, employee] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@stockinsight.local' },
      update: {},
      create: {
        name: 'Quản trị viên',
        email: 'admin@stockinsight.local',
        password,
        role: Role.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@stockinsight.local' },
      update: {},
      create: {
        name: 'Quản lý kho',
        email: 'manager@stockinsight.local',
        password,
        role: Role.WAREHOUSE_MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'employee@stockinsight.local' },
      update: {},
      create: {
        name: 'Nhân viên',
        email: 'employee@stockinsight.local',
        password,
        role: Role.EMPLOYEE,
      },
    }),
  ]);

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
  ]);

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

  await prisma.product.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: {
      sku: 'SKU-001',
      barcode: '893850123001',
      name: 'Nước suối 500ml',
      unit: 'chai',
      minStock: 20,
      costPrice: 3000,
      salePrice: 5000,
      currentStock: 120,
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-002' },
    update: {},
    create: {
      sku: 'SKU-002',
      barcode: '893850123002',
      name: 'Mì gói',
      unit: 'gói',
      minStock: 50,
      costPrice: 2500,
      salePrice: 4000,
      currentStock: 300,
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
    },
  });

  console.log('Seed completed:', {
    users: [admin.email, manager.email, employee.email],
  });
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
