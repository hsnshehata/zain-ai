// /server/controllers/storeController.js
const Store = require('../models/Store');
const Bot = require('../models/Bot');
const Rule = require('../models/Rule');
const sanitizeHtml = require('sanitize-html'); // لتنظيف HTML من أي سكريبتات ضارة

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء متجر جديد
exports.createStore = async (req, res) => {
  const { storeName, templateId, primaryColor, secondaryColor, headerHtml, landingTemplateId, landingHtml } = req.body;
  const userId = req.user.userId;

  try {
    if (!storeName || storeName.trim() === '') {
      console.log(`[${getTimestamp()}] ❌ Create store failed: storeName is missing or empty`);
      return res.status(400).json({ message: 'اسم المتجر مطلوب' });
    }

    // التحقق من عدم وجود متجر بنفس الاسم
    const existingStore = await Store.findOne({ storeName });
    if (existingStore) {
      console.log(`[${getTimestamp()}] ❌ Create store failed: Store name ${storeName} already exists`);
      return res.status(400).json({ message: 'اسم المتجر موجود بالفعل' });
    }

    // تنظيف HTML لو موجود
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : '';
    const cleanedLandingHtml = landingHtml ? sanitizeHtml(landingHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : '';

    // إنشاء رابط المتجر بناءً على الاسم (تحويله لـ slug)
    let storeLink = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (storeLink.length < 3) {
      console.log(`[${getTimestamp()}] ❌ Create store failed: Generated storeLink is too short`);
      return res.status(400).json({ message: 'اسم المتجر قصير جدًا لتوليد رابط صالح' });
    }

    // التحقق من توفر الرابط
    const existingLink = await Store.findOne({ storeLink });
    if (existingLink) {
      console.log(`[${getTimestamp()}] ❌ Create store failed: Generated storeLink ${storeLink} already exists`);
      return res.status(400).json({ message: 'الرابط المولّد موجود بالفعل، جرب اسم متجر مختلف' });
    }

    const newStore = new Store({
      userId,
      storeName,
      storeLink,
      templateId: templateId || 1,
      primaryColor: primaryColor || '#000000',
      secondaryColor: secondaryColor || '#ffffff',
      headerHtml: cleanedHeaderHtml,
      landingTemplateId: landingTemplateId || 1,
      landingHtml: cleanedLandingHtml
    });

    await newStore.save();
    console.log(`[${getTimestamp()}] ✅ Store created: ${newStore.storeName} for user ${userId}`);

    // ربط المتجر بالبوت إذا كان موجود (اختياري)
    const bot = await Bot.findOne({ userId });
    if (bot) {
      bot.storeId = newStore._id;
      await bot.save();
      console.log(`[${getTimestamp()}] ✅ Linked store ${newStore._id} to bot ${bot._id}`);
    }

    // إنشاء قاعدة افتراضية للمتجر في Rules
    const storeRule = new Rule({
      storeId: newStore._id,
      type: 'store',
      content: { message: 'مرحبا بك في المتجر الذكي!' } // محتوى افتراضي، هيتحدث تلقائيًا مع المنتجات
    });
    await storeRule.save();
    console.log(`[${getTimestamp()}] ✅ Created default store rule for store ${newStore._id}`);

    res.status(201).json(newStore);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المتجر: ' + (err.message || 'غير معروف') });
  }
};

// تعديل المتجر
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
      // التحقق من توفر الرابط الجديد
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
