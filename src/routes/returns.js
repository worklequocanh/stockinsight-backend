const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listReturns,
  getReturnById,
  createReturn,
  processReturn,
} = require('../controllers/returnController');

const router = express.Router();

router.use(authenticate, requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER));

/**
 * @swagger
 * /api/returns:
 *   get:
 *     tags: [Returns]
 *     summary: Lấy danh sách phiếu trả hàng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', listReturns);

/**
 * @swagger
 * /api/returns/{id}:
 *   get:
 *     tags: [Returns]
 *     summary: Lấy chi tiết phiếu trả hàng
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
router.get('/:id', getReturnById);

/**
 * @swagger
 * /api/returns:
 *   post:
 *     tags: [Returns]
 *     summary: Tạo phiếu trả hàng
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalExportId:
 *                 type: string
 *               reason:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     qualityStatus:
 *                       type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', createReturn);

/**
 * @swagger
 * /api/returns/{id}/process:
 *   put:
 *     tags: [Returns]
 *     summary: Xử lý phiếu trả hàng (Nhập lại kho hoặc Hủy)
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
 *               action:
 *                 type: string
 *                 enum: [RETURNED_TO_STOCK, DISCARDED]
 *               batchDetails:
 *                 type: object
 *                 description: Cung cấp LotNumber và ExpiryDate cho từng product nếu nhập lại kho
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/:id/process', processReturn);

module.exports = router;
