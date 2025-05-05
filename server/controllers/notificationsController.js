const Notification = require('../models/Notification');
const User = require('../models/User');

exports.sendGlobalNotification = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'غير مصرح لك' });
  }
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'الرسالة مطلوبة' });
  }
  try {
    const users = await User.find();
    for (let user of users) {
      const notification = new Notification({
        message,
        user: user._id
      });
      await notification.save();
    }
    res.status(201).json({ message: 'تم إرسال الإشعار للجميع بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findOne({ _id: id, user: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: 'الإشعار غير موجود' });
    }
    notification.isRead = true;
    await notification.save();
    res.status(200).json({ message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    console.error('❌ خطأ في تعليم الإشعار كمقروء:', error.message, error.stack);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
};
