// /server/controllers/storeController.js
const Store = require('../models/Store');
const Bot = require('../models/Bot');
const sanitizeHtml = require('sanitize-html');
const logger = require('../logger');

const normalizeStoreLink = (value = '') => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
};

// دالة مساعدة لتوليد storeLink فريد
const generateUniqueStoreLink = async (storeName) => {
  let storeLink = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
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
  let { storeName, storeLink: requestedStoreLink, templateId, primaryColor, secondaryColor, headerHtml, whatsapp, website, mobilePhone, landline, email, address, googleMapsLink, footerText, selectedBotId, enableCart, landingLayout } = req.body;
  const userId = req.user.userId; // ممكن يبقى موجود لكن الربط هيتم عبر البوت لو اتبعته

  try {
    logger.info('store_create_attempt', {
      userId,
      storeName,
      templateId,
      primaryColor,
      secondaryColor,
      headerHtml,
      whatsapp,
      website,
      mobilePhone,
      landline,
      email,
      address,
      googleMapsLink,
      footerText,
      selectedBotId
    });

    // استخدام بيانات افتراضية لو مش موجودة
    storeName = storeName && storeName.trim() !== '' ? storeName : 'متجر-افتراضي';

    // التحقق من عدم وجود متجر بنفس الاسم
    const existingStore = await Store.findOne({ storeName });
    if (existingStore) {
      logger.warn('store_create_name_exists', { storeName });
      return res.status(400).json({ message: 'اسم المتجر موجود بالفعل' });
    }

    // تنظيف HTML لو موجود
    const cleanedHeaderHtml = headerHtml ? sanitizeHtml(headerHtml, { 
      allowedTags: ['div', 'span', 'a', 'img', 'p', 'h1', 'h2', 'ul', 'li'], 
      allowedAttributes: { a: ['href'], img: ['src'] } 
    }) : '';

    // توليد أو استخدام storeLink
    let storeLink;
    if (requestedStoreLink && requestedStoreLink.trim() !== '') {
      const normalizedLink = normalizeStoreLink(requestedStoreLink);
      if (!normalizedLink || normalizedLink.length < 4) {
        return res.status(400).json({ message: 'رابط المتجر يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف' });
      }
      const existingLink = await Store.findOne({ storeLink: normalizedLink });
      if (existingLink) {
        return res.status(400).json({ message: 'رابط المتجر مستخدم بالفعل، يرجى اختيار رابط آخر' });
      }
      storeLink = normalizedLink;
    } else {
      storeLink = await generateUniqueStoreLink(storeName);
    }

    // إذا تم تمرير بوت، نحاول ربط المتجر بالبِت وتعيين المالك من بيانات البوت
    let ownerUserId = undefined;
    let botIdToUse = null;
    if (selectedBotId) {
      const bot = await Bot.findById(selectedBotId);
      if (!bot) {
        logger.warn('store_create_bot_not_found', { selectedBotId });
        return res.status(400).json({ message: 'البوت المحدد غير موجود' });
      }
      botIdToUse = bot._id;
      // إذا البوت له مالك، نخليه owner
      if (bot.userId) ownerUserId = bot.userId;
    } else {
      // لو مفيش بوت محدد، نخلي المالك هو المستخدم الحالي لو موجود
      ownerUserId = userId || undefined;
    }

    // تنظيف قيم adminConfig بسيطة
    const adminConfig = {
      enableCart: enableCart === 'true' || enableCart === true,
      landingLayout: ['layout1','layout2','layout3','layout4'].includes(landingLayout) ? landingLayout : 'layout1',
      showManagerPanel: true,
      banner: {
        enabled: false,
        imageUrl: '',
        linkType: 'none',
        externalUrl: '',
        productId: null
      },
      extraSection: { enabled: false, label: '', url: '' },
      supportWidget: { enabled: false, chatLink: '' }
    };

    // إنشاء المتجر
    const newStore = new Store({
      userId: ownerUserId,
      botId: botIdToUse,
      storeName,
      storeLink,
      templateId: parseInt(templateId) || 1,
      primaryColor: primaryColor || '#000000',
      secondaryColor: secondaryColor || '#ffffff',
      headerHtml: cleanedHeaderHtml,
      whatsapp: whatsapp || '',
      website: website || '',
      mobilePhone: mobilePhone || '',
      landline: landline || '',
      email: email || '',
      address: address || '',
      googleMapsLink: googleMapsLink || '',
      footerText: footerText || '',
      adminConfig
    });

    await newStore.save();

    // ربط المتجر بالبوت إذا تم تحديده
    if (selectedBotId) {
      await Bot.findByIdAndUpdate(selectedBotId, { storeId: newStore._id });
    }

    logger.info('store_created', { storeId: newStore._id, storeName: newStore.storeName, userId, storeLink });
    res.status(201).json(newStore);
  } catch (err) {
    logger.error('store_create_error', { err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء المتجر: ' + (err.message || 'غير معروف') });
  }
};

// تعديل متجر
exports.updateStore = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('store_update_attempt', { storeId, userId, body: req.body });

    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('store_update_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // Authorization check
    if (userRole !== 'superadmin') {
      if (String(store.userId) !== String(userId)) {
        if (store.botId) {
          const bot = await Bot.findById(store.botId);
          if (!bot || String(bot.userId) !== String(userId)) {
            return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا المتجر' });
          }
        } else {
          return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا المتجر' });
        }
      }
    }

  // Update only fields that are sent in request
  const updates = {}; // top-level fields
  const adminConfigUpdates = {}; // dotted paths for adminConfig to avoid overwriting siblings
    
    if (req.body.storeName) {
      const existingStore = await Store.findOne({ 
        storeName: req.body.storeName, 
        _id: { $ne: storeId } 
      });
      
      if (existingStore) {
        return res.status(400).json({ message: 'اسم المتجر مستخدم بالفعل' });
      }
      updates.storeName = req.body.storeName;
    }

    if (req.body.primaryColor) {
      updates.primaryColor = req.body.primaryColor;
    }

    if (req.body.storeLink !== undefined) {
      const normalizedLink = normalizeStoreLink(req.body.storeLink);
      if (!normalizedLink || normalizedLink.length < 4) {
        return res.status(400).json({ message: 'رابط المتجر يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف' });
      }
      const existingLink = await Store.findOne({ storeLink: normalizedLink, _id: { $ne: storeId } });
      if (existingLink) {
        return res.status(400).json({ message: 'رابط المتجر مستخدم بالفعل، يرجى اختيار رابط آخر' });
      }
      updates.storeLink = normalizedLink;
    }

    // Handle admin config updates
    if (!store.adminConfig) store.adminConfig = {};

    if (req.body.enableCart !== undefined) {
      adminConfigUpdates['adminConfig.enableCart'] = (req.body.enableCart === true || req.body.enableCart === 'true');
    }

    if (req.body.landingLayout) {
      adminConfigUpdates['adminConfig.landingLayout'] = ['layout1','layout2','layout3','layout4'].includes(req.body.landingLayout)
        ? req.body.landingLayout
        : (store.adminConfig.landingLayout || 'layout1');
    }

    // Banner settings
    if (
      req.body.bannerEnabled !== undefined ||
      req.body.bannerImageUrl !== undefined ||
      req.body.bannerLinkType !== undefined ||
      req.body.bannerExternalUrl !== undefined ||
      req.body.bannerProductId !== undefined
    ) {
      const linkType = ['none','external','product'].includes(req.body.bannerLinkType) ? req.body.bannerLinkType : (store.adminConfig?.banner?.linkType || 'none');
      adminConfigUpdates['adminConfig.banner'] = {
        enabled: req.body.bannerEnabled === true || req.body.bannerEnabled === 'true',
        imageUrl: typeof req.body.bannerImageUrl === 'string' ? req.body.bannerImageUrl : (store.adminConfig?.banner?.imageUrl || ''),
        linkType,
        externalUrl: linkType === 'external' ? (req.body.bannerExternalUrl || '') : '',
        productId: linkType === 'product' ? (req.body.bannerProductId || null) : null,
      };
    }

    // Extra section button
    if (
      req.body.extraSectionEnabled !== undefined ||
      req.body.extraSectionLabel !== undefined ||
      req.body.extraSectionUrl !== undefined
    ) {
      adminConfigUpdates['adminConfig.extraSection'] = {
        enabled: req.body.extraSectionEnabled === true || req.body.extraSectionEnabled === 'true',
        label: (req.body.extraSectionLabel || '').toString().slice(0, 40),
        url: (req.body.extraSectionUrl || '').toString()
      };
    }

    // Floating support widget
    if (req.body.supportFloatingEnabled !== undefined || req.body.supportChatLink !== undefined) {
      adminConfigUpdates['adminConfig.supportWidget'] = {
        enabled: req.body.supportFloatingEnabled === true || req.body.supportFloatingEnabled === 'true',
        chatLink: (req.body.supportChatLink || '').toString()
      };
    }

    // Handle optional fields if they exist in request
    const optionalFields = [
      'storeDescription', 
      'storeLogoUrl',
      'templateId',
      'whatsapp',
      'website',
      'mobilePhone',
      'landline',
      'email',
      'address',
      'googleMapsLink',
      'footerText',
      'socialLinks.facebook',
      'socialLinks.instagram',
      'socialLinks.twitter',
      'socialLinks.youtube',
      'socialLinks.tiktok',
      'socialLinks.linkedin'
    ];

    optionalFields.forEach(field => {
      // دعم مسارات متدرجة (مثل socialLinks.facebook)
      const parts = field.split('.');
      if (parts.length === 1) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      } else {
        const top = parts[0];
        const key = parts.slice(1).join('.');
        const formKey = field; // نفس الاسم في الطلب
        if (req.body[formKey] !== undefined) {
          updates[formKey] = req.body[formKey];
        } else if (req.body[top] && req.body[top][parts[1]] !== undefined) {
          updates[formKey] = req.body[top][parts[1]];
        }
      }
    });

    // Update the store with all changes
    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { $set: { ...updates, ...adminConfigUpdates } },
      { new: true, runValidators: true }
    );

    logger.info('store_updated', { storeId: updatedStore?._id, storeName: updatedStore?.storeName });
    res.status(200).json(updatedStore);

  } catch (err) {
    logger.error('store_update_error', { err: err.message, stack: err.stack, storeId });
    res.status(500).json({ message: 'خطأ في تحديث المتجر: ' + err.message });
  }
};

