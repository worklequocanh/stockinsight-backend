const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const { setupMasterData } = require('../utils/helpers');

describe('Inventory Check API', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
    const product1 = masterData.products[0];

    // Tạo sẵn 1 lô hàng (StockBatch) để test kiểm kê
    await prisma.stockBatch.create({
      data: {
        productId: product1.id,
        lotNumber: 'LOT-INV',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        quantity: 100,
        remainingQuantity: 100,
      },
    });

    await prisma.product.update({
      where: { id: product1.id },
      data: { currentStock: 100 },
    });
  });

  it('nên tạo snapshot hệ thống chính xác', async () => {
    const product1 = masterData.products[0];

    const response = await request(app)
      .post('/api/inventory-checks')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        productIds: [product1.id],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.item.status).toBe('DRAFT');

    const items = await prisma.inventoryCheckItem.findMany({
      where: { inventoryCheckId: response.body.data.item.id },
    });

    expect(items.length).toBe(1);
    expect(items[0].systemQty).toBe(100);
    expect(items[0].actualQty).toBeNull();
  });

  it('nên tự động cân bằng hệ thống (bù/trừ) khi chốt kiểm kê', async () => {
    const product1 = masterData.products[0];

    // 1. Tạo snapshot
    const createRes = await request(app)
      .post('/api/inventory-checks')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({ productIds: [product1.id] });
    
    const checkId = createRes.body.data.item.id;
    const checkItem = await prisma.inventoryCheckItem.findFirst({ where: { inventoryCheckId: checkId } });

    // 2. Nhập số đếm (Thực tế chỉ có 90, mất 10)
    await request(app)
      .put(`/api/inventory-checks/${checkId}/items`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        items: [{ id: checkItem.id, actualQty: 90 }]
      });

    // 3. Chốt kiểm kê
    const approveRes = await request(app)
      .put(`/api/inventory-checks/${checkId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    expect(approveRes.status).toBe(200);

    // 4. Kiểm tra StockBatch và Product bị trừ 10
    const updatedBatch = await prisma.stockBatch.findUnique({ where: { id: checkItem.stockBatchId } });
    expect(updatedBatch.remainingQuantity).toBe(90);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product1.id } });
    expect(updatedProduct.currentStock).toBe(90);
  });
});
