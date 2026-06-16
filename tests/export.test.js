const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { setupMasterData } = require('./helpers');

describe('Export API - FEFO Logic', () => {
  let masterData;

  beforeEach(async () => {
    masterData = await setupMasterData();
    const product1 = masterData.products[0];

    // Tạo sẵn 2 lô hàng (StockBatch) để test FEFO
    // Lô A: Hết hạn sau 10 ngày (Sẽ bị xuất trước)
    await prisma.stockBatch.create({
      data: {
        productId: product1.id,
        lotNumber: 'LOTA',
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        quantity: 50,
        remainingQuantity: 50,
      },
    });

    // Lô B: Hết hạn sau 30 ngày (Xuất sau)
    await prisma.stockBatch.create({
      data: {
        productId: product1.id,
        lotNumber: 'LOTB',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        quantity: 100,
        remainingQuantity: 100,
      },
    });

    // Cập nhật tổng tồn kho cho product1
    await prisma.product.update({
      where: { id: product1.id },
      data: { currentStock: 150 },
    });
  });

  it('nên xuất hàng FEFO cơ bản: trừ vào lô cận date trước (LOTA)', async () => {
    const product1 = masterData.products[0];

    const response = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        exportType: 'TRANSFER',
        items: [
          {
            productId: product1.id,
            quantity: 20,
            unitPrice: 50000,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const receiptId = response.body.data.id;
    await request(app)
      .post(`/api/exports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    // Kiểm tra số lượng tồn của LOTA phải còn 30, LOTB còn nguyên 100
    const lotA = await prisma.stockBatch.findFirst({ where: { lotNumber: 'LOTA' } });
    const lotB = await prisma.stockBatch.findFirst({ where: { lotNumber: 'LOTB' } });

    expect(lotA.remainingQuantity).toBe(30);
    expect(lotB.remainingQuantity).toBe(100);

    // Kiểm tra tổng tồn kho giảm 20
    const updatedProduct = await prisma.product.findUnique({ where: { id: product1.id } });
    expect(updatedProduct.currentStock).toBe(130);
  });

  it('nên xuất vượt lô: trừ hết LOTA và trừ phần còn lại ở LOTB', async () => {
    const product1 = masterData.products[0];

    const response = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        exportType: 'TRANSFER',
        items: [
          {
            productId: product1.id,
            quantity: 80, // Vượt LOTA (50), cần trừ thêm 30 ở LOTB
            unitPrice: 50000,
          },
        ],
      });

    expect(response.status).toBe(201);

    const receiptId = response.body.data.id;
    await request(app)
      .post(`/api/exports/${receiptId}/approve`)
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`);

    const lotA = await prisma.stockBatch.findFirst({ where: { lotNumber: 'LOTA' } });
    const lotB = await prisma.stockBatch.findFirst({ where: { lotNumber: 'LOTB' } });

    expect(lotA.remainingQuantity).toBe(0);
    expect(lotB.remainingQuantity).toBe(70);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product1.id } });
    expect(updatedProduct.currentStock).toBe(70);
  });

  it('nên báo lỗi 400 nếu yêu cầu xuất vượt giới hạn tổng tồn kho', async () => {
    const product1 = masterData.products[0];

    const response = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        exportType: 'TRANSFER',
        items: [
          {
            productId: product1.id,
            quantity: 200, // Tổng chỉ có 150
            unitPrice: 50000,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('không đủ tồn kho');
  });

  it('nên yêu cầu customerId và liên kết đúng khi loại xuất là SALE', async () => {
    const product1 = masterData.products[0];

    // Thiếu customerId
    const failRes = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        exportType: 'SALE',
        items: [{ productId: product1.id, quantity: 10, unitPrice: 50000 }],
      });
    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toBe('Vui lòng chọn khách hàng khi xuất bán');

    // Có customerId hợp lệ
    const successRes = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${masterData.tokens.managerToken}`)
      .send({
        exportType: 'SALE',
        customerId: masterData.customer.id,
        items: [{ productId: product1.id, quantity: 10, unitPrice: 50000 }],
      });
    expect(successRes.status).toBe(201);
    
    const receipt = await prisma.exportReceipt.findUnique({
      where: { id: successRes.body.data.id },
    });
    expect(receipt.customerId).toBe(masterData.customer.id);
  });
});
