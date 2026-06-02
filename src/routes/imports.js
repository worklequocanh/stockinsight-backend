const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listImports,
  getImportById,
  createImport,
  approveImport,
  rejectImport,
} = require('../controllers/importController');

const router = express.Router();

router.use(authenticate);

// Everyone authenticated can view imports
router.get('/', listImports);
router.get('/:id', getImportById);

// Employee/Manager/Admin can create imports
router.post('/', createImport);

// Only Manager and Admin can approve or reject imports
router.post('/:id/approve', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), approveImport);
router.post('/:id/reject', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), rejectImport);

module.exports = router;
