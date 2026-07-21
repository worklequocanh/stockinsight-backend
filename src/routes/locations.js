const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} = require('../controllers/locationController');

const router = express.Router();
router.use(authenticate);
const managerAuth = requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER);

/**
 * @swagger
 * /api/locations:
 *   get:
 *     tags: [Locations]
 *     summary: Get all warehouse locations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', listLocations);
/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     tags: [Locations]
 *     summary: Get location by ID
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
router.get('/:id', getLocationById);
/**
 * @swagger
 * /api/locations:
 *   post:
 *     tags: [Locations]
 *     summary: Create location
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', managerAuth, createLocation);
/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     tags: [Locations]
 *     summary: Update location
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
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/:id', managerAuth, updateLocation);
/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     tags: [Locations]
 *     summary: Delete location
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
router.delete('/:id', managerAuth, deleteLocation);

module.exports = router;
