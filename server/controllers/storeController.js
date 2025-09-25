// /server/controllers/storeController.js
const Store = require('../models/Store');
const Bot = require('../models/Bot');
const Rule = require('../models/Rule');
const sanitizeHtml = require('sanitize-html');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// دالة مساعدة لتوليد storeLink فريد
const generateUniqueStoreLink = async (storeName) => {
  let storeLink = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (storeLink.length < 3) {
    storeLink = `metjar-${Math.floor(1000 + Math.random() * 9000)}`; // توليد رابط افتراضي مع رقم عشوائي
  }

  let existingLink = await Store.findOne({ storeLink });
  let suffix = 1;
  let baseLink = storeLink;
  while (existingLink) {
    storeLink = `${baseLink}-${suffix}`;
    existingLink = await Store.findOne({ storeLink });
    suffix++;
  }
  return storeLink;
};

// إنشاء متجر جديد
exports.createStore = async (req, res) => {
  let { storeName, templateId, primaryColor, secondaryColor, headerHtml, landingTemplateId, landingHtml, selectedBotId } = req.body;
  const userId = req.user.userId;

  try {
    // استخدام بيانات افتراضية لو مش موجودة
    storeName = storeName && storeName.trim() !== '' ? storeName : 'متجر-افتراضي';

    // التحقق من عدم وجود متجر بنفس الاسم
    const existingStore = await Store.findOne({ storeName });
    if (existingStore) {
      console.log(`[${getTimestamp()}] ❌ Create store failed: Store name ${storeName} already exists`);
      return res.status(400).json({ message: 'اسم المتجر موجود بالفعل' });
    }

    // تنظيف HTML لو موجود
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : '';
    const cleanedLandingHtml = landingHtml ? sanitizeHtml(landingHtml, { allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], allowedAttributes: { a: ['href'], img: ['src'] } }) : '';

    // توليد رابط المتجر
    const storeLink = await generateUniqueStoreLink(storeName);

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

    // ربط المتجر بالبوت إذا كان موجود
    if (selectedBotId) {
      const bot = await Bot.findOne({ _id: selectedBotId, userId });
      if (bot) {
        bot.storeId = newStore._id;
        await bot.save();
        console.log(`[${getTimestamp()}] ✅ Linked store ${newStore._id} to bot ${bot._id}`);
      } else {
        console.log(`[${getTimestamp()}] ⚠️ No bot found for linking, skipping...`);
      }
    }

    // إنشاء قاعدة افتراضية للمتجر في Rules
    const storeRule = new Rule({
      storeId: newStore._id,
      type: 'store',
      content: { message: 'مرحبا بك في المتجر الذكي!' }
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
  const { storeName, storeLink, templateId, primaryColor, secondaryColor, headerHtml, landingTemplateId, landingHtml } = req.body;
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
      store.storeLink = await generateUniqueStoreLink(storeName);
    } else if (storeLink && storeLink.trim() !== '') {
      // التحقق من صلاحية storeLink
      if (!/^[a-zA-Z0-9_-]+$/.test(storeLink)) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: Invalid storeLink format ${storeLink}`);
        return res.status(400).json({ message: 'رابط المتجر يجب أن يحتوي على حروف، أرقام، - أو _ فقط' });
      }
      if (storeLink.length < 3) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: storeLink ${storeLink} too short`);
        return res.status(400).json({ message: 'رابط المتجر يجب أن يكون 3 أحرف على الأقل' });
      }
      const existingLink = await Store.findOne({ storeLink, _id: { $ne: storeId } });
      if (existingLink) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: storeLink ${storeLink} already exists`);
        return res.status(400).json({ message: 'الرابط المحدد موجود بالفعل، جرب رابط آخر' });
      }
      store.storeLink = storeLink;
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
