const request = require('supertest');
const app = require('../../src/app');
const { setupMasterData } = require('../utils/helpers');

describe('AuditLogs API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên cho phép ADMIN truy cập /api/audit-logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('meta');
  });

  it('nên chặn WAREHOUSE_MANAGER truy cập /api/audit-logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(res.status).toBe(403);
  });

  it('nên ghi audit log khi duyệt phiếu nhập', async () => {
    const product1 = masterData.products[0];

    // Tạo phiếu nhập
    const createRes = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        supplierId: masterData.supplier.id,
        items: [
          {
            productId: product1.id,
            quantity: 20,
            unitPrice: 40000,
            lotNumber: 'LOT-AUDIT-01',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });

    const receiptId = createRes.body.data.item.id;

    // Duyệt phiếu nhập
    await request(app)
      .post(`/api/imports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    // Admin kiểm tra audit log
    const auditRes = await request(app)
      .get('/api/audit-logs?action=APPROVE_IMPORT')
      .set('Authorization', `Bearer ${masterData.tokens.adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data.items[0].action).toBe('APPROVE_IMPORT');
    expect(auditRes.body.data.items[0].resource).toBe('ImportReceipt');
    expect(auditRes.body.data.items[0].resourceId).toBe(receiptId);
  });
});
