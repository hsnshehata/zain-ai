// /server/controllers/productController.js
const Product = require('../models/Product');
const Store = require('../models/Store');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { uploadToImgbb } = require('./uploadController');
const mongoose = require('mongoose');

// دالة مساعدة لإضافة timestamp للـ logs
const getTimestamp = () => new Date().toISOString();

// إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  const { storeId } = req.params;
  const { productName, description, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    console.log(`[${getTimestamp()}] 📡 Creating product for store ${storeId} with data:`, {
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
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من الحقول المطلوبة
    if (!productName || !price || !currency || stock === undefined) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Missing required fields`, {
        productName,
        price,
        currency,
        stock
      });
      return res.status(400).json({ message: 'اسم المنتج، السعر، العملة، والمخزون مطلوبة' });
    }

    // التحقق من حقول العرض
    const offerEnabled = hasOffer === "yes" || hasOffer === true;
    if (offerEnabled && (!originalPrice || !discountedPrice)) {
      console.log(`[${getTimestamp()}] ❌ Create product failed: Missing offer fields`);
      return res.status(400).json({ message: 'السعر الأصلي والسعر بعد الخصم مطلوبان عند تفعيل العرض' });
    }

    // التحقق من القسم إذا تم إرساله
    if (category && category !== 'null') {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        console.log(`[${getTimestamp()}] ❌ Create product failed: Category ${category} not found in store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
    }

    // رفع الصورة إذا وجدت
    let imageUrl = '';
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        imageUrl = uploadResult.url;
        console.log(`[${getTimestamp()}] ✅ Image uploaded successfully: ${imageUrl}`);
      } catch (uploadErr) {
        console.error(`[${getTimestamp()}] ❌ Error uploading image:`, uploadErr.message);
        return res.status(500).json({ message: 'خطأ في رفع الصورة: ' + uploadErr.message });
      }
    }

    // إنشاء المنتج
    const newProduct = new Product({
      storeId,
      productName,
      description: description || '',
      price: parseFloat(price),
      hasOffer: offerEnabled,
      originalPrice: offerEnabled ? parseFloat(originalPrice) : undefined,
      discountedPrice: offerEnabled ? parseFloat(discountedPrice) : undefined,
      currency,
      stock: parseInt(stock),
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      category: category && category !== 'null' ? category : null,
      imageUrl,
      isActive: true,
      salesCount: 0 // إضافة salesCount افتراضي
    });

    await newProduct.save();
    console.log(`[${getTimestamp()}] ✅ Product created: ${productName} for store ${storeId}, imageUrl: ${imageUrl}`);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error creating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في إنشاء المنتج: ' + (err.message || 'غير معروف') });
  }
};

// تعديل منتج
exports.updateProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const { productName, description, price, hasOffer, originalPrice, discountedPrice, currency, stock, lowStockThreshold, category } = req.body;
  const userId = req.user.userId;
  const file = req.file;

  try {
    console.log(`[${getTimestamp()}] 📡 Updating product ${productId} for store ${storeId} with data:`, {
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
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId }).populate('category');
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Update product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // التحقق من القسم إذا تم إرساله
    if (category && category !== 'null') {
      const categoryExists = await Category.findOne({ _id: category, storeId });
      if (!categoryExists) {
        console.log(`[${getTimestamp()}] ❌ Update product failed: Category ${category} not found in store ${storeId}`);
        return res.status(404).json({ message: 'القسم غير موجود' });
      }
    }

    // رفع الصورة إذا وجدت
    if (file) {
      try {
        const uploadResult = await uploadToImgbb(file);
        product.imageUrl = uploadResult.url;
        console.log(`[${getTimestamp()}] ✅ Image updated successfully: ${product.imageUrl}`);
      } catch (uploadErr) {
        console.error(`[${getTimestamp()}] ❌ Error uploading image:`, uploadErr.message);
        return res.status(500).json({ message: 'خطأ في رفع الصورة: ' + uploadErr.message });
      }
    }

    // تحديث الحقول
    product.productName = productName || product.productName;
    product.description = description !== undefined ? description : product.description;
    product.price = price !== undefined ? parseFloat(price) : product.price;
    product.hasOffer = hasOffer === "yes" || hasOffer === true;
    product.originalPrice = product.hasOffer ? parseFloat(originalPrice) : undefined;
    product.discountedPrice = product.hasOffer ? parseFloat(discountedPrice) : undefined;
    product.currency = currency || product.currency;
    product.stock = stock !== undefined ? parseInt(stock) : product.stock;
    product.lowStockThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.lowStockThreshold;
    product.category = category && category !== 'null' ? category : product.category;
    product.isActive = true;
    product.salesCount = product.salesCount || 0; // التأكد من وجود salesCount

    await product.save();
    console.log(`[${getTimestamp()}] ✅ Product updated: ${product.productName} for store ${storeId}, imageUrl: ${product.imageUrl}`);
    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error updating product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في تعديل المنتج: ' + (err.message || 'غير معروف') });
  }
};

