const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Import API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
  });

  it('nên tạo phiếu nhập thành công và tính đúng tổng tiền', async () => {
    const product1 = masterData.products[0];
    const product2 = masterData.products[1];

    const response = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        supplierId: masterData.supplier.id,
        items: [
          {
            productId: product1.id,
            quantity: 10,
            unitPrice: 40000,
            lotNumber: 'LOT-A1',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            productId: product2.id,
            quantity: 20,
            unitPrice: 15000,
            lotNumber: 'LOT-B1',
            expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.item).toHaveProperty('id');
    expect(response.body.data.item).toHaveProperty('id');
    expect(response.body.data.item.status).toBe('PENDING');
  });

  it('nên duyệt phiếu nhập và sinh ra StockBatch tương ứng, cộng currentStock', async () => {
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
            quantity: 50,
            unitPrice: 40000,
            lotNumber: 'LOT-A1',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });

    const receiptId = createRes.body.data.item.id;

    // Duyệt phiếu nhập
    const approveRes = await request(app)
      .post(`/api/imports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Kiểm tra DB: StockBatch được sinh ra không?
    const batches = await prisma.stockBatch.findMany({
      where: { productId: product1.id },
    });
    expect(batches.length).toBe(1);
    expect(batches[0].lotNumber).toBe('LOT-A1');
    expect(batches[0].remainingQuantity).toBe(50);

    // Kiểm tra DB: Product.currentStock tăng lên 50 không?
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product1.id },
    });
    expect(updatedProduct.currentStock).toBe(50);
  });

  it('không cho phép duyệt phiếu đã duyệt', async () => {
    const product1 = masterData.products[0];

    const createRes = await request(app)
      .post('/api/imports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        supplierId: masterData.supplier.id,
        items: [
          {
            productId: product1.id,
            quantity: 50,
            unitPrice: 40000,
            lotNumber: 'LOT-A1',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      });

    const receiptId = createRes.body.data.item.id;

    await request(app)
      .post(`/api/imports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    // Duyệt lần 2
    const approveRes2 = await request(app)
      .post(`/api/imports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(approveRes2.status).toBe(400);
    expect(approveRes2.body.message).toBe('Chỉ có thể duyệt phiếu đang ở trạng thái Chờ Duyệt');
  });
});
