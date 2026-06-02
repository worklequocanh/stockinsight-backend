const prisma = require('../config/prisma')
const { sendSuccess, sendError } = require('../utils/apiResponse')

// Tính toán KPI Tổng quan
exports.getDashboardKPI = async (req, res) => {
  try {
    // 1. Tổng số sản phẩm
    const totalProducts = await prisma.product.count()

    // 2. Tổng giá trị tồn kho
    const products = await prisma.product.findMany({
      select: { currentStock: true, costPrice: true }
    })
    const totalStockValue = products.reduce((sum, p) => {
      return sum + (p.currentStock * Number(p.costPrice))
    }, 0)

    // 3. Số sản phẩm tồn kho thấp
    const lowStockProducts = await prisma.product.count({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStock
        }
      }
    })

    // 4. Số lô hàng sắp hết hạn (trong vòng 30 ngày)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringBatches = await prisma.stockBatch.count({
      where: {
        remainingQuantity: { gt: 0 },
        expiryDate: { lte: thirtyDaysFromNow }
      }
    })

    sendSuccess(res, {
      totalProducts,
      totalStockValue,
      lowStockProducts,
      expiringBatches
    }, 'Lấy KPI thành công')
  } catch (err) {
    sendError(res, 'Lỗi khi lấy KPI tổng quan', 500, err.message)
  }
}

// Lấy báo cáo Nhập/Xuất theo tháng (6 tháng gần nhất)
exports.getMonthlyReport = async (req, res) => {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1) // Bắt đầu từ ngày 1 của tháng đó
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Lấy phiếu nhập (đã duyệt)
    const imports = await prisma.importReceipt.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: sixMonthsAgo } },
      include: { items: true }
    })

    // Lấy phiếu xuất (đã duyệt)
    const exports = await prisma.exportReceipt.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: sixMonthsAgo } },
      include: { items: true }
    })

    const monthlyData = {}

    // Khởi tạo các tháng
    for (let i = 0; i < 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = `${d.getMonth() + 1}/${d.getFullYear()}`
      monthlyData[label] = { month: label, importValue: 0, exportValue: 0, sortKey: d.getTime() }
    }

    // Gộp dữ liệu nhập
    imports.forEach(receipt => {
      const d = new Date(receipt.approvedAt)
      const label = `${d.getMonth() + 1}/${d.getFullYear()}`
      if (monthlyData[label]) {
        const value = receipt.items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
        monthlyData[label].importValue += value
      }
    })

    // Gộp dữ liệu xuất
    exports.forEach(receipt => {
      const d = new Date(receipt.approvedAt)
      const label = `${d.getMonth() + 1}/${d.getFullYear()}`
      if (monthlyData[label]) {
        const value = receipt.items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
        monthlyData[label].exportValue += value
      }
    })

    // Sắp xếp theo tháng tăng dần
    const result = Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey).map(d => ({
      month: d.month,
      importValue: d.importValue,
      exportValue: d.exportValue
    }))

    sendSuccess(res, result, 'Lấy báo cáo theo tháng thành công')
  } catch (err) {
    sendError(res, 'Lỗi khi lấy báo cáo theo tháng', 500, err.message)
  }
}

// Báo cáo top sản phẩm bán chạy (SALE)
exports.getTopSelling = async (req, res) => {
  try {
    const exports = await prisma.exportItem.groupBy({
      by: ['productId'],
      where: {
        exportReceipt: {
          exportType: 'SALE',
          status: 'APPROVED'
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    })

    const productIds = exports.map(e => e.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true }
    })

    const result = exports.map(e => {
      const p = products.find(prod => prod.id === e.productId)
      return {
        id: e.productId,
        name: p?.name,
        sku: p?.sku,
        totalSold: e._sum.quantity
      }
    })

    sendSuccess(res, result, 'Lấy báo cáo sản phẩm bán chạy thành công')
  } catch (err) {
    sendError(res, 'Lỗi khi lấy top sản phẩm bán chạy', 500, err.message)
  }
}

// Báo cáo chi tiết tồn kho
exports.getInventoryReport = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        supplier: true
      }
    })

    // Lấy lịch sử xuất kho trong 30 ngày qua để tính tốc độ bán trung bình
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentExports = await prisma.exportItem.groupBy({
      by: ['productId'],
      where: {
        exportReceipt: { status: 'APPROVED', approvedAt: { gte: thirtyDaysAgo } }
      },
      _sum: { quantity: true }
    })

    const result = products.map(p => {
      const exported = recentExports.find(e => e.productId === p.id)?._sum.quantity || 0
      const avgDailyExport = exported / 30
      const daysRemaining = avgDailyExport > 0 ? Math.floor(p.currentStock / avgDailyExport) : null
      const isLowStock = p.currentStock <= p.minStock
      const suggestedOrder = isLowStock ? (p.minStock * 2) - p.currentStock : 0

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        supplier: p.supplier.name,
        unit: p.unit,
        currentStock: p.currentStock,
        minStock: p.minStock,
        isLowStock,
        avgDailyExport: Number(avgDailyExport.toFixed(2)),
        daysRemaining,
        suggestedOrder
      }
    })

    sendSuccess(res, result, 'Lấy báo cáo tồn kho thành công')
  } catch (err) {
    sendError(res, 'Lỗi khi lấy báo cáo tồn kho', 500, err.message)
  }
}

// Báo cáo các lô hàng sắp hết hạn (<= 30 ngày)
exports.getExpiringBatches = async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const batches = await prisma.stockBatch.findMany({
      where: {
        remainingQuantity: { gt: 0 },
        expiryDate: { lte: thirtyDaysFromNow }
      },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      },
      orderBy: { expiryDate: 'asc' }
    })

    const result = batches.map(b => {
      const now = new Date()
      const diffTime = new Date(b.expiryDate).getTime() - now.getTime()
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let severity = 'success'
      if (daysUntilExpiry <= 7) severity = 'danger'
      else if (daysUntilExpiry <= 14) severity = 'warning'
      else severity = 'info'

      return {
        id: b.id,
        productName: b.product.name,
        productSku: b.product.sku,
        lotNumber: b.lotNumber,
        remainingQuantity: b.remainingQuantity,
        expiryDate: b.expiryDate,
        daysUntilExpiry,
        severity
      }
    })

    sendSuccess(res, result, 'Lấy lô hàng sắp hết hạn thành công')
  } catch (err) {
    sendError(res, 'Lỗi khi lấy lô hàng sắp hết hạn', 500, err.message)
  }
}
