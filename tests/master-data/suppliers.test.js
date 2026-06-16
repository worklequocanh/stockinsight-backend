const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Supplier API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo nhà cung cấp thành công', async () => {
    const response = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Nhà cung cấp B',
        phone: '0988111222',
        email: 'nccB@test.com',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item.name).toBe('Nhà cung cấp B');
  });

  it('nên báo lỗi 400 nếu thiếu tên nhà cung cấp', async () => {
    const response = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('nên lấy danh sách nhà cung cấp', async () => {
    const response = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it('nên cập nhật nhà cung cấp', async () => {
    const supplierId = masterData.supplier.id;
    const response = await request(app)
      .put(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'NCC A Updated',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.name).toBe('NCC A Updated');
  });

  it('không cho phép xóa nhà cung cấp đã liên kết sản phẩm', async () => {
    const supplierId = masterData.supplier.id; // Đã liên kết với product trong masterData
    const response = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('linked to other data');
  });
});