// جلب بيانات المتجر (للمالك)
exports.getStore = async (req, res) => {
  const { storeId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;

  try {
    logger.info('store_fetch_attempt', { storeId, userId });
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('store_fetch_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }
    // Authorization: allow superadmin OR store owner OR bot owner
    if (userRole !== 'superadmin') {
      if (String(store.userId) === String(userId)) {
        // ok
      } else if (store.botId) {
        const bot = await Bot.findById(store.botId);
        if (!bot || String(bot.userId) !== String(userId)) {
          return res.status(403).json({ message: 'غير مصرح لك بمشاهدة هذا المتجر' });
        }
      } else {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة هذا المتجر' });
      }
    }

    logger.info('store_fetch_success', { storeId: store._id, storeName: store.storeName, userId });
    res.status(200).json(store);
  } catch (err) {
    logger.error('store_fetch_error', { err: err.message, stack: err.stack, storeId });
    res.status(500).json({ message: 'خطأ في جلب المتجر: ' + (err.message || 'غير معروف') });
  }
};

// جلب المتجر بالـ storeLink (للزبائن، بدون authenticate)
exports.getStoreByLink = async (req, res) => {
  const { storeLink } = req.params;

  try {
    logger.info('store_fetch_by_link_attempt', { storeLink });
    const store = await Store.findOne({ storeLink, isActive: true }).select('-userId');
    if (!store) {
      logger.warn('store_fetch_by_link_not_found', { storeLink });
      return res.status(404).json({ message: 'المتجر غير موجود أو غير مفعل' });
    }

    logger.info('store_fetch_by_link_success', { storeName: store.storeName, storeLink });
    res.status(200).json(store);
  } catch (err) {
    logger.error('store_fetch_by_link_error', { err: err.message, stack: err.stack, storeLink });
    res.status(500).json({ message: 'خطأ في جلب المتجر: ' + (err.message || 'غير معروف') });
  }
};
