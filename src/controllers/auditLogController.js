const prisma = require('../config/prisma');
const { sendSuccess } = require('../utils/apiResponse');
const { normalizeSearch, toPositiveInt } = require('../utils/request');

async function listAuditLogs(req, res, next) {
  try {
    const action = req.query.action ? String(req.query.action).trim() : null;
    const resource = req.query.resource ? String(req.query.resource).trim() : null;
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const where = {};
    if (action) {
      where.action = action;
    }
    if (resource) {
      where.resource = resource;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Manually join User details
    const userIds = [...new Set(items.map(i => i.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    
    const itemsWithUser = items.map(item => ({
      ...item,
      user: item.userId ? userMap.get(item.userId) || null : null,
    }));

    return sendSuccess(res, {
      items: itemsWithUser,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAuditLogs,
};
