const express = require('express')
const router = express.Router()
const reportController = require('../controllers/reportController')
const { requireAuth, requireRoles } = require('../middleware/auth')

// Tất cả các báo cáo chỉ dành cho MANAGER và ADMIN
router.use(requireAuth)
router.use(requireRoles(['ADMIN', 'WAREHOUSE_MANAGER']))

router.get('/kpi', reportController.getDashboardKPI)
router.get('/monthly', reportController.getMonthlyReport)
router.get('/top-selling', reportController.getTopSelling)
router.get('/inventory', reportController.getInventoryReport)
router.get('/expiring', reportController.getExpiringBatches)

module.exports = router
