const express = require('express');
const router = express.Router();
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.use(authenticate);

// GET /api/exports
router.get('/', exportController.listExports);

// GET /api/exports/:id
router.get('/:id', exportController.getExportById);

// POST /api/exports
router.post('/', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.EMPLOYEE), exportController.createExport);

// POST /api/exports/:id/approve
router.post('/:id/approve', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), exportController.approveExport);

// POST /api/exports/:id/reject
router.post('/:id/reject', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), exportController.rejectExport);

module.exports = router;
