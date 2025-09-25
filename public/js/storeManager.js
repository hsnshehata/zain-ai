// /public/js/storeManager.js
async function loadStoreManagerPage() {
  console.log('🔍 loadStoreManagerPage called');
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/storeManager.css";
  document.head.appendChild(link);

  // إضافة CSS للإشعارات والبطاقات
  const style = document.createElement("style");
  style.innerHTML = `
    .toast {
      position: fixed; top: 20px; left: 20px; z-index: 1000;
      padding: 15px; border-radius: 5px; color: white; max-width: 300px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: opacity 0.3s ease;
    }
    .toast.success { background-color: #28a745; }
    .toast.error { background-color: #dc3545; }
    .offer-fields { display: none; margin-top: 10px; }
    .products-list {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: flex-start;
      margin-top: 20px;
    }
    .product-item {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      width: 200px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      transition: background-color var(--transition-speed) ease;
    }
    body.dark-mode .product-item {
      background-color: var(--dark-card);
      color: var(--dark-text);
      border-color: var(--dark-border);
    }
    body.light-mode .product-item {
      background-color: var(--light-card);
      color: var(--light-text);
      border-color: var(--light-border);
    }
    .product-item img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
    }
    .product-item h4 {
      margin: 10px 0;
      font-size: 16px;
    }
    .product-item p {
      margin: 5px 0;
      font-size: 14px;
    }
    .product-item button {
      margin-top: 10px;
      width: 100%;
    }
    .categories-list {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    .category-item {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      width: 200px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      transition: background-color var(--transition-speed) ease;
    }
    body.dark-mode .category-item {
      background-color: var(--dark-card);
      color: var(--dark-text);
      border-color: var(--dark-border);
    }
    body.light-mode .category-item {
      background-color: var(--light-card);
      color: var(--light-text);
      border-color: var(--light-border);
    }
    .category-item h4 {
      margin: 10px 0;
      font-size: 16px;
    }
    .category-item p {
      margin: 5px 0;
      font-size: 14px;
    }
    .category-item button {
      margin-top: 10px;
      width: 100%;
    }
  `;
  document.head.appendChild(style);

  const selectedBotId = localStorage.getItem("selectedBotId");
  if (!selectedBotId) {
    console.error("❌ No botId found in localStorage");
    return showNotification("يرجى تحديد بوت أولاً", "error");
  }

  const pageContent = document.querySelector(".page-content");
  pageContent.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-store"></i> إدارة المتجر الذكي</h2>
      <div class="header-actions">
        <button id="addProductBtn" class="btn btn-primary">إضافة منتج</button>
        <button id="addCategoryBtn" class="btn btn-primary">إضافة قسم</button>
        <button id="editStoreLinkBtn" class="btn btn-primary">تعديل رابط المتجر</button>
      </div>
    </div>
    <div class="instructions-container">
      <h3>تعليمات</h3>
      <p>يمكنك إضافة منتجات جديدة، تعديل المنتجات الحالية، أو حذفها. كما يمكنك إدارة الأقسام وتخصيص إعدادات المتجر.</p>
    </div>
    <div id="storeStatus" class="card"></div>
    <form id="storeSettingsForm" class="card" style="display: none;">
      <h3>إعدادات المتجر</h3>
      <div class="form-group">
        <label for="storeName">اسم المتجر</label>
        <input type="text" id="storeName" name="storeName" required />
      </div>
      <div class="form-group">
        <label for="templateId">القالب</label>
        <select id="templateId" name="templateId">
          <option value="1">القالب 1</option>
          <option value="2">القالب 2</option>
          <option value="3">القالب 3</option>
          <option value="4">القالب 4</option>
          <option value="5">القالب 5</option>
        </select>
      </div>
      <div class="form-group">
        <label for="primaryColor">اللون الأساسي</label>
        <input type="color" id="primaryColor" name="primaryColor" value="#000000" />
      </div>
      <div class="form-group">
        <label for="secondaryColor">اللون الثانوي</label>
        <input type="color" id="secondaryColor" name="secondaryColor" value="#ffffff" />
      </div>
      <div class="form-group">
        <label for="headerHtml">هيدر مخصص (HTML)</label>
        <textarea id="headerHtml" name="headerHtml"></textarea>
      </div>
      <div class="form-group">
        <label for="landingTemplateId">قالب صفحة الهبوط</label>
        <select id="landingTemplateId" name="landingTemplateId">
          <option value="1">قالب الهبوط 1</option>
          <option value="2">قالب الهبوط 2</option>
          <option value="3">قالب الهبوط 3</option>
          <option value="4">قالب الهبوط 4</option>
          <option value="5">قالب الهبوط 5</option>
        </select>
      </div>
      <div class="form-group">
        <label for="landingHtml">صفحة هبوط مخصصة (HTML)</label>
        <textarea id="landingHtml" name="landingHtml"></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">حفظ الإعدادات</button>
        <button type="button" id="cancelStoreSettingsBtn" class="btn btn-secondary">إلغاء</button>
      </div>
    </form>
    <form id="storeLinkEditForm" class="card" style="display: none;">
      <h3>تعديل رابط المتجر</h3>
      <div class="form-group">
        <label for="storeLinkSlug">رابط المتجر</label>
        <input type="text" id="storeLinkSlug" name="storeLinkSlug" placeholder="مثال: my-store" />
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">حفظ الرابط</button>
        <button type="button" id="cancelStoreLinkBtn" class="btn btn-secondary">إلغاء</button>
      </div>
    </form>
    <form id="productForm" class="card" style="display: none;">
      <h3>إضافة/تعديل منتج</h3>
      <div class="form-group">
        <label for="productName">اسم المنتج</label>
        <input type="text" id="productName" name="productName" required />
      </div>
      <div class="form-group">
        <label for="description">الوصف</label>
        <textarea id="description" name="description"></textarea>
      </div>
      <div class="form-group">
        <label for="price">السعر</label>
        <input type="number" id="price" name="price" required min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label for="hasOffer">هل يوجد عرض؟</label>
        <select id="hasOffer" name="hasOffer">
          <option value="no">لا</option>
          <option value="yes">نعم</option>
        </select>
      </div>
      <div class="offer-fields" id="offerFields">
        <div class="form-group">
          <label for="originalPrice">السعر الأصلي</label>
          <input type="number" id="originalPrice" name="originalPrice" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label for="discountedPrice">السعر بعد الخصم</label>
          <input type="number" id="discountedPrice" name="discountedPrice" min="0" step="0.01" />
        </div>
      </div>
      <div class="form-group">
        <label for="currency">العملة</label>
        <select id="currency" name="currency">
          <option value="EGP">جنيه مصري</option>
          <option value="USD">دولار أمريكي</option>
          <option value="SAR">ريال سعودي</option>
        </select>
      </div>
      <div class="form-group">
        <label for="stock">المخزون</label>
        <input type="number" id="stock" name="stock" required min="0" />
      </div>
      <div class="form-group">
        <label for="lowStockThreshold">عتبة المخزون المنخفض</label>
        <input type="number" id="lowStockThreshold" name="lowStockThreshold" min="0" value="10" />
      </div>
      <div class="form-group">
        <label for="category">القسم</label>
        <select id="category" name="category">
          <option value="">بدون قسم</option>
        </select>
      </div>
      <div class="form-group">
        <label for="image">صورة المنتج</label>
        <input type="file" id="image" name="image" accept="image/png,image/jpeg" />
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">حفظ المنتج</button>
        <button type="button" id="cancelProductBtn" class="btn btn-secondary">إلغاء</button>
      </div>
    </form>
    <form id="categoryForm" class="card" style="display: none;">
      <h3>إضافة/تعديل قسم</h3>
      <div class="form-group">
        <label for="categoryName">اسم القسم</label>
        <input type="text" id="categoryName" name="categoryName" required />
      </div>
      <div class="form-group">
        <label for="categoryDescription">الوصف</label>
        <textarea id="categoryDescription" name="categoryDescription"></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">حفظ القسم</button>
        <button type="button" id="cancelCategoryBtn" class="btn btn-secondary">إلغاء</button>
      </div>
    </form>
    <div id="productsList" class="products-list"></div>
    <div id="categoriesList" class="categories-list"></div>
  `;

  const storeStatus = document.getElementById("storeStatus");
  const storeSettingsForm = document.getElementById("storeSettingsForm");
  const storeLinkEditForm = document.getElementById("storeLinkEditForm");
  const productForm = document.getElementById("productForm");
  const categoryForm = document.getElementById("categoryForm");
  const addProductBtn = document.getElementById("addProductBtn");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const editStoreLinkBtn = document.getElementById("editStoreLinkBtn");
  const cancelStoreSettingsBtn = document.getElementById("cancelStoreSettingsBtn");
  const cancelStoreLinkBtn = document.getElementById("cancelStoreLinkBtn");
  const cancelProductBtn = document.getElementById("cancelProductBtn");
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  const hasOfferSelect = document.getElementById("hasOffer");
  const offerFields = document.getElementById("offerFields");
  const productsList = document.getElementById("productsList");
  const categoriesList = document.getElementById("categoriesList");
  const storeLinkEditContainer = storeLinkEditForm;
  const storeLinkSlugInput = document.getElementById("storeLinkSlug");
  let editingProductId = null;
  let editingCategoryId = null;

  async function handleApiRequest(url, options = {}) {
    console.log(`[${new Date().toISOString()}] 📡 Sending request to ${url}`);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[${new Date().toISOString()}] ❌ API Error Response:`, errorData);
        throw new Error(errorData.message || "خطأ في الطلب");
      }
      return await response.json();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] API Error:`, err);
      throw err;
    }
  }

  async function showNotification(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  async function loadStoreStatus(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      storeStatus.innerHTML = bot.storeId
        ? `
            <h3>حالة المتجر</h3>
            <p>المتجر مفعل. <a href="/store/${bot.storeId}" target="_blank">عرض المتجر</a></p>
          `
        : `
            <h3>حالة المتجر</h3>
            <p>لم يتم إنشاء متجر بعد. أنشئ متجرك الآن!</p>
            <button id="createStoreBtn" class="btn btn-primary">إنشاء متجر</button>
          `;
      const createStoreBtn = document.getElementById("createStoreBtn");
      if (createStoreBtn) {
        createStoreBtn.addEventListener("click", async () => {
          try {
            const store = await handleApiRequest("/api/stores", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ selectedBotId: botId }),
            });
            showNotification("تم إنشاء المتجر بنجاح!", "success");
            await loadStoreStatus(botId);
            await loadStoreSettings(botId);
            await loadProducts(botId);
            await loadCategories(botId);
          } catch (err) {
            showNotification("خطأ في إنشاء المتجر: " + err.message, "error");
          }
        });
      }
    } catch (err) {
      showNotification("خطأ في جلب حالة المتجر: " + err.message, "error");
    }
  }

  async function loadStoreSettings(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) {
        storeSettingsForm.style.display = "none";
        return;
      }
      const store = await handleApiRequest(`/api/stores/${bot.storeId}`);
      document.getElementById("storeName").value = store.storeName;
      document.getElementById("templateId").value = store.templateId;
      document.getElementById("primaryColor").value = store.primaryColor;
      document.getElementById("secondaryColor").value = store.secondaryColor;
      document.getElementById("headerHtml").value = store.headerHtml;
      document.getElementById("landingTemplateId").value = store.landingTemplateId;
      document.getElementById("landingHtml").value = store.landingHtml;
      storeSettingsForm.style.display = "block";
    } catch (err) {
      showNotification("خطأ في جلب إعدادات المتجر: " + err.message, "error");
    }
  }

  async function saveStoreSettings(botId, formData) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Saving store settings for bot ${botId}:`, Object.fromEntries(formData));
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      showNotification("تم حفظ إعدادات المتجر بنجاح!", "success");
      return store;
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving store settings:`, err);
      showNotification("خطأ في حفظ المتجر: " + err.message, "error");
      throw err;
    }
  }

  async function saveStoreLink(botId, storeLinkSlug) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeLinkSlug }),
      });
      showNotification("تم حفظ رابط المتجر بنجاح!", "success");
      return store;
    } catch (err) {
      showNotification("خطأ في حفظ رابط المتجر: " + err.message, "error");
      throw err;
    }
  }

  async function loadProducts(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Loading products for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) return;
      console.log(`[${new Date().toISOString()}] 📡 Fetching products for store ${bot.storeId}`);
      const products = await handleApiRequest(`/api/stores/${bot.storeId}/products`);
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${products.length} products for store ${bot.storeId}`);
      productsList.innerHTML = "";
      products.forEach((product) => {
        const productItem = document.createElement("div");
        productItem.className = "product-item";
        productItem.innerHTML = `
          <img src="${product.imageUrl || "/images/placeholder.png"}" alt="${product.productName}" />
          <h4>${product.productName}</h4>
          <p>السعر: ${product.price} ${product.currency}</p>
          <p>المخزون: ${product.stock}</p>
          <button onclick="window.editProduct('${product._id}')">تعديل</button>
          <button onclick="window.deleteProduct('${product._id}')">حذف</button>
        `;
        productsList.appendChild(productItem);
      });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading products:`, err);
      showNotification("خطأ في جلب المنتجات: " + err.message, "error");
    }
  }

  async function loadCategories(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Loading categories for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) {
        categoriesList.innerHTML = '<p class="error-message">المتجر غير موجود، يرجى إنشاء متجر أولاً</p>';
        return;
      }
      console.log(`[${new Date().toISOString()}] 📡 Fetching categories for store ${bot.storeId}`);
      const categories = await handleApiRequest(`/api/stores/${bot.storeId}/categories`);
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${categories.length} categories for store ${bot.storeId}`);
      categoriesList.innerHTML = "";
      if (categories.length === 0) {
        categoriesList.innerHTML = '<p class="error-message">لا توجد أقسام متاحة</p>';
        return;
      }
      categories.forEach((category) => {
        const categoryItem = document.createElement("div");
        categoryItem.className = "category-item";
        categoryItem.innerHTML = `
          <h4>${category.name}</h4>
          <p>${category.description || "بدون وصف"}</p>
          <button onclick="window.editCategory('${category._id}')">تعديل</button>
          <button onclick="window.deleteCategory('${category._id}')">حذف</button>
        `;
        categoriesList.appendChild(categoryItem);
      });
      const categorySelect = document.getElementById("category");
      categorySelect.innerHTML = '<option value="">بدون قسم</option>';
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category._id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading categories:`, err);
      showNotification("خطأ في جلب الأقسام: " + err.message, "error");
      categoriesList.innerHTML = '<p class="error-message">خطأ في جلب الأقسام، حاول مرة أخرى</p>';
    }
  }

  async function saveProduct(botId, formData, imageFile) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Saving product for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const data = new FormData();
      formData.forEach((value, key) => data.append(key, value));
      if (imageFile) data.append("image", imageFile);
      const url = editingProductId
        ? `/api/stores/${bot.storeId}/products/${editingProductId}`
        : `/api/stores/${bot.storeId}/products`;
      const method = editingProductId ? "PUT" : "POST";
      const product = await handleApiRequest(url, {
        method,
        body: data,
      });
      showNotification(`تم ${editingProductId ? "تعديل" : "إضافة"} المنتج بنجاح!`, "success");
      return product;
    } catch (err) {
      showNotification("خطأ في حفظ المنتج: " + err.message, "error");
      throw err;
    }
  }

  async function deleteProduct(productId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Deleting product ${productId}`);
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
        method: "DELETE",
      });
      showNotification("تم حذف المنتج بنجاح!", "success");
      await loadProducts(selectedBotId);
    } catch (err) {
      showNotification("خطأ في حذف المنتج: " + err.message, "error");
    }
  }

  async function editProduct(productId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Editing product ${productId} for bot ${selectedBotId}`);
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const product = await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`);
      editingProductId = productId;
      document.getElementById("productName").value = product.productName;
      document.getElementById("description").value = product.description;
      document.getElementById("price").value = product.price;
      document.getElementById("hasOffer").value = product.hasOffer ? "yes" : "no";
      document.getElementById("originalPrice").value = product.originalPrice || "";
      document.getElementById("discountedPrice").value = product.discountedPrice || "";
      document.getElementById("currency").value = product.currency;
      document.getElementById("stock").value = product.stock;
      document.getElementById("lowStockThreshold").value = product.lowStockThreshold;
      document.getElementById("category").value = product.category || "";
      offerFields.style.display = product.hasOffer ? "block" : "none";
      productForm.style.display = "block";
      document.getElementById("productName").focus();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading product:`, err);
      showNotification("خطأ في تحميل المنتج: " + err.message, "error");
    }
  }

  async function saveCategory(botId, formData) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Saving category for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const url = editingCategoryId
        ? `/api/stores/${bot.storeId}/categories/${editingCategoryId}`
        : `/api/stores/${bot.storeId}/categories`;
      const method = editingCategoryId ? "PUT" : "POST";
      const category = await handleApiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      showNotification(`تم ${editingCategoryId ? "تعديل" : "إضافة"} القسم بنجاح!`, "success");
      return category;
    } catch (err) {
      showNotification("خطأ في حفظ القسم: " + err.message, "error");
      throw err;
    }
  }

  async function deleteCategory(categoryId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Deleting category ${categoryId}`);
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      await handleApiRequest(`/api/stores/${bot.storeId}/categories/${categoryId}`, {
        method: "DELETE",
      });
      showNotification("تم حذف القسم بنجاح!", "success");
      await loadCategories(selectedBotId);
    } catch (err) {
      showNotification("خطأ في حذف القسم: " + err.message, "error");
    }
  }

  async function editCategory(categoryId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Editing category ${categoryId}`);
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`);
      if (!bot.storeId) throw new Error("المتجر غير موجود");
      const category = await handleApiRequest(`/api/stores/${bot.storeId}/categories/${categoryId}`);
      editingCategoryId = categoryId;
      document.getElementById("categoryName").value = category.name;
      document.getElementById("categoryDescription").value = category.description;
      categoryForm.style.display = "block";
      document.getElementById("categoryName").focus();
    } catch (err) {
      showNotification("خطأ في تحميل القسم: " + err.message, "error");
    }
  }

  async function checkStoreExists(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Checking store existence for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`);
      if (!bot.storeId) {
        console.log(`[${new Date().toISOString()}] ❌ No store found for bot ${botId}`);
        return false;
      }
      console.log(`[${new Date().toISOString()}] ✅ Store exists for bot ${botId}: ${bot.storeId}`);
      return true;
    } catch (err) {
      console.error("خطأ في التحقق من وجود المتجر:", err);
      showNotification("خطأ في التحقق من وجود المتجر: " + err.message, "error");
      return false;
    }
  }

  storeSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(storeSettingsForm);
    try {
      await saveStoreSettings(selectedBotId, formData);
      storeSettingsForm.style.display = "none";
    } catch (err) {}
  });

  storeLinkEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const storeLinkSlug = storeLinkSlugInput.value;
    try {
      await saveStoreLink(selectedBotId, storeLinkSlug);
      storeLinkEditForm.style.display = "none";
    } catch (err) {}
  });

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const imageFile = document.getElementById("image").files[0];
    try {
      await saveProduct(selectedBotId, formData, imageFile);
      productForm.style.display = "none";
      productForm.reset();
      offerFields.style.display = "none";
      editingProductId = null;
      await loadProducts(selectedBotId);
    } catch (err) {}
  });

  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(categoryForm);
    try {
      await saveCategory(selectedBotId, formData);
      categoryForm.style.display = "none";
      categoryForm.reset();
      editingCategoryId = null;
      await loadCategories(selectedBotId);
    } catch (err) {}
  });

  addCategoryBtn.addEventListener("click", () => {
    categoryForm.style.display = "block";
    categoryForm.reset();
    editingCategoryId = null;
    document.getElementById("categoryName").focus();
  });

  cancelCategoryBtn.addEventListener("click", () => {
    categoryForm.style.display = "none";
    categoryForm.reset();
    editingCategoryId = null;
  });

  addProductBtn.addEventListener("click", () => {
    productForm.style.display = "block";
    productForm.reset();
    offerFields.style.display = "none";
    editingProductId = null;
    document.getElementById("productName").focus();
  });

  cancelProductBtn.addEventListener("click", () => {
    productForm.style.display = "none";
    productForm.reset();
    offerFields.style.display = "none";
    editingProductId = null;
  });

  editStoreLinkBtn.addEventListener("click", () => {
    storeLinkEditForm.style.display = "block";
    storeLinkSlugInput.focus();
  });

  cancelStoreLinkBtn.addEventListener("click", () => {
    storeLinkEditForm.style.display = "none";
    storeLinkEditForm.reset();
  });

  cancelStoreSettingsBtn.addEventListener("click", () => {
    storeSettingsForm.style.display = "none";
  });

  hasOfferSelect.addEventListener("change", () => {
    offerFields.style.display = hasOfferSelect.value === "yes" ? "block" : "none";
  });

  window.editProduct = editProduct;
  window.deleteProduct = deleteProduct;
  window.editCategory = editCategory;
  window.deleteCategory = deleteCategory;

  // Initial Load
  await loadStoreStatus(selectedBotId);
  await loadStoreSettings(selectedBotId);
  if (await checkStoreExists(selectedBotId)) {
    await loadProducts(selectedBotId);
    await loadCategories(selectedBotId);
  }
}

async function checkStoreExists(botId) {
  try {
    console.log(`[${new Date().toISOString()}] 📡 Checking store existence for bot ${botId}`);
    const response = await fetch(`/api/bots/${botId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const bot = await response.json();
    if (!bot.storeId) {
      console.log(`[${new Date().toISOString()}] ❌ No store found for bot ${botId}`);
      return false;
    }
    console.log(`[${new Date().toISOString()}] ✅ Store exists for bot ${botId}: ${bot.storeId}`);
    return true;
  } catch (err) {
    console.error("خطأ في التحقق من وجود المتجر:", err);
    showNotification("خطأ في التحقق من وجود المتجر: " + err.message, "error");
    return false;
  }
}

window.loadStoreManagerPage = loadStoreManagerPage;

if (window.loadStoreManagerPage) {
  console.log('✅ loadStoreManagerPage is defined and ready');
} else {
  console.error('❌ loadStoreManagerPage is not defined');
}
