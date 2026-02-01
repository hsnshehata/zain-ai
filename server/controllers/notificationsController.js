// /server/controllers/notificationsController.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../logger');

// إرسال إشعار للجميع
exports.sendGlobalNotification = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    logger.warn('global_notification_not_authorized', { username: req.user.username, role: req.user.role });
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { title, message } = req.body;
  if (!title || !message) {
    logger.warn('global_notification_missing_fields');
    return res.status(400).json({ message: 'العنوان والرسالة مطلوبان' });
  }
  try {
    const users = await User.find();
    logger.info('global_notification_users_fetched', { count: users.length });
    for (let user of users) {
      const notification = new Notification({
        title,
        message,
        user: user._id
      });
      await notification.save();
      logger.info('notification_saved', { targetUser: user._id, username: user.username });
    }
    logger.info('global_notification_sent');
    res.status(201).json({ message: 'تم إرسال الإشعار للجميع بنجاح' });
  } catch (error) {
    logger.error('global_notification_error', { err: error.message, stack: error.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب الإشعارات
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      logger.warn('notifications_fetch_missing_user');
      return res.status(400).json({ message: 'معرف المستخدم غير موجود' });
    }
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    logger.info('notifications_fetch_success', { userId, username: req.user.username, count: notifications.length });
    res.status(200).json(notifications);
  } catch (error) {
    logger.error('notifications_fetch_error', { err: error.message, stack: error.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// تعليم الإشعار كمقروء
exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const notification = await Notification.findOne({ _id: id, user: userId });
    if (!notification) {
      logger.warn('notification_mark_read_not_found', { notificationId: id, userId });
      return res.status(404).json({ message: 'الإشعار غير موجود' });
    }
    notification.isRead = true;
    await notification.save();
    logger.info('notification_mark_read_success', { notificationId: id, userId });
    res.status(200).json({ message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    logger.error('notification_mark_read_error', { err: error.message, stack: error.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إرسال إشعار لمستخدم واحد
exports.sendNotification = async (req, res) => {
  const { userId, title, message } = req.body;

  try {
    if (!userId || !title || !message) {
      logger.warn('notification_send_missing_fields');
      return res.status(400).json({ message: 'معرف المستخدم، العنوان، والرسالة مطلوبة' });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('notification_send_user_not_found', { userId });
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const notification = new Notification({
      user: userId,
      title,
      message,
      isRead: false
    });
    await notification.save();
    logger.info('notification_send_success', { userId, title });
    res.status(201).json({ message: 'تم إرسال الإشعار بنجاح' });
  } catch (error) {
    logger.error('notification_send_error', { err: error.message, stack: error.stack });
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
