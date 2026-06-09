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
/**
 * @swagger
 * /api/imports:
 *   get:
 *     tags: [Imports]
 *     summary: Get all imports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', listImports);
/**
 * @swagger
 * /api/imports/{id}:
 *   get:
 *     tags: [Imports]
 *     summary: Get import by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id', getImportById);

// Employee/Manager/Admin can create imports
/**
 * @swagger
 * /api/imports:
 *   post:
 *     tags: [Imports]
 *     summary: Create import
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', createImport);

// Only Manager and Admin can approve or reject imports
/**
 * @swagger
 * /api/imports/{id}/approve:
 *   post:
 *     tags: [Imports]
 *     summary: Approve import
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/approve', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), approveImport);
/**
 * @swagger
 * /api/imports/{id}/reject:
 *   post:
 *     tags: [Imports]
 *     summary: Reject import
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/reject', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), rejectImport);

module.exports = router;
