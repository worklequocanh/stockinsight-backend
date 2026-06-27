const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  rejectTransfer,
} = require('../controllers/transferController');

const router = express.Router();

router.use(authenticate, requireRoles(Role.ADMIN, Role.WAREHOUSE_MANAGER));

router.get('/', listTransfers);
router.get('/:id', getTransferById);
router.post('/', createTransfer);
router.post('/:id/approve', approveTransfer);
router.post('/:id/reject', rejectTransfer);

module.exports = router;
