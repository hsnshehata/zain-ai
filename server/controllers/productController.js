// /server/controllers/productController.js
const Product = require('../models/Product');
const Store = require('../models/Store');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { uploadToImgbb } = require('./uploadController');
const mongoose = require('mongoose');
const Bot = require('../models/Bot');
const logger = require('../logger');

// authorize store access (reuse similar logic)
async function authorizeStoreAccess(storeId, userId, userRole) {
  const store = await Store.findById(storeId);
  if (!store) {
    const e = new Error('المتجر غير موجود');
    e.status = 404;
    throw e;
  }
  if (userRole === 'superadmin') return store;
  if (String(store.userId) === String(userId)) return store;
  if (store.botId) {
    const bot = await Bot.findById(store.botId);
    if (bot && String(bot.userId) === String(userId)) return store;
  }
  const e = new Error('غير مصرح لك');
  e.status = 403;
  throw e;
}

// مولد أكواد المنتج: يعيد مصفوفة بثلاث صيغ مختلفة (رقمي، أحرف+أرقام، قصير)
function generateProductCodes() {
  const now = Date.now().toString();
  const rand = Math.floor(Math.random() * 9000) + 1000; // 4 digits
  // رقم مكوّن من 12 خانة (جزء من الطابع الزمني + رقم عشوائي)
  const numeric = (now.slice(-8) + String(rand)).slice(0, 12);
  // رمز أبجدي رقمي قصير
  const alnum = `P-${now.slice(-6)}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  // رمز قصير فريد
  const short = Math.random().toString(36).slice(2,10).toUpperCase();
  return [numeric, alnum, short];
}

// إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  const { storeId } = req.params;
  const { productName, description, detailedDescription, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category, optionsEnabled, optionGroups, costPrice } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    logger.info('product_create_attempt', {
      storeId,
      userId,
      productName,
      description,
      price,
      hasOffer,
      originalPrice,
      discountedPrice,
      currency,
      stock,
      lowStockThreshold,
      category,
      hasFile: !!file,
      file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null
    });

    // التحقق من وجود المتجر وملكيته
    // authorize
    let store;
    try {
      store = await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('product_create_auth_failed', { storeId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من الحقول المطلوبة
    if (!productName || !price || !currency || stock === undefined) {
      logger.warn('product_create_missing_fields', { storeId, productName, price, currency, stock });
      return res.status(400).json({ message: 'اسم المنتج، السعر، العملة، والمخزون مطلوبة' });
    }

    // التحقق من حقول العرض
    const offerEnabled = hasOffer === "yes" || hasOffer === true;
    if (offerEnabled && (!originalPrice || !discountedPrice)) {
      logger.warn('product_create_missing_offer_fields', { storeId });
      return res.status(400).json({ message: 'السعر الأصلي والسعر بعد الخصم مطلوبان عند تفعيل العرض' });
    }

    // التحقق من القسم إذا تم إرساله
    let categoryId = null;
    if (category && category !== 'null' && mongoose.isValidObjectId(category)) {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        logger.warn('product_create_category_missing', { category, storeId });
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      categoryId = category;
    }

    // رفع الصورة إذا وجدت
    let imageUrl = '';
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        // استخدم رابط العرض المباشر للصورة لضمان الظهور الصحيح في الواجهة
        imageUrl = uploadResult.displayUrl || uploadResult.url;
        logger.info('product_image_uploaded', { storeId, imageUrl });
      } catch (uploadErr) {
        logger.error('product_image_upload_error', { storeId, err: uploadErr.message });
        if (uploadErr.message.includes('timeout')) {
          return res.status(408).json({ message: 'تأخر في رفع الصورة، جرب صورة بحجم أصغر أو تحقق من الاتصال بالإنترنت' });
        }
        return res.status(400).json({ message: `خطأ في رفع الصورة: ${uploadErr.message}` });
      }
    }

    // معالجة الصور الإضافية (إن وجدت)
    let images = [];
    if (req.body.images) {
      try {
        if (Array.isArray(req.body.images)) {
          images = req.body.images.filter(Boolean);
        } else if (typeof req.body.images === 'string') {
          // قد تكون JSON string أو قائمة مفصولة بفواصل
          const txt = req.body.images.trim();
          if (txt.startsWith('[')) {
            images = JSON.parse(txt);
          } else {
            images = txt.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        logger.warn('product_images_parse_failed', { storeId, err: e.message });
      }
    }

    // إذا لم تكن هناك صورة مرفوعة، فحاول الحصول على الصورة الأساسية من payload (import/export)
    if (!imageUrl) {
      if (req.body.primaryImage) {
        imageUrl = req.body.primaryImage;
      } else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
      } else if (images.length) {
        imageUrl = images[0];
      }
    }

    // معالجة مجموعات الخيارات
    let optionsEnabledBool = optionsEnabled === 'yes' || optionsEnabled === true;
    let optionGroupsArr = [];
    if (optionsEnabledBool && optionGroups !== undefined) {
      try {
        if (typeof optionGroups === 'string') optionGroupsArr = JSON.parse(optionGroups);
        else if (Array.isArray(optionGroups)) optionGroupsArr = optionGroups;
        if (!Array.isArray(optionGroupsArr)) optionGroupsArr = [];
      } catch (e) {
        logger.warn('product_option_groups_parse_failed', { storeId, err: e.message });
        optionGroupsArr = [];
      }
    }

    // إنشاء المنتج
    const newProduct = new Product({
      storeId,
      productName,
      description: description || '',
      detailedDescription: detailedDescription || '',
      price: parseFloat(price),
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : 0,
      hasOffer: offerEnabled,
      originalPrice: offerEnabled ? parseFloat(originalPrice) : undefined,
      discountedPrice: offerEnabled ? parseFloat(discountedPrice) : undefined,
      currency,
      stock: parseInt(stock),
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      category: categoryId,
      imageUrl,
      images,
      optionsEnabled: optionsEnabledBool,
      optionGroups: optionGroupsArr,
      isActive: true,
      salesCount: 0
    });

    // توليد/اعتماد أكواد المنتج: إذا أُرسلت generatedCodes/barcode في payload فاحفظها، وإلا ولّد تلقائياً
    try {
      let providedCodes = undefined;
      if (req.body.generatedCodes) {
        try {
          providedCodes = typeof req.body.generatedCodes === 'string' ? JSON.parse(req.body.generatedCodes) : req.body.generatedCodes;
        } catch (e) {
          // قد يكون مصفوفة مفصولة بفواصل
          if (typeof req.body.generatedCodes === 'string') {
            providedCodes = req.body.generatedCodes.split(',').map(s => String(s).trim()).filter(Boolean);
          }
        }
      }

      if (Array.isArray(providedCodes) && providedCodes.length) {
        newProduct.generatedCodes = providedCodes;
        // إذا تم إرسال barcode صريح استخدمه، وإلا استخدم أول كود من المصفوفة
        newProduct.barcode = req.body.barcode ? String(req.body.barcode) : providedCodes[0];
      } else if (req.body.barcode) {
        newProduct.barcode = String(req.body.barcode);
      } else {
        const genCodes = generateProductCodes();
        newProduct.generatedCodes = genCodes;
        newProduct.barcode = genCodes[0];
      }
    } catch (e) {
      logger.warn('product_codes_generate_failed', { storeId, err: e.message });
    }

    await newProduct.save();
    logger.info('product_created', { storeId, productName, imageUrl });
    res.status(201).json(newProduct);
  } catch (err) {
    logger.error('product_create_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في إنشاء المنتج: ' + (err.message || 'غير معروف') });
  }
};

// تعديل منتج
exports.updateProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const { productName, description, detailedDescription, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category, optionsEnabled, optionGroups, costPrice } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    logger.info('product_update_attempt', {
      storeId,
      productId,
      userId,
      productName,
      description,
      price,
      hasOffer,
      originalPrice,
      discountedPrice,
      currency,
      stock,
      lowStockThreshold,
      category,
      hasFile: !!file,
      file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null
    });

    // التحقق من وجود المتجر
    // authorize
    let store;
    try {
      store = await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('product_update_auth_failed', { storeId, productId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId }).populate('category');
    if (!product) {
      logger.warn('product_update_not_found', { storeId, productId });
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // التحقق من القسم إذا تم إرساله
    let categoryId = product.category ? product.category._id : null;
    if (category && category !== 'null' && mongoose.isValidObjectId(category)) {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        logger.warn('product_update_category_missing', { category, storeId });
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
      categoryId = category;
    }

    // رفع الصورة إذا وجدت
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        // استخدم رابط العرض المباشر للصورة لضمان الظهور الصحيح في الواجهة
        product.imageUrl = uploadResult.displayUrl || uploadResult.url;
        logger.info('product_image_updated', { storeId, productId, imageUrl: product.imageUrl });
      } catch (uploadErr) {
        logger.error('product_update_image_error', { storeId, productId, err: uploadErr.message });
        if (uploadErr.message.includes('timeout')) {
          return res.status(408).json({ message: 'تأخر في رفع الصورة، جرب صورة بحجم أصغر أو تحقق من الاتصال بالإنترنت' });
        }
        return res.status(400).json({ message: `خطأ في رفع الصورة: ${uploadErr.message}` });
      }
    }

  // تحديث الحقول
    product.productName = productName || product.productName;
  product.description = description !== undefined ? description : product.description;
  product.detailedDescription = detailedDescription !== undefined ? detailedDescription : product.detailedDescription;
    product.price = price !== undefined ? parseFloat(price) : product.price;
    if (costPrice !== undefined) product.costPrice = parseFloat(costPrice);
    product.hasOffer = hasOffer === "yes" || hasOffer === true;
    product.originalPrice = product.hasOffer ? parseFloat(originalPrice) : undefined;
    product.discountedPrice = product.hasOffer ? parseFloat(discountedPrice) : undefined;
    product.currency = currency || product.currency;
    product.stock = stock !== undefined ? parseInt(stock) : product.stock;
    product.lowStockThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.lowStockThreshold;
    product.category = categoryId;
    // معالجة الصور الإضافية (إن وجدت)
    if (req.body.images !== undefined) {
      try {
        if (Array.isArray(req.body.images)) {
          product.images = req.body.images.filter(Boolean);
        } else if (typeof req.body.images === 'string') {
          const txt = req.body.images.trim();
          if (txt.startsWith('[')) {
            product.images = JSON.parse(txt);
          } else {
            product.images = txt.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        logger.warn('product_update_images_parse_failed', { storeId, productId, err: e.message });
      }
    }

    // تحديث مجموعات الخيارات
    const optionsEnabledBool = optionsEnabled === 'yes' || optionsEnabled === true || optionsEnabled === 'true';
    if (optionsEnabled !== undefined) {
      product.optionsEnabled = optionsEnabledBool;
    }
    if (optionGroups !== undefined) {
      try {
        let parsed = optionGroups;
        if (typeof optionGroups === 'string') parsed = JSON.parse(optionGroups);
        if (!Array.isArray(parsed)) parsed = [];
        product.optionGroups = parsed;
      } catch (e) {
        logger.warn('product_update_option_groups_parse_failed', { storeId, productId, err: e.message });
      }
    }
    product.isActive = true;
    product.salesCount = product.salesCount || 0;

    await product.save();
    logger.info('product_updated', { storeId, productId: product._id, productName: product.productName, imageUrl: product.imageUrl });
    res.status(200).json(product);
  } catch (err) {
    logger.error('product_update_error', { storeId, productId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في تعديل المنتج: ' + (err.message || 'غير معروف') });
  }
};

// حذف منتج
exports.deleteProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    logger.info('product_delete_attempt', { storeId, productId, userId });
    // التحقق من وجود المتجر
    // authorize
    let store;
    try {
      store = await authorizeStoreAccess(storeId, userId, req.user.role);
    } catch (e) {
      logger.warn('product_delete_auth_failed', { storeId, productId, userId, err: e.message });
      return res.status(e.status || 403).json({ message: e.message });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      logger.warn('product_delete_not_found', { storeId, productId });
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    await product.deleteOne();
    logger.info('product_deleted', { storeId, productId, productName: product.productName });
    res.status(200).json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    logger.error('product_delete_error', { storeId, productId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في حذف المنتج: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات
exports.getProducts = async (req, res) => {
  const { storeId } = req.params;
  const { category, random, limit, sort, filter, search, page } = req.query;

  try {
    logger.info('products_fetch_attempt', {
      storeId,
      category,
      random,
      limit,
      sort,
      filter,
      search,
      page
    });

    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('products_fetch_store_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // بناء الاستعلام
    const query = { storeId, isActive: true };
    if (category && category !== 'null') {
      query.category = category;
    }
    if (filter === 'offers') {
      query.hasOffer = true;
    }
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    let productsQuery = Product.find(query).populate({
      path: 'category',
      select: 'name',
      options: { lean: true }
    });

    // الترتيب
    if (sort === 'price-asc') {
      productsQuery = productsQuery.sort({ price: 1 });
    } else if (sort === 'price-desc') {
      productsQuery = productsQuery.sort({ price: -1 });
    } else if (sort === 'date-desc') {
      productsQuery = productsQuery.sort({ createdAt: -1 });
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // جلب عدد المنتجات الكلي
    const total = await Product.countDocuments(query);

    // جلب منتجات عشوائية
    if (random === 'true') {
      productsQuery = Product.aggregate([
        { $match: query },
        { $sample: { size: parseInt(limitNum) } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            storeId: 1,
            productName: 1,
            description: 1,
            price: 1,
            costPrice: 1,
            hasOffer: 1,
            originalPrice: 1,
            discountedPrice: 1,
            currency: 1,
            stock: 1,
            lowStockThreshold: 1,
            imageUrl: 1,
            images: 1,
            barcode: 1,
            generatedCodes: 1,
            salesCount: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
            category: {
              $cond: {
                if: { $eq: ['$category', {}] },
                then: null,
                else: { _id: '$category._id', name: '$category.name' }
              }
            }
          }
        }
      ]);
    } else {
      productsQuery = productsQuery.skip(skip).limit(limitNum);
    }

    let products = await productsQuery;
    if (random === 'true') {
      products = products.map(product => ({
        ...product,
        category: product.category ? { _id: product.category._id, name: product.category.name } : null
      }));
    }

    logger.info('products_fetch_success', {
      storeId,
      count: products.length,
      total,
      random: random === 'true',
      page: pageNum,
      limit: limitNum,
      category,
      sort,
      filter
    });
    res.status(200).json({ products, total });
  } catch (err) {
    logger.error('products_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب المنتجات: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات الأكثر مبيعاً
exports.getBestsellers = async (req, res) => {
  const { storeId } = req.params;
  const { limit = 4 } = req.query;

  try {
    logger.info('bestsellers_fetch_attempt', { storeId, limit });

    if (!mongoose.isValidObjectId(storeId)) {
      logger.warn('bestsellers_invalid_store_id', { storeId });
      return res.status(400).json({ message: 'معرف المتجر غير صالح' });
    }

    const storeIdObj = new mongoose.Types.ObjectId(storeId);

    const store = await Store.findById(storeIdObj);
    if (!store) {
      logger.warn('bestsellers_store_not_found', { storeId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // جلب المنتجات الأكثر مبيعاً بناءً على الطلبات
    let bestsellers = await Order.aggregate([
      { $match: { storeId: storeIdObj } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'product.category'
        }
      },
      { $unwind: { path: '$product.category', preserveNullAndEmptyArrays: true } },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$product',
              {
                category: {
                  $cond: {
                    if: { $eq: ['$product.category', []] },
                    then: null,
                    else: '$product.category'
                  }
                }
              }
            ]
          }
        }
      }
    ]);

    // إذا لم يكن هناك طلبات، جلب أحدث المنتجات
    if (bestsellers.length === 0) {
      logger.info('bestsellers_no_orders_fallback', { storeId });
      bestsellers = await Product.find({ storeId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate({
          path: 'category',
          select: 'name',
          options: { lean: true }
        });
    }

    logger.info('bestsellers_fetch_success', { storeId, count: bestsellers.length });
    res.status(200).json(bestsellers);
  } catch (err) {
    logger.error('bestsellers_fetch_error', { storeId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب المنتجات الأكثر مبيعاً: ' + (err.message || 'غير معروف') });
  }
};

// جلب منتج واحد
exports.getProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    logger.info('product_fetch_attempt', { storeId, productId, userId: userId || 'public' });
    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      logger.warn('product_fetch_store_not_found', { storeId, productId });
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId, isActive: true }).populate({
      path: 'category',
      select: 'name',
      options: { lean: true }
    });
    if (!product) {
      logger.warn('product_fetch_not_found', { storeId, productId });
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    logger.info('product_fetch_success', { storeId, productId, productName: product.productName, imageUrl: product.imageUrl });
    res.status(200).json(product);
  } catch (err) {
    logger.error('product_fetch_error', { storeId, productId, err: err.message, stack: err.stack });
    res.status(500).json({ message: 'خطأ في جلب المنتج: ' + (err.message || 'غير معروف') });
  }
};
