const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRoles('ADMIN', 'WAREHOUSE_MANAGER'));

router.get('/overview', reportController.getOverview);
router.get('/recent-activities', reportController.getRecentActivities);
router.get('/low-stock', reportController.getLowStockProducts);
router.get('/monthly', reportController.getMonthlyData);
router.get('/top-selling', reportController.getTopSelling);
router.get('/export-excel', reportController.exportExcel);
router.get('/inventory', reportController.getInventoryReport);
router.get('/expiring', reportController.getExpiringReport);

module.exports = router;
