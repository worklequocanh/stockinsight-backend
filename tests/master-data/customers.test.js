const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Customer API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo khách hàng thành công', async () => {
    const response = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'nva@test.com',
        address: 'Hà Nội',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item.name).toBe('Nguyễn Văn A');
  });

  it('nên báo lỗi 400 nếu thiếu tên khách hàng', async () => {
    const response = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        phone: '0901234567',
      });

    expect(response.status).toBe(400);
  });

  it('nên lấy danh sách khách hàng và hỗ trợ tìm kiếm', async () => {
    const response = await request(app)
      .get('/api/customers?search=VIP')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.items[0].name).toContain('VIP');
  });

  it('nên cập nhật khách hàng thành công', async () => {
    const customerId = masterData.customer.id;
    const response = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Khách hàng VIP 2',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.name).toBe('Khách hàng VIP 2');
  });

  it('nên xóa khách hàng', async () => {
    // Tạo 1 khách hàng phụ
    const tempCustomer = await prisma.customer.create({
      data: { name: 'Temp Customer' },
    });

    const response = await request(app)
      .delete(`/api/customers/${tempCustomer.id}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
