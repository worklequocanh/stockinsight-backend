const prisma = require('../config/prisma');

/**
 * Ghi nhật ký hành động vào AuditLog.
 * @param {string|null} userId — ID người thực hiện (null nếu hệ thống tự động)
 * @param {string} action — Hành động (VD: APPROVE_IMPORT, APPROVE_EXPORT, COMPLETE_INVENTORY_CHECK, UPDATE_RETURN_STATUS)
 * @param {string} resource — Bảng/thực thể bị tác động (VD: ImportReceipt, ExportReceipt, InventoryCheck, ReturnReceipt)
 * @param {string|null} resourceId — ID của thực thể bị tác động
 * @param {object|null} details — Chi tiết (old/new values)
 */
async function writeAuditLog(userId, action, resource, resourceId, details = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
      },
    });
  } catch (error) {
    // Log silently — không làm fail request chính
    console.error('[AuditLog] Failed to write:', error.message);
  }
}

module.exports = { writeAuditLog };
