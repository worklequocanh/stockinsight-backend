const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.use(auth);

// GET /api/exports
router.get('/', exportController.listExports);

// GET /api/exports/:id
router.get('/:id', exportController.getExportById);

// POST /api/exports
router.post('/', requireRole('ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE'), exportController.createExport);

// POST /api/exports/:id/approve
router.post('/:id/approve', requireRole('ADMIN', 'WAREHOUSE_MANAGER'), exportController.approveExport);

// POST /api/exports/:id/reject
router.post('/:id/reject', requireRole('ADMIN', 'WAREHOUSE_MANAGER'), exportController.rejectExport);

module.exports = router;
