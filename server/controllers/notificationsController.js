// /server/controllers/notificationsController.js
const Notification = require('../models/Notification');
const User = require('../models/User');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إرسال إشعار للجميع
exports.sendGlobalNotification = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    console.log(`[${getTimestamp()}] ❌ Send global notification failed: User ${req.user.username} is not superadmin`);
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { title, message } = req.body;
  if (!title || !message) {
    console.log(`[${getTimestamp()}] ❌ Send global notification failed: Title and message are required`);
    return res.status(400).json({ message: 'العنوان والرسالة مطلوبان' });
  }
  try {
    const users = await User.find();
    console.log(`[${getTimestamp()}] ✅ Found ${users.length} users to send notification to`);
    for (let user of users) {
      const notification = new Notification({
        title,
        message,
        user: user._id
      });
      await notification.save();
      console.log(`[${getTimestamp()}] ✅ Notification saved for user ${user.username} (${user._id})`);
    }
    console.log(`[${getTimestamp()}] ✅ Global notification sent successfully`);
    res.status(201).json({ message: 'تم إرسال الإشعار للجميع بنجاح' });
  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إرسال الإشعار:`, error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// جلب الإشعارات
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      console.log(`[${getTimestamp()}] ❌ Fetch notifications failed: User ID not found in token`);
      return res.status(400).json({ message: 'معرف المستخدم غير موجود' });
    }
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    console.log(`[${getTimestamp()}] ✅ Fetched ${notifications.length} notifications for user ${req.user.username} (${userId})`);
    res.status(200).json(notifications);
  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ خطأ في جلب الإشعارات:`, error.message, error.stack);
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
      console.log(`[${getTimestamp()}] ❌ Mark as read failed: Notification ${id} not found for user ${userId}`);
      return res.status(404).json({ message: 'الإشعار غير موجود' });
    }
    notification.isRead = true;
    await notification.save();
    console.log(`[${getTimestamp()}] ✅ Notification ${id} marked as read for user ${userId}`);
    res.status(200).json({ message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ خطأ في تعليم الإشعار كمقروء:`, error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

// إرسال إشعار لمستخدم واحد
exports.sendNotification = async (req, res) => {
  const { userId, title, message } = req.body;

  try {
    if (!userId || !title || !message) {
      console.log(`[${getTimestamp()}] ❌ Send notification failed: userId, title, and message are required`);
      return res.status(400).json({ message: 'معرف المستخدم، العنوان، والرسالة مطلوبة' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`[${getTimestamp()}] ❌ Send notification failed: User ${userId} not found`);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const notification = new Notification({
      user: userId,
      title,
      message,
      isRead: false
    });
    await notification.save();
    console.log(`[${getTimestamp()}] ✅ Notification sent to user ${userId}: ${title}`);
    res.status(201).json({ message: 'تم إرسال الإشعار بنجاح' });
  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ خطأ في إرسال الإشعار:`, error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
