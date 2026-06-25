const express = require('express');
const { Role } = require('@prisma/client');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate, requireRoles(Role.ADMIN));

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;
