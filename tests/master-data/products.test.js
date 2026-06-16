const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Product API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo sản phẩm thành công', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Sản phẩm mới',
        sku: 'SP_NEW',
        unit: 'Hộp',
        costPrice: 10000,
        salePrice: 15000,
        categoryId: masterData.category.id,
        supplierId: masterData.supplier.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item.name).toBe('Sản phẩm mới');
  });

  it('nên báo lỗi 400 nếu thiếu costPrice hoặc salePrice', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Sản phẩm lỗi',
        sku: 'SP_ERR',
        categoryId: masterData.category.id,
        supplierId: masterData.supplier.id,
      });

    expect(response.status).toBe(400);
  });

  it('nên lấy danh sách sản phẩm và phân trang', async () => {
    const response = await request(app)
      .get('/api/products?page=1&limit=10')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('nên cập nhật sản phẩm thành công', async () => {
    const productId = masterData.products[0].id;
    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Tên sản phẩm đã đổi',
        sku: 'SP001',
        unit: 'Hộp',
        costPrice: 40000,
        salePrice: 60000,
        categoryId: masterData.category.id,
        supplierId: masterData.supplier.id,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.name).toBe('Tên sản phẩm đã đổi');
  });

  it('nên xóa sản phẩm', async () => {
    // Tạo sản phẩm rác để xóa (chưa liên kết với Inventory, Import)
    const tempProduct = await prisma.product.create({
      data: {
        name: 'Temp Product',
        sku: 'TEMP',
        costPrice: 1,
        salePrice: 2,
        unit: 'Hộp',
        categoryId: masterData.category.id,
        supplierId: masterData.supplier.id,
      },
    });

    const response = await request(app)
      .delete(`/api/products/${tempProduct.id}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
