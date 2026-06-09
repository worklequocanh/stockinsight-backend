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

/**
 * @swagger
 * /api/protected/auth:
 *   get:
 *     tags: [Protected]
 *     summary: Test any authenticated access
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/auth', authenticate, getAnyAccess);
/**
 * @swagger
 * /api/protected/admin:
 *   get:
 *     tags: [Protected]
 *     summary: Test admin access
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/admin', authenticate, requireRoles(Role.ADMIN), getAdminAccess);
/**
 * @swagger
 * /api/protected/warehouse:
 *   get:
 *     tags: [Protected]
 *     summary: Test warehouse access
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  '/warehouse',
  authenticate,
  requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER),
  getWarehouseAccess,
);
/**
 * @swagger
 * /api/protected/employee:
 *   get:
 *     tags: [Protected]
 *     summary: Test employee access
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  '/employee',
  authenticate,
  requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.EMPLOYEE),
  getEmployeeAccess,
);

module.exports = router;
