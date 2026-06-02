const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const protectedRoutes = require('./protected');
const categoryRoutes = require('./categories');
const supplierRoutes = require('./suppliers');
const productRoutes = require('./products');
const importRoutes = require('./imports');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/imports', importRoutes);

module.exports = router;
