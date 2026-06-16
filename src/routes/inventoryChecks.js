const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listChecks,
  getCheckById,
  createCheck,
  updateCheckItems,
  approveCheck,
  cancelCheck,
} = require('../controllers/inventoryCheckController');

const router = express.Router();

// Tất cả các route kiểm kê đều yêu cầu quyền ADMIN hoặc WAREHOUSE_MANAGER
router.use(authenticate, requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER));

/**
 * @swagger
 * /api/inventory-checks:
 *   get:
 *     tags: [Inventory Checks]
 *     summary: Lấy danh sách phiếu kiểm kê
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', listChecks);

/**
 * @swagger
 * /api/inventory-checks/{id}:
 *   get:
 *     tags: [Inventory Checks]
 *     summary: Lấy chi tiết phiếu kiểm kê
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
router.get('/:id', getCheckById);

/**
 * @swagger
 * /api/inventory-checks:
 *   post:
 *     tags: [Inventory Checks]
 *     summary: Tạo phiếu kiểm kê mới (Chụp snapshot hệ thống)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách ID sản phẩm cần kiểm kê (Để trống để kiểm kê toàn bộ)
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', createCheck);

/**
 * @swagger
 * /api/inventory-checks/{id}/items:
 *   put:
 *     tags: [Inventory Checks]
 *     summary: Cập nhật số lượng thực tế đếm được
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID của InventoryCheckItem
 *                     actualQty:
 *                       type: number
 *                       description: Số lượng thực tế
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/:id/items', updateCheckItems);

/**
 * @swagger
 * /api/inventory-checks/{id}/approve:
 *   put:
 *     tags: [Inventory Checks]
 *     summary: Chốt phiếu kiểm kê và cân bằng lại kho hệ thống
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
router.put('/:id/approve', approveCheck);

/**
 * @swagger
 * /api/inventory-checks/{id}/cancel:
 *   put:
 *     tags: [Inventory Checks]
 *     summary: Hủy phiếu kiểm kê
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
router.put('/:id/cancel', cancelCheck);

module.exports = router;
