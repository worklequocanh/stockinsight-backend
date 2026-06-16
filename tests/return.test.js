const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { setupMasterData } = require('./helpers');

describe('Returns API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
    const product1 = masterData.products[0];

    await prisma.product.update({
      where: { id: product1.id },
      data: { currentStock: 0 },
    });
  });

  it('nên giữ nguyên tồn kho nếu hàng hoàn trả bị xử lý xuất hủy (DISCARDED)', async () => {
    const product1 = masterData.products[0];

    const createRes = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        reason: 'Hàng bị móp méo',
        items: [
          { productId: product1.id, quantity: 5, qualityStatus: 'Hư hỏng' }
        ]
      });

    const receiptId = createRes.body.data.item.id;

    const processRes = await request(app)
      .put(`/api/returns/${receiptId}/process`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({ action: 'DISCARDED' });

    expect(processRes.status).toBe(200);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product1.id } });
    expect(updatedProduct.currentStock).toBe(0); // Không tăng
  });

  it('nên tăng tồn kho và sinh lô mới (StockBatch) nếu nhập lại kho (RETURNED_TO_STOCK)', async () => {
    const product1 = masterData.products[0];

    const createRes = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        reason: 'Khách đổi ý',
        items: [
          { productId: product1.id, quantity: 10, qualityStatus: 'Còn mới nguyên seal' }
        ]
      });

    const receiptId = createRes.body.data.item.id;

    const processRes = await request(app)
      .put(`/api/returns/${receiptId}/process`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({ action: 'RETURNED_TO_STOCK' });

    expect(processRes.status).toBe(200);

    // Kiểm tra Product stock
    const updatedProduct = await prisma.product.findUnique({ where: { id: product1.id } });
    expect(updatedProduct.currentStock).toBe(10); // Đã tăng 10

    // Kiểm tra Batch sinh ra
    const batches = await prisma.stockBatch.findMany({ where: { productId: product1.id } });
    expect(batches.length).toBe(1);
    expect(batches[0].remainingQuantity).toBe(10);
    expect(batches[0].lotNumber).toContain('RET-');
  });
});