// حذف منتج
exports.deleteProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user.userId;

  try {
    console.log(`[${getTimestamp()}] 📡 Deleting product ${productId} from store ${storeId}, user ${userId}`);
    // التحقق من وجود المتجر
    const store = await Store.findOne({ _id: storeId, userId });
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Store ${storeId} not found for user ${userId}`);
      return res.status(404).json({ message: 'المتجر غير موجود أو لا تملكه' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Delete product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    await product.deleteOne();
    console.log(`[${getTimestamp()}] ✅ Product deleted: ${product.productName} from store ${storeId}`);
    res.status(200).json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error deleting product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في حذف المنتج: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات
exports.getProducts = async (req, res) => {
  const { storeId } = req.params;
  const { category, random, limit, sort, filter, search, page } = req.query;

  try {
    console.log(`[${getTimestamp()}] 📡 Fetching products for store ${storeId} with query:`, {
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
      console.log(`[${getTimestamp()}] ❌ Get products failed: Store ${storeId} not found`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // بناء الاستعلام
    const query = { storeId, isActive: true }; // إزالة شرط stock لعرض كل المنتجات
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
        { $sample: { size: limitNum } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
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

    console.log(`[${getTimestamp()}] ✅ Fetched ${products.length} products for store ${storeId}, total: ${total}`);
    res.status(200).json({ products, total });
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching products for store ${storeId}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتجات: ' + (err.message || 'غير معروف') });
  }
};

// جلب المنتجات الأكثر مبيعاً
exports.getBestsellers = async (req, res) => {
  const { storeId } = req.params;
  const { limit = 4 } = req.query;

  try {
    console.log(`[${getTimestamp()}] 📡 Fetching bestsellers for store ${storeId} with limit: ${limit}`);

    // التحقق من وجود المتجر
    let storeIdObj;
    try {
      storeIdObj = mongoose.Types.ObjectId(storeId);
    } catch (err) {
      console.log(`[${getTimestamp()}] ❌ Get bestsellers failed: Invalid storeId ${storeId}`);
      return res.status(400).json({ message: 'معرف المتجر غير صالح' });
    }

    const store = await Store.findById(storeIdObj);
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get bestsellers failed: Store ${storeId} not found`);
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
      { $match: { 'product.isActive': true } }, // إزالة شرط stock
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
      console.log(`[${getTimestamp()}] ⚠️ No orders found, fetching recent products instead for store ${storeId}`);
      bestsellers = await Product.find({ storeId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate({
          path: 'category',
          select: 'name',
          options: { lean: true }
        });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched ${bestsellers.length} bestsellers for store ${storeId}`);
    res.status(200).json(bestsellers);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching bestsellers for store ${storeId}:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتجات الأكثر مبيعاً: ' + (err.message || 'غير معروف') });
  }
};

// جلب منتج واحد
exports.getProduct = async (req, res) => {
  const { storeId, productId } = req.params;
  const userId = req.user ? req.user.userId : null;

  try {
    console.log(`[${getTimestamp()}] 📡 Fetching product ${productId} for store ${storeId}, user ${userId || 'public'}`);
    // التحقق من وجود المتجر
    const store = await Store.findById(storeId);
    if (!store) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Store ${storeId} not found`);
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    // التحقق من وجود المنتج
    const product = await Product.findOne({ _id: productId, storeId, isActive: true }).populate({
      path: 'category',
      select: 'name',
      options: { lean: true }
    });
    if (!product) {
      console.log(`[${getTimestamp()}] ❌ Get product failed: Product ${productId} not found in store ${storeId}`);
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    console.log(`[${getTimestamp()}] ✅ Fetched product: ${product.productName} for store ${storeId}, imageUrl: ${product.imageUrl}`);
    res.status(200).json(product);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error fetching product:`, err.message, err.stack);
    res.status(500).json({ message: 'خطأ في جلب المنتج: ' + (err.message || 'غير معروف') });
  }
};
