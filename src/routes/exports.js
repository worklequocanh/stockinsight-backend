const express = require('express');
const router = express.Router();
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.use(authenticate);

// GET /api/exports
/**
 * @swagger
 * /api/exports:
 *   get:
 *     tags: [Exports]
 *     summary: Get all exports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', exportController.listExports);

// GET /api/exports/:id
/**
 * @swagger
 * /api/exports/{id}:
 *   get:
 *     tags: [Exports]
 *     summary: Get export by ID
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
router.get('/:id', exportController.getExportById);

// POST /api/exports
/**
 * @swagger
 * /api/exports:
 *   post:
 *     tags: [Exports]
 *     summary: Create export
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
router.post('/', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.EMPLOYEE), exportController.createExport);

// POST /api/exports/:id/approve
/**
 * @swagger
 * /api/exports/{id}/approve:
 *   post:
 *     tags: [Exports]
 *     summary: Approve export
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
router.post('/:id/approve', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), exportController.approveExport);

// POST /api/exports/:id/reject
/**
 * @swagger
 * /api/exports/{id}/reject:
 *   post:
 *     tags: [Exports]
 *     summary: Reject export
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
router.post('/:id/reject', requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER), exportController.rejectExport);

module.exports = router;
