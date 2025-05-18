const Notification = require('../models/Notification');
const User = require('../models/User');

exports.sendGlobalNotification = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    console.log(`❌ Send global notification failed: User ${req.user.username} is not superadmin`);
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { title, message } = req.body;
  if (!title || !message) {
    console.log('❌ Send global notification failed: Title and message are required');
    return res.status(400).json({ message: 'العنوان والرسالة مطلوبان' });
  }
  try {
    const users = await User.find();
    console.log(`✅ Found ${users.length} users to send notification to`);
    for (let user of users) {
      const notification = new Notification({
        title,
        message,
        user: user._id
      });
      await notification.save();
      console.log(`✅ Notification saved for user ${user.username} (${user._id})`);
    }
    console.log('✅ Global notification sent successfully');
    res.status(201).json({ message: 'تم إرسال الإشعار للجميع بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      console.log('❌ Fetch notifications failed: User ID not found in token');
      return res.status(400).json({ message: 'معرف المستخدم غير موجود' });
    }
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    console.log(`✅ Fetched ${notifications.length} notifications for user ${req.user.username} (${userId})`);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const notification = await Notification.findOne({ _id: id, user: userId });
    if (!notification) {
      console.log(`❌ Mark as read failed: Notification ${id} not found for user ${userId}`);
      return res.status(404).json({ message: 'الإشعار غير موجود' });
    }
    notification.isRead = true;
    await notification.save();
    console.log(`✅ Notification ${id} marked as read for user ${userId}`);
    res.status(200).json({ message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    console.error('❌ خطأ في تعليم الإشعار كمقروء:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
