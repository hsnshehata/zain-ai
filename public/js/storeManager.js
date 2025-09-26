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
    }
    .add-product-btn {
      margin-bottom: 20px;
    }
  `;
  document.head.appendChild(style);

  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض إعدادات المتجر.</p>
      </div>
    `;
    return;
  }

  if (!token) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
        <p>يرجى تسجيل الدخول لعرض إعدادات المتجر.</p>
      </div>
    `;
    return;
  }

  // Main structure for the store settings page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-store"></i> إدارة المتجر الذكي</h2>
      <div class="header-actions">
        <button id="toggleInstructionsBtn" class="btn btn-secondary"><i class="fas fa-info-circle"></i> إظهار التعليمات</button>
        <div id="storeStatus" class="page-status" style="margin-left: 20px;"></div>
      </div>
      <div class="section-buttons">
        <button id="storeSettingsBtn" class="btn btn-primary active">إعدادات المتجر</button>
        <button id="productsBtn" class="btn btn-primary">إضافة منتج</button>
        <button id="categoriesBtn" class="btn btn-primary">الأقسام</button>
      </div>
    </div>

    <div id="instructionsContainer" class="instructions-container" style="display: none;">
      <h3>📋 خطوات إنشاء وإدارة متجرك الذكي</h3>
      <p>عشان تقدر تدير متجرك بسهولة، اتّبع الخطوات دي:</p>
      <ul>
        <li><strong>1. إنشاء المتجر:</strong> اضغط على زرار "إنشاء المتجر" عشان تعمل متجر جديد بإعدادات افتراضية، وبعدين عدّل الإعدادات زي ما تحب.</li>
        <li><strong>2. تعديل رابط المتجر:</strong> اضغط على زرار "تعديل رابط المتجر" عشان تغيّر الجزء المتغير من الرابط (مثل metjar-8777).</li>
        <li><strong>3. زيارة المتجر:</strong> اضغط على زرار "الذهاب إلى المتجر" عشان تشوف متجرك مباشرة.</li>
        <li><strong>4. إضافة المنتجات:</strong> بعد إنشاء المتجر، أضف منتجاتك بالاسم، الوصف، السعر، العملة، والمخزون.<br>
          <span style="display: block; margin-top: 5px;">
            - الصور لازم تكون بصيغة PNG أو JPG، ويفضل تكون مربعة.<br>
            - حدد عتبة المخزون المنخفض عشان تتلقى إشعارات لو المخزون قل.
          </span></li>
        <li><strong>5. إدارة الأقسام:</strong> أنشئ أقسام لتنظيم المنتجات، وأضف منتجات لكل قسم.</li>
        <li><strong>6. تخصيص الواجهة:</strong> اختار قالب (كلاسيكي، مودرن، إلخ)، وعدّل الألوان أو أضف HTML مخصص للهيدر أو اللاندينج بيج.</li>
        <li><strong>7. إدارة الطلبات:</strong> الطلبات هتظهر في صفحة الحسابات (تحت الإنشاء) مع إشعارات تلقائية لواتساب.</li>
      </ul>
    </div>

    <div id="notificationContainer"></div>
    <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>

    <div id="createStoreContainer" class="settings-container" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-store-alt"></i> إنشاء متجر جديد</h3></div>
        <div class="card-body">
          <p>اضغط على الزر أدناه لإنشاء متجر جديد بإعدادات افتراضية. بعد الإنشاء، يمكنك تعديل الإعدادات وإضافة المنتجات.</p>
          <button id="createStoreBtn" class="btn btn-primary"><i class="fas fa-plus"></i> إنشاء المتجر</button>
        </div>
      </div>
    </div>

    <div id="storeSettingsContainer" class="settings-container store-settings-grid">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-store-alt"></i> إعدادات المتجر</h3></div>
        <div class="card-body">
          <form id="store-form">
            <div class="form-group">
              <label for="storeName">اسم المتجر</label>
              <input type="text" id="storeName" name="storeName" class="form-control">
              <small class="form-text">يمكنك تغيير اسم المتجر هنا</small>
            </div>
            <div class="form-group">
              <label for="storeLink">رابط المتجر الكامل</label>
              <input type="text" id="storeLink" name="storeLink" class="form-control" readonly>
              <small class="form-text">اضغط على الزر عشان تزور متجرك أو تعدّل الرابط</small>
              <button type="button" id="goToStoreBtn" class="btn btn-primary" style="margin-top: 10px; margin-right: 10px;" disabled><i class="fas fa-external-link-alt"></i> الذهاب إلى المتجر</button>
              <button type="button" id="editStoreLinkBtn" class="btn btn-secondary" style="margin-top: 10px;" disabled><i class="fas fa-edit"></i> تعديل رابط المتجر</button>
              <div id="storeLinkEditContainer" style="display: none; margin-top: 10px;">
                <label for="storeLinkSlug">الجزء المتغير من الرابط</label>
                <input type="text" id="storeLinkSlug" name="storeLinkSlug" class="form-control" placeholder="مثل metjar-8777">
                <small class="form-text">اكتب الجزء المتغير من الرابط (حروف، أرقام، - أو _ فقط)</small>
              </div>
            </div>
            <div class="form-group">
              <label for="templateId">القالب</label>
              <select id="templateId" name="templateId" class="form-control">
                <option value="1">كلاسيكي</option>
                <option value="2">مودرن</option>
                <option value="3">بسيط</option>
                <option value="4">إبداعي</option>
                <option value="5">تجاري</option>
              </select>
            </div>
            <div class="form-group">
              <label for="primaryColor">اللون الأساسي</label>
              <input type="color" id="primaryColor" name="primaryColor" class="form-control" value="#000000">
            </div>
            <div class="form-group">
              <label for="secondaryColor">اللون الثانوي</label>
              <input type="color" id="secondaryColor" name="secondaryColor" class="form-control" value="#ffffff">
            </div>
            <div class="form-group">
              <label for="headerHtml">كود HTML للهيدر</label>
              <textarea id="headerHtml" name="headerHtml" class="form-control" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label for="landingTemplateId">قالب اللاندينج بيج</label>
              <select id="landingTemplateId" name="landingTemplateId" class="form-control">
                <option value="1">كلاسيكي</option>
                <option value="2">مودرن</option>
                <option value="3">بسيط</option>
                <option value="4">إبداعي</option>
                <option value="5">تجاري</option>
              </select>
            </div>
            <div class="form-group">
              <label for="landingHtml">كود HTML للاندينج بيج</label>
              <textarea id="landingHtml" name="landingHtml" class="form-control" rows="4"></textarea>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </form>
        </div>
      </div>
    </div>

    <div id="productsContainer" class="settings-container" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-box"></i> إدارة المنتجات</h3></div>
        <div class="card-body">
          <button id="addProductBtn" class="btn btn-primary add-product-btn"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
          <form id="product-form" enctype="multipart/form-data" style="display: none;">
            <div class="form-group">
              <label for="productName">اسم المنتج</label>
              <input type="text" id="productName" name="productName" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="description">الوصف</label>
              <textarea id="description" name="description" class="form-control" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label for="price">السعر</label>
              <input type="number" id="price" name="price" class="form-control" required min="0" step="0.01">
            </div>
            <div class="form-group">
              <label for="hasOffer">هل يوجد عرض على المنتج؟</label>
              <select id="hasOffer" name="hasOffer" class="form-control">
                <option value="no">لا</option>
                <option value="yes">نعم</option>
              </select>
            </div>
            <div id="offerFields" class="offer-fields">
              <div class="form-group">
                <label for="originalPrice">السعر قبل الخصم</label>
                <input type="number" id="originalPrice" name="originalPrice" class="form-control" min="0" step="0.01">
              </div>
              <div class="form-group">
                <label for="discountedPrice">السعر بعد الخصم</label>
                <input type="number" id="discountedPrice" name="discountedPrice" class="form-control" min="0" step="0.01">
              </div>
            </div>
            <div class="form-group">
              <label for="currency">العملة</label>
              <select id="currency" name="currency" class="form-control" required>
                <option value="EGP">جنيه مصري</option>
                <option value="USD">دولار أمريكي</option>
                <option value="SAR">ريال سعودي</option>
              </select>
            </div>
            <div class="form-group">
              <label for="stock">المخزون</label>
              <input type="number" id="stock" name="stock" class="form-control" required min="0">
            </div>
            <div class="form-group">
              <label for="lowStockThreshold">عتبة المخزون المنخفض</label>
              <input type="number" id="lowStockThreshold" name="lowStockThreshold" class="form-control" min="0">
            </div>
            <div class="form-group">
              <label for="category">التصنيف</label>
              <select id="category" name="category" class="form-control">
                <option value="">اختر قسم</option>
              </select>
            </div>
            <div class="form-group">
              <label for="image">صورة المنتج (اختياري)</label>
              <input type="file" id="image" name="image" class="form-control" accept="image/png,image/jpeg">
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ المنتج</button>
            <button type="button" id="cancelProductBtn" class="btn btn-secondary" style="margin-left: 10px;">إلغاء</button>
          </form>
          <div id="productsList" class="products-list"></div>
        </div>
      </div>
    </div>

    <div id="categoriesContainer" class="settings-container" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-list"></i> إدارة الأقسام</h3></div>
        <div class="card-body">
          <button id="createCategoryBtn" class="btn btn-primary" style="margin-bottom: 20px;"><i class="fas fa-plus"></i> إنشاء قسم جديد</button>
          <form id="category-form" style="display: none;">
            <div class="form-group">
              <label for="categoryName">اسم القسم</label>
              <input type="text" id="categoryName" name="categoryName" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="categoryDescription">وصف القسم</label>
              <textarea id="categoryDescription" name="categoryDescription" class="form-control" rows="4"></textarea>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ القسم</button>
            <button type="button" id="cancelCategoryBtn" class="btn btn-secondary" style="margin-left: 10px;">إلغاء</button>
          </form>
          <div id="categoriesList" class="categories-list"></div>
        </div>
      </div>
    </div>
  `;

  const toggleInstructionsBtn = document.getElementById("toggleInstructionsBtn");
  const instructionsContainer = document.getElementById("instructionsContainer");
  const storeForm = document.getElementById("store-form");
  const productForm = document.getElementById("product-form");
  const categoryForm = document.getElementById("category-form");
  const createStoreBtn = document.getElementById("createStoreBtn");
  const storeSettingsContainer = document.getElementById("storeSettingsContainer");
  const createStoreContainer = document.getElementById("createStoreContainer");
  const productsContainer = document.getElementById("productsContainer");
  const categoriesContainer = document.getElementById("categoriesContainer");
  const storeSettingsBtn = document.getElementById("storeSettingsBtn");
  const productsBtn = document.getElementById("productsBtn");
  const categoriesBtn = document.getElementById("categoriesBtn");
  const createCategoryBtn = document.getElementById("createCategoryBtn");
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  const addProductBtn = document.getElementById("addProductBtn");
  const cancelProductBtn = document.getElementById("cancelProductBtn");
  const goToStoreBtn = document.getElementById("goToStoreBtn");
  const editStoreLinkBtn = document.getElementById("editStoreLinkBtn");
  const storeNameInput = document.getElementById("storeName");
  const storeLinkInput = document.getElementById("storeLink");
  const storeLinkEditContainer = document.getElementById("storeLinkEditContainer");
  const storeLinkSlugInput = document.getElementById("storeLinkSlug");
  const hasOfferSelect = document.getElementById("hasOffer");
  const offerFields = document.getElementById("offerFields");
  const loadingSpinner = document.getElementById("loadingSpinner");

  function showSection(section) {
    storeSettingsContainer.style.display = section === "storeSettings" ? "grid" : "none";
    productsContainer.style.display = section === "products" ? "block" : "none";
    categoriesContainer.style.display = section === "categories" ? "block" : "none";
    storeSettingsBtn.classList.toggle("active", section === "storeSettings");
    productsBtn.classList.toggle("active", section === "products");
    categoriesBtn.classList.toggle("active", section === "categories");
  }

  async function handleApiRequest(url, options, errorMessage) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Sending request to ${url}`);
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error("خطأ في السيرفر، الرجاء المحاولة لاحقًا");
        }
        console.error(`[${new Date().toISOString()}] ❌ API Error Response:`, errorData);
        throw new Error(errorData.message || errorMessage);
      }
      return await response.json();
    } catch (err) {
      console.error("API Error:", err);
      showNotification(err.message, "error");
      throw err;
    }
  }

  function showNotification(message, type) {
    const notificationContainer = document.getElementById("notificationContainer");
    if (!notificationContainer) {
      console.error("notificationContainer not found in DOM");
      return;
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    notificationContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function loadStoreStatus(botId) {
    try {
      loadingSpinner.style.display = "block";
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      const storeStatus = document.getElementById("storeStatus");
      if (!storeStatus) {
        console.error("storeStatus not found in DOM");
        return;
      }
      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في جلب بيانات المتجر");
        storeStatus.innerHTML = `المتجر: <strong>${store.storeName}</strong> (نشط)`;
        createStoreContainer.style.display = "none";
        storeSettingsContainer.style.display = "grid";
        productsContainer.style.display = "none";
        categoriesContainer.style.display = "none";
        instructionsContainer.style.display = "none";
        toggleInstructionsBtn.textContent = "إظهار التعليمات";
      } else {
        storeStatus.innerHTML = "لم يتم إنشاء متجر بعد.";
        createStoreContainer.style.display = "block";
        storeSettingsContainer.style.display = "none";
        productsContainer.style.display = "none";
        categoriesContainer.style.display = "none";
        instructionsContainer.style.display = "block";
        toggleInstructionsBtn.textContent = "إخفاء التعليمات";
      }
      loadingSpinner.style.display = "none";
    } catch (err) {
      console.error("خطأ في تحميل حالة المتجر:", err);
      showNotification("فشل في تحميل حالة المتجر: " + err.message, "error");
      loadingSpinner.style.display = "none";
    }
  }

  async function loadStoreSettings(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في جلب بيانات المتجر");

        storeNameInput.value = store.storeName;
        storeLinkInput.value = `https://zainbot.com/store/${store.storeLink}`;
        storeLinkSlugInput.value = store.storeLink;
        document.getElementById("templateId").value = store.templateId;
        document.getElementById("primaryColor").value = store.primaryColor;
        document.getElementById("secondaryColor").value = store.secondaryColor;
        document.getElementById("headerHtml").value = store.headerHtml;
        document.getElementById("landingTemplateId").value = store.landingTemplateId;
        document.getElementById("landingHtml").value = store.landingHtml;
        goToStoreBtn.disabled = false;
        editStoreLinkBtn.disabled = false;
        goToStoreBtn.onclick = () => window.open(`https://zainbot.com/store/${store.storeLink}`, '_blank');
      } else {
        storeNameInput.value = "";
        storeLinkInput.value = "";
        storeLinkSlugInput.value = "";
        goToStoreBtn.disabled = true;
        editStoreLinkBtn.disabled = true;
      }
    } catch (err) {
      console.error("خطأ في تحميل إعدادات المتجر:", err);
      showNotification("خطأ في تحميل إعدادات المتجر: " + err.message, "error");
    }
  }

  async function loadCategories(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Loading categories for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        document.getElementById("categoriesList").innerHTML = "<p>أنشئ متجر أولاً قبل إدارة الأقسام.</p>";
        console.log(`[${new Date().toISOString()}] ⚠️ No storeId found for bot ${botId}`);
        return;
      }

      console.log(`[${new Date().toISOString()}] 📡 Fetching categories for store ${bot.storeId}`);
      const response = await fetch(`/api/stores/${bot.storeId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('فشل في جلب الأقسام');
      const categories = await response.json();

      console.log(`[${new Date().toISOString()}] ✅ Fetched ${categories.length} categories for store ${bot.storeId}`);
      const categorySelect = document.getElementById("category");
      if (!categorySelect) {
        console.error("category select element not found in DOM");
        return;
      }
      categorySelect.innerHTML = '<option value="">اختر قسم</option>' + categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join("");

      const categoriesList = document.getElementById("categoriesList");
      if (!categoriesList) {
        console.error("categoriesList element not found in DOM");
        return;
      }
      categoriesList.innerHTML = categories.length
        ? categories
            .map(
              (cat) => `
                <div class="category-item">
                  <div>
                    <h4>${cat.name}</h4>
                    <p>${cat.description || "لا يوجد وصف"}</p>
                    <button onclick="window.deleteCategory('${cat._id}')" class="btn btn-danger"><i class="fas fa-trash"></i> حذف</button>
                  </div>
                </div>
              `
            )
            .join("")
        : "<p>لا توجد أقسام، أضف واحدة جديدة!</p>";

      if (categories.length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ No categories found for store ${bot.storeId}, displaying placeholder message`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading categories:`, err.message, err.stack);
      showNotification("فشل في تحميل الأقسام: حاول مرة أخرى لاحقًا", "error");
      const categoriesList = document.getElementById("categoriesList");
      if (categoriesList) {
        categoriesList.innerHTML = "<p>خطأ في تحميل الأقسام، حاول مرة أخرى لاحقًا.</p>";
      }
      // إعادة المحاولة بعد 3 ثوانٍ
      setTimeout(() => loadCategories(botId), 3000);
    }
  }

  async function loadProducts(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Loading products for bot ${botId}`);
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        document.getElementById("productsList").innerHTML = "<p>أنشئ متجر أولاً قبل إضافة المنتجات.</p>";
        console.log(`[${new Date().toISOString()}] ⚠️ No storeId found for bot ${botId}`);
        return;
      }

      console.log(`[${new Date().toISOString()}] 📡 Fetching products for store ${bot.storeId}`);
      const response = await fetch(`/api/stores/${bot.storeId}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('فشل في جلب المنتجات');
      const { products } = await response.json();

      console.log(`[${new Date().toISOString()}] ✅ Fetched ${products.length} products for store ${bot.storeId}`);
      const productsList = document.getElementById("productsList");
      if (!productsList) {
        console.error("productsList element not found in DOM");
        return;
      }
      productsList.innerHTML = products.length
        ? products
            .map(
              (product) => `
                <div class="product-item">
                  <img src="${product.imageUrl || "/images/default-product.png"}" alt="${product.productName}" style="max-width: 100px;">
                  <div>
                    <h4>${product.productName}</h4>
                    <p>القسم: ${product.category ? product.category.name : "غير مصنف"}</p>
                    <p>السعر: ${product.hasOffer ? `${product.discountedPrice} ${product.currency} (قبل: ${product.originalPrice} ${product.currency})` : `${product.price} ${product.currency}`}</p>
                    <p>المخزون: ${product.stock}</p>
                    <button onclick="window.editProduct('${product._id}')" class="btn btn-secondary"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="window.deleteProduct('${product._id}')" class="btn btn-danger"><i class="fas fa-trash"></i> حذف</button>
                  </div>
                </div>
              `
            )
            .join("")
        : "<p>لا توجد منتجات، أضف واحدة جديدة!</p>";

      if (products.length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ No products found for store ${bot.storeId}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading products:`, err.message, err.stack);
      showNotification("فشل في تحميل المنتجات: حاول مرة أخرى لاحقًا", "error");
      const productsList = document.getElementById("productsList");
      if (productsList) {
        productsList.innerHTML = "<p>خطأ في تحميل المنتجات، حاول مرة أخرى لاحقًا.</p>";
      }
    }
  }

  async function saveStoreSettings(botId) {
    const formData = new FormData(storeForm);
    const data = Object.fromEntries(formData);

    try {
      console.log(`[${new Date().toISOString()}] 📡 Saving store settings for bot ${botId}:`, data);
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      const method = bot.storeId ? "PUT" : "POST";
      const url = bot.storeId ? `/api/stores/${bot.storeId}` : "/api/stores";

      const payload = { ...data, selectedBotId: botId };
      if (data.storeLinkSlug) {
        payload.storeLink = data.storeLinkSlug;
      }

      await handleApiRequest(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, "فشل في حفظ المتجر");

      showNotification(`تم حفظ المتجر بنجاح! رابط المتجر: https://zainbot.com/store/${data.storeLinkSlug || data.storeLink}`, "success");
      storeLinkEditContainer.style.display = "none";
      await loadStoreStatus(botId);
      await loadStoreSettings(botId);
      await loadProducts(botId);
    } catch (err) {
      console.error("خطأ في حفظ المتجر:", err);
      showNotification("فشل في حفظ المتجر: " + err.message, "error");
    }
  }

  async function createStore(botId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Creating store for bot ${botId}`);
      await handleApiRequest("/api/stores", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedBotId: botId }),
      }, "فشل في إنشاء المتجر");

      showNotification("تم إنشاء المتجر بنجاح!", "success");
      await loadStoreStatus(botId);
      await loadStoreSettings(botId);
      await loadProducts(botId);
      await loadCategories(botId);
    } catch (err) {
      console.error("خطأ في إنشاء المتجر:", err);
      showNotification("فشل في إنشاء المتجر: " + err.message, "error");
    }
  }

  async function saveCategory(botId) {
    const formData = new FormData(categoryForm);
    const data = Object.fromEntries(formData);

    if (!data.categoryName) {
      showNotification("اسم القسم مطلوب", "error");
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] 📡 Saving category for bot ${botId}:`, data);
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        showNotification("أنشئ متجر أولاً قبل إنشاء الأقسام.", "error");
        return;
      }

      await handleApiRequest(`/api/stores/${bot.storeId}/categories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }, "فشل في إنشاء القسم");

      showNotification("تم إنشاء القسم بنجاح!", "success");
      categoryForm.reset();
      categoryForm.style.display = "none";
      await loadCategories(botId);
    } catch (err) {
      console.error("خطأ في إنشاء القسم:", err);
      showNotification("فشل في إنشاء القسم: " + err.message, "error");
    }
  }

  window.deleteCategory = async (categoryId) => {
    if (confirm("هل أنت متأكد من حذف القسم؟")) {
      try {
        console.log(`[${new Date().toISOString()}] 📡 Deleting category ${categoryId} for bot ${selectedBotId}`);
        const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في جلب بيانات البوت");

        await handleApiRequest(`/api/stores/${bot.storeId}/categories/${categoryId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في حذف القسم");

        showNotification("تم حذف القسم بنجاح!", "success");
        await loadCategories(selectedBotId);
      } catch (err) {
        console.error("خطأ في حذف القسم:", err);
        showNotification("فشل في حذف القسم: " + err.message, "error");
      }
    }
  }

  let editingProductId = null;
  window.editProduct = async (productId) => {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Editing product ${productId} for bot ${selectedBotId}`);
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      const product = await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "المنتج غير موجود، قد يكون تم حذفه أو غير متوفر");

      document.getElementById("productName").value = product.productName || "";
      document.getElementById("description").value = product.description || "";
      document.getElementById("price").value = product.price || "";
      document.getElementById("hasOffer").value = product.hasOffer ? "yes" : "no";
      offerFields.style.display = product.hasOffer ? "block" : "none";
      document.getElementById("originalPrice").value = product.originalPrice || "";
      document.getElementById("discountedPrice").value = product.discountedPrice || "";
      document.getElementById("currency").value = product.currency || "EGP";
      document.getElementById("stock").value = product.stock || 0;
      document.getElementById("lowStockThreshold").value = product.lowStockThreshold || 10;
      document.getElementById("category").value = product.category ? product.category._id : "";
      editingProductId = productId;
      productForm.style.display = "block";
      document.getElementById("productName").focus();
    } catch (err) {
      console.error("خطأ في تحميل المنتج:", err);
      showNotification("فشل في تحميل المنتج: " + err.message, "error");
    }
  }

  window.deleteProduct = async (productId) => {
    if (confirm("هل أنت متأكد من حذف المنتج؟")) {
      try {
        console.log(`[${new Date().toISOString()}] 📡 Deleting product ${productId} for bot ${selectedBotId}`);
        const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في جلب بيانات البوت");

        await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }, "فشل في حذف المنتج");

        showNotification("تم حذف المنتج بنجاح!", "success");
        await loadProducts(selectedBotId);
      } catch (err) {
        console.error("خطأ في حذف المنتج:", err);
        showNotification("فشل في حذف المنتج: " + err.message, "error");
      }
    }
  }

  window.saveProduct = async (botId) => {
    const formData = new FormData(productForm);
    const formDataEntries = {};
    for (const [key, value] of formData.entries()) {
      formDataEntries[key] = value instanceof File ? value.name : value;
    }
    console.log(`[${new Date().toISOString()}] 📡 Sending FormData for product:`, formDataEntries);

    // التحقق من الحقول المطلوبة
    if (!formData.get('productName') || !formData.get('price') || !formData.get('currency') || !formData.get('stock')) {
      showNotification("اسم المنتج، السعر، العملة، والمخزون مطلوبة", "error");
      return;
    }

    if (formData.get('hasOffer') === "yes" && (!formData.get('originalPrice') || !formData.get('discountedPrice'))) {
      showNotification("السعر قبل وبعد الخصم مطلوبان إذا كان هناك عرض", "error");
      return;
    }

    // التحقق من وجود صورة
    const imageFile = formData.get('image');
    if (imageFile && imageFile.size > 0 && !['image/png', 'image/jpeg'].includes(imageFile.type)) {
      showNotification("الصورة يجب أن تكون بصيغة PNG أو JPEG", "error");
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] 📡 Checking bot ${botId} for store association`);
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        showNotification("أنشئ متجر أولاً قبل إضافة المنتجات.", "error");
        return;
      }

      console.log(`[${new Date().toISOString()}] 📡 Saving product for store ${bot.storeId}, editing: ${editingProductId || 'new'}`);
      const method = editingProductId ? "PUT" : "POST";
      const url = editingProductId
        ? `/api/stores/${bot.storeId}/products/${editingProductId}`
        : `/api/stores/${bot.storeId}/products`;

      const response = await handleApiRequest(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }, "فشل في حفظ المنتج");

      showNotification("تم حفظ المنتج بنجاح!", "success");
      productForm.reset();
      productForm.style.display = "none";
      offerFields.style.display = "none";
      editingProductId = null;
      await loadProducts(botId);
      await loadCategories(botId); // تحديث الأقسام بعد إضافة المنتج
    } catch (err) {
      console.error("خطأ في حفظ المنتج:", err);
      const errorMessage = err.message.includes('Product validation failed') 
        ? 'خطأ في بيانات المنتج: تأكد من إدخال رابط صورة صالح أو اترك الحقل فارغًا'
        : err.message || "فشل في حفظ المنتج";
      showNotification(errorMessage, "error");
    }
  }

  // Event Listeners
  toggleInstructionsBtn.addEventListener("click", () => {
    instructionsContainer.style.display = instructionsContainer.style.display === "none" ? "block" : "none";
    toggleInstructionsBtn.textContent = instructionsContainer.style.display === "none" ? "إظهار التعليمات" : "إخفاء التعليمات";
  });

  storeSettingsBtn.addEventListener("click", () => showSection("storeSettings"));
  productsBtn.addEventListener("click", () => {
    showSection("products");
    loadCategories(selectedBotId);
    loadProducts(selectedBotId);
  });
  categoriesBtn.addEventListener("click", () => {
    showSection("categories");
    loadCategories(selectedBotId);
  });

  storeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveStoreSettings(selectedBotId);
  });

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await window.saveProduct(selectedBotId);
  });

  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveCategory(selectedBotId);
  });

  createStoreBtn.addEventListener("click", async () => {
    await createStore(selectedBotId);
  });

  createCategoryBtn.addEventListener("click", () => {
    categoryForm.style.display = "block";
    document.getElementById("categoryName").focus();
  });

  cancelCategoryBtn.addEventListener("click", () => {
    categoryForm.style.display = "none";
    categoryForm.reset();
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
    storeLinkEditContainer.style.display = "block";
    storeLinkSlugInput.focus();
  });

  hasOfferSelect.addEventListener("change", () => {
    offerFields.style.display = hasOfferSelect.value === "yes" ? "block" : "none";
  });

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
    return !!bot.storeId;
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
