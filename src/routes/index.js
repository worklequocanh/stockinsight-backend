const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const protectedRoutes = require('./protected');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);

module.exports = router;
