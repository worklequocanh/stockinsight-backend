const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const { signAccessToken } = require('../../src/utils/jwt');

async function setupMasterData() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Warehouse Manager',
      email: 'manager@test.com',
      password: hashedPassword,
      role: 'WAREHOUSE_MANAGER',
    },
  });

  // 2. Tokens
  const adminToken = signAccessToken({ sub: admin.id, role: admin.role, email: admin.email });
  const managerToken = signAccessToken({ sub: manager.id, role: manager.role, email: manager.email });

  // 3. Create Basic Master Data
  const category = await prisma.category.create({
    data: { name: 'Thực phẩm', description: 'Hàng thực phẩm' },
  });

  const supplier = await prisma.supplier.create({
    data: { name: 'NCC A', phone: '0123456789' },
  });

  const customer = await prisma.customer.create({
    data: { name: 'Khách hàng VIP', phone: '0987654321', email: 'vip@test.com' },
  });

  const location = await prisma.location.create({
    data: { code: 'A1', name: 'Kệ A1', description: 'Zone A' },
  });

  // 4. Create Product
  const product = await prisma.product.create({
    data: {
      name: 'Bánh Quy',
      sku: 'SP001',
      costPrice: 40000,
      salePrice: 50000,
      categoryId: category.id,
      supplierId: supplier.id,
      unit: 'Hộp',
      currentStock: 0,
      minStock: 10,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Sữa tươi',
      sku: 'SP002',
      costPrice: 15000,
      salePrice: 20000,
      categoryId: category.id,
      supplierId: supplier.id,
      unit: 'Thùng',
      currentStock: 0,
      minStock: 5,
    },
  });

  return {
    users: { admin, manager },
    tokens: { adminToken, managerToken },
    category,
    supplier,
    customer,
    location,
    products: [product, product2],
  };
}

module.exports = {
  setupMasterData,
};
