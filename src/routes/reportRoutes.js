const express = require('express')
const router = express.Router()
const reportController = require('../controllers/reportController')
const { authenticate, requireRoles } = require('../middleware/auth')

// Tất cả các báo cáo chỉ dành cho MANAGER và ADMIN
router.use(authenticate)
router.use(requireRoles('ADMIN', 'WAREHOUSE_MANAGER'))

/**
 * @swagger
 * /api/reports/kpi:
 *   get:
 *     tags: [Reports]
 *     summary: Get dashboard KPI
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/kpi', reportController.getDashboardKPI);
/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     tags: [Reports]
 *     summary: Get monthly report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/monthly', reportController.getMonthlyReport);
/**
 * @swagger
 * /api/reports/top-selling:
 *   get:
 *     tags: [Reports]
 *     summary: Get top selling products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/top-selling', reportController.getTopSelling);
/**
 * @swagger
 * /api/reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Get inventory report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/inventory', reportController.getInventoryReport);
/**
 * @swagger
 * /api/reports/expiring:
 *   get:
 *     tags: [Reports]
 *     summary: Get expiring batches report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/expiring', reportController.getExpiringBatches);

module.exports = router
