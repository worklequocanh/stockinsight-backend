const express = require('express');
const { authenticate, requireRoles } = require('../middleware/auth');
const { Role } = require('@prisma/client');
const {
  getAnyAccess,
  getAdminAccess,
  getWarehouseAccess,
  getEmployeeAccess,
} = require('../controllers/protectedController');

const router = express.Router();

router.get('/auth', authenticate, getAnyAccess);
router.get('/admin', authenticate, requireRoles(Role.ADMIN), getAdminAccess);
router.get(
  '/warehouse',
  authenticate,
  requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER),
  getWarehouseAccess,
);
router.get(
  '/employee',
  authenticate,
  requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.EMPLOYEE),
  getEmployeeAccess,
);

module.exports = router;
