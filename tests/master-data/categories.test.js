const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Category API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo danh mục thành công', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`)
      .send({
        name: 'Đồ gia dụng',
        description: 'Các sản phẩm đồ gia dụng',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item.name).toBe('Đồ gia dụng');
  });

  it('nên báo lỗi 400 nếu thiếu tên danh mục', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('nên lấy danh sách danh mục', async () => {
    const response = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it('nên cập nhật danh mục thành công', async () => {
    const categoryId = masterData.category.id;
    const response = await request(app)
      .put(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`)
      .send({
        name: 'Thực phẩm khô',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.name).toBe('Thực phẩm khô');
  });

  it('không cho phép xóa danh mục đã liên kết với sản phẩm', async () => {
    const categoryId = masterData.category.id; // Lỗi P2003 vì đã liên kết với masterData.products
    const response = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Cannot delete or update record because it is linked to other data');
  });

  it('cho phép xóa danh mục chưa liên kết với dữ liệu nào', async () => {
    // Tạo danh mục trống
    const emptyCat = await prisma.category.create({
      data: { name: 'Empty Category' },
    });

    const response = await request(app)
      .delete(`/api/categories/${emptyCat.id}`)
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
