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

  it('GET /api/reports/kpi - nên lấy chỉ số dashboard thành công', async () => {
    const response = await request(app)
      .get('/api/reports/kpi')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('totalStockValue');
    expect(response.body.data).toHaveProperty('totalProducts');
  });

  it('GET /api/reports/inventory - nên lấy danh sách báo cáo tồn kho', async () => {
    const response = await request(app)
      .get('/api/reports/inventory')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('currentStock');
  });

  it('GET /api/reports/expiring - nên report đúng lô hàng sắp hết hạn', async () => {
    const response = await request(app)
      .get('/api/reports/expiring?days=30')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(response.status).toBe(200);
    const items = response.body.data;
    // Phải có ít nhất 1 lô sắp hết hạn
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].lotNumber).toBe('LOT_EXPIRING');
  });
});
