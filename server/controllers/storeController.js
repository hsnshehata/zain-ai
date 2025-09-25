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
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { allowedTags: ['div', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'img', 'strong', 'em'], allowedAttributes: { 'a': ['href', 'target'], 'img': ['src', 'alt'] } }) : '';
    const cleanedLandingHtml = landingHtml ? sanitizeHtml(landingHtml, { allowedTags: ['div', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'img', 'strong', 'em'], allowedAttributes: { 'a': ['href', 'target'], 'img': ['src', 'alt'] } }) : '';

    // توليد storeLink فريد
    const storeLink = await generateUniqueStoreLink(storeName);

    // إنشاء المتجر
    const newStore = new Store({
      userId,
      storeName,
      storeLink,
      templateId: templateId || 1,
      primaryColor: primaryColor || '#000000',
      secondaryColor: secondaryColor || '#ffffff',
      headerHtml: cleanedHeaderHtml,
      landingTemplateId: landingTemplateId || 1,
      landingHtml: cleanedLandingHtml,
      isActive: true
    });

    await newStore.save();

    // ربط المتجر بالبوت لو موجود
    if (selectedBotId) {
      const bot = await Bot.findById(selectedBotId);
      if (bot && bot.userId.toString() === userId.toString()) {
        bot.storeId = newStore._id;
        await bot.save();
        console.log(`[${getTimestamp()}] ✅ Bot ${selectedBotId} linked to store ${newStore._id}`);
      } else {
        console.log(`[${getTimestamp()}] ⚠️ Bot ${selectedBotId} not found or not owned by user ${userId}`);
      }
    }

    console.log(`[${getTimestamp()}] ✅ Store created: ${newStore.storeName} with link ${storeLink} for user ${userId}`);
    res.status(201).json(newStore);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المتجر: ' + (err.message || 'غير معروف') });
  }
};

// تعديل متجر
exports.updateStore = async (req, res) => {
  const { storeId } = req.params;
  const { storeName, templateId, primaryColor, secondaryColor, headerHtml, landingTemplateId, landingHtml, storeLinkSlug } = req.body;
  const userId = req.user.userId;

  try {
    // التحقق من وجود المتجر وملكيته
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Update store failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من اسم المتجر لو اتغير
    let newStoreLink = store.storeLink;
    if (storeName && storeName.trim() !== '' && storeName !== store.storeName) {
      const existingStore = await Store.findOne({ storeName, _id: { $ne: storeId } });
      if (existingStore) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: Store name ${storeName} already exists`);
        return res.status(400).json({ message: 'اسم المتجر موجود بالفعل' });
      }
      // توليد storeLink جديد بناءً على الاسم الجديد
      newStoreLink = await generateUniqueStoreLink(storeName);
    } else if (storeLinkSlug && storeLinkSlug.trim() !== '') {
      // التحقق من الـ storeLinkSlug لو مرسل
      const existingLink = await Store.findOne({ storeLink: storeLinkSlug, _id: { $ne: storeId } });
      if (existingLink) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: Store link ${storeLinkSlug} already exists`);
        return res.status(400).json({ message: 'رابط المتجر موجود بالفعل' });
      }
      newStoreLink = storeLinkSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (newStoreLink.length < 3) {
        console.log(`[${getTimestamp()}] ❌ Update store failed: Store link ${newStoreLink} is too short`);
        return res.status(400).json({ message: 'رابط المتجر قصير جدًا، يجب أن يكون 3 أحرف على الأقل' });
      }
    }

    // تنظيف HTML لو موجود، أو تعيين قيمة افتراضية لو مش موجود
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { 
      allowedTags: ['div', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'img', 'strong', 'em'], 
      allowedAttributes: { 'a': ['href', 'target'], 'img': ['src', 'alt'] } 
    }) : store.headerHtml || '';

    const cleanedLandingHtml = landingHtml ? sanitizeHtml(landingHtml, { 
      allowedTags: ['div', 'span', 'a', 'p', 'h1', 'h2', 'h3', 'img', 'strong', 'em'], 
      allowedAttributes: { 'a': ['href', 'target'], 'img': ['src', 'alt'] } 
    }) : store.landingHtml || '';

    // تحديث بيانات المتجر
    store.storeName = storeName && storeName.trim() !== '' ? storeName : store.storeName;
    store.storeLink = newStoreLink;
    store.templateId = templateId || store.templateId;
    store.primaryColor = primaryColor || store.primaryColor;
    store.secondaryColor = secondaryColor || store.secondaryColor;
    store.headerHtml = cleanedHeaderHtml;
    store.landingTemplateId = landingTemplateId || store.landingTemplateId;
    store.landingHtml = cleanedLandingHtml;
    store.updatedAt = Date.now();

    await store.save();

    console.log(`[${getTimestamp()}] ✅ Store updated: ${store.storeName} with link ${store.storeLink} for user ${userId}`);
    res.status(200).json(store);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating store:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تعديل المتجر: ' + (err.message || 'غير معروف') });
  }
};

// جلب بيانات المتجر (للمالك)
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

// جلب المتجر بالـ storeLink (للزبائن، بدون authenticate)
exports.getStoreByLink = async (req, res) => {
  const { storeLink } = req.params;

  try {
    console.log(`[${getTimestamp()}] 📡 Fetching store by link: ${storeLink}`);
    const store = await Store.findOne({ storeLink }).select('-userId -isActive'); // إخفاء الحقول الحساسة
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get store by link failed: Store link ${storeLink} not found`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched store by link: ${store.storeName}`);
    res.status(200).json(store);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching store by link:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المتجر: ' + (err.message || 'غير معروف') });
  }
};
