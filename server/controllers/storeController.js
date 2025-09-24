// /server/controllers/storeController.js

const Store = require('../models/Store');
const Bot = require('../models/Bot');
const Rule = require('../models/Rule');
const sanitizeHtml = require('sanitize-html'); // لتنظيف HTML من أي سكريبتات ضارة

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء متجر جديد بضغطة زر مع بيانات افتراضية
exports.createStore = async (req, res) => {
  const userId = req.user.userId;

  try {
    // تحقق إذا كان المستخدم لديه متجر مسبقًا
    const existingStore = await Store.findOne({ userId });
    if (existingStore) {
      return res.status(400).json({ message: 'لديك متجر بالفعل' });
    }

    // بيانات افتراضية للمتجر
    const storeName = `متجر ذكي للمستخدم ${userId}`;
    let storeLink = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (storeLink.length < 3) storeLink = `store-${userId}`;

    const defaultHeaderHtml = "<h1>مرحبا بكم في متجري</h1>";
    const defaultLandingHtml = "<p>تصميم افتراضي للمتجر، يمكنك تعديله من لوحة التحكم.</p>";

    const newStore = new Store({
      userId,
      storeName,
      storeLink,
      templateId: 1,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      headerHtml: defaultHeaderHtml,
      landingTemplateId: 1,
      landingHtml: defaultLandingHtml,
      isActive: true,
    });

    await newStore.save();

    // إنشاء قاعدة افتراضية للمتجر في Rules
    const storeRule = new Rule({
      storeId: newStore._id,
      type: 'store',
      content: { message: 'مرحبا بك في المتجر الذكي!' } // محتوى افتراضي
    });
    await storeRule.save();

    console.log(`[${getTimestamp()}] ✅ Store created: ${newStore.storeName} for user ${userId}`);

    res.status(201).json({
      message: 'تم إنشاء المتجر بنجاح. يمكنك تخصيص إعدادات متجرك من لوحة التحكم.',
      store: newStore,
    });

  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المتجر: ' + (err.message || 'غير معروف') });
  }
};

// تعديل بيانات المتجر
exports.updateStore = async (req, res) => {
  const { storeId } = req.params;
  const { storeName, templateId, primaryColor, secondaryColor, headerHtml, landingTemplateId, landingHtml } = req.body;
  const userId = req.user.userId;

  try {
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Update store failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // تنظيف HTML
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : store.headerHtml;
    const cleanedLandingHtml = landingHtml ? sanitizeHtml(landingHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : store.landingHtml;

    // تحديث الحقول
    if (storeName && storeName.trim() !== '') {
      store.storeName = storeName;
      store.storeLink = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (store.storeLink.length < 3) {
        return res.status(400).json({ message: 'اسم المتجر الجديد قصير جدًا لتوليد رابط صالح' });
      }
      const existingLink = await Store.findOne({ storeLink: store.storeLink, _id: { $ne: storeId } });
      if (existingLink) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: Generated storeLink ${store.storeLink} already exists`);
        return res.status(400).json({ message: 'الرابط المولّد الجديد موجود بالفعل، جرب اسم متجر مختلف' });
      }
    }

    if (templateId) store.templateId = templateId;
    if (primaryColor) store.primaryColor = primaryColor;
    if (secondaryColor) store.secondaryColor = secondaryColor;
    store.headerHtml = cleanedHeaderHtml;
    if (landingTemplateId) store.landingTemplateId = landingTemplateId;
    store.landingHtml = cleanedLandingHtml;

    await store.save();

    console.log(`[${getTimestamp()}] ✅ Store updated: ${store.storeName} for user ${userId}`);

    res.status(200).json(store);

  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تعديل المتجر: ' + (err.message || 'غير معروف') });
  }
};

// جلب بيانات المتجر
exports.getStore = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;

  try {
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get store failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched store: ${store.storeName} for user ${userId}`);

    res.status(200).json(store);

  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المتجر: ' + (err.message || 'غير معروف') });
  }
};
