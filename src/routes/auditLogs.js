const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const { listAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

// Only ADMIN is allowed to view audit logs
router.get('/', authenticate, requireRoles(Role.ADMIN), listAuditLogs);

module.exports = router;
