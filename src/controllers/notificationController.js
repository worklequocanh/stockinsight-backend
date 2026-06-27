const prisma = require('../config/prisma');
const { catchAsync } = require('../utils/errorHandler');

exports.getNotifications = catchAsync(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit to recent 50
  });

  const unreadCount = await prisma.notification.count({
    where: { isRead: false }
  });

  res.status(200).json({
    status: 'success',
    data: {
      notifications,
      unreadCount
    }
  });
});

exports.markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true }
  });

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});
