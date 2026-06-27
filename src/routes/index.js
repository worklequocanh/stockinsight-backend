const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const protectedRoutes = require('./protected');
const categoryRoutes = require('./categories');
const suppliersRouter = require('./suppliers');
const productsRouter = require('./products');
const importsRouter = require('./imports');
const exportsRouter = require('./exports');
const reportRoutes = require('./reportRoutes');
const customerRoutes = require('./customers');
const locationRoutes = require('./locations');
const inventoryCheckRoutes = require('./inventoryChecks');
const returnRoutes = require('./returns');
const auditLogRoutes = require('./auditLogs');
const userRoutes = require('./users');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', suppliersRouter);
router.use('/products', productsRouter);
router.use('/imports', importsRouter);
router.use('/exports', exportsRouter);
router.use('/reports', reportRoutes);
router.use('/customers', customerRoutes);
router.use('/locations', locationRoutes);
router.use('/inventory-checks', inventoryCheckRoutes);
router.use('/returns', returnRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
