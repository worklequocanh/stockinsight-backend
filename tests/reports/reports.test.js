const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Reports API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();

    // Setup dummy data cho báo cáo: Tạo một lô hàng sắp hết hạn
    await prisma.stockBatch.create({
      data: {
        productId: masterData.products[0].id,
        lotNumber: 'LOT_EXPIRING',
        // Hết hạn sau 5 ngày (Nằm trong khoảng <= 30 ngày)
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        quantity: 100,
        remainingQuantity: 100,
      },
    });
    
    await prisma.product.update({
      where: { id: masterData.products[0].id },
      data: { currentStock: 100 }
    });
  });

  it('GET /api/reports/overview - nên lấy chỉ số dashboard thành công', async () => {
    const response = await request(app)
      .get('/api/reports/overview')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('totalStockValue');
    expect(response.body.data).toHaveProperty('totalProducts');
  });

  it('GET /api/reports/low-stock - nên lấy danh sách báo cáo tồn kho thấp', async () => {
    const response = await request(app)
      .get('/api/reports/low-stock')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    // it could be empty, but it's an array
    expect(response.body.data).toHaveProperty('products');
  });

  it('GET /api/reports/export-excel - nên trả về file báo cáo Excel', async () => {
    const response = await request(app)
      .get('/api/reports/export-excel')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
