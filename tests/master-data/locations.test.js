const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Location API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo vị trí kho thành công', async () => {
    const response = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        code: 'B1',
        name: 'Kệ B1',
        description: 'Zone B',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item.code).toBe('B1');
  });

  it('nên báo lỗi 400 nếu thiếu mã code hoặc name', async () => {
    const response = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        name: 'Kệ C1',
      });

    expect(response.status).toBe(400);
  });

  it('nên lấy danh sách vị trí lưu kho', async () => {
    const response = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it('nên cập nhật vị trí kho thành công', async () => {
    const locationId = masterData.location.id;
    const response = await request(app)
      .put(`/api/locations/${locationId}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        code: 'A1-UPDATED',
        name: 'Kệ A1 Updated',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.item.code).toBe('A1-UPDATED');
  });

  it('nên xóa vị trí kho', async () => {
    // Tạo vị trí kho phụ
    const tempLoc = await prisma.location.create({
      data: { code: 'TEMP1', name: 'Temp Loc' },
    });

    const response = await request(app)
      .delete(`/api/locations/${tempLoc.id}`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
