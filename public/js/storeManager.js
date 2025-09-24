// /public/js/storeManager.js
async function loadStoreManagerPage() {
  console.log('🔍 loadStoreManagerPage called');
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/storeManager.css";
  document.head.appendChild(link);
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
      <div id="instructionsContainer" class="instructions-container">
        <h3>📋 خطوات إنشاء وإدارة متجرك الذكي</h3>
        <p>عشان تقدر تدير متجرك بسهولة، اتّبع الخطوات دي:</p>
        <ul>
          <li>
            <strong>1. إنشاء المتجر:</strong> اضغط على زرار "إنشاء المتجر" عشان تعمل متجر جديد بإعدادات افتراضية، وبعدين عدّل الإعدادات زي ما تحب.
          </li>
          <li>
            <strong>2. تعديل اسم المتجر:</strong> غيّر اسم المتجر من إعدادات المتجر، والرابط هيتحدث تلقائيًا بناءً على الاسم الجديد.
          </li>
          <li>
            <strong>3. إضافة المنتجات:</strong> بعد إنشاء المتجر، أضف منتجاتك بالاسم، الوصف، السعر، الصورة، والمخزون.
            <br>
            <span style="display: block; margin-top: 5px;">
              - الصور لازم تكون بصيغة PNG أو JPG، ويفضل تكون مربعة.<br>
              - حدد عتبة المخزون المنخفض عشان تتلقى إشعارات لو المخزون قل.
            </span>
          </li>
          <li>
            <strong>4. تخصيص الواجهة:</strong> اختار قالب (كلاسيكي، مودرن، إلخ)، وعدّل الألوان أو أضف HTML مخصص للهيدر أو اللاندينج بيج.
          </li>
          <li>
            <strong>5. إدارة الطلبات:</strong> الطلبات هتظهر في صفحة الحسابات (تحت الإنشاء) مع إشعارات تلقائية لواتساب.
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="toggleInstructionsBtn" class="btn btn-secondary"><i class="fas fa-info-circle"></i> إخفاء التعليمات</button>
        <div id="storeStatus" class="page-status" style="margin-left: 20px;"></div>
      </div>
    </div>

    <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div id="createStoreContainer" class="settings-container" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-store-alt"></i> إنشاء متجر جديد</h3></div>
        <div class="card-body">
          <p>اضغط على الزر أدناه لإنشاء متجر جديد بإعدادات افتراضية. بعد الإنشاء، يمكنك تعديل الإعدادات وإضافة المنتجات.</p>
          <button id="createStoreBtn" class="btn btn-primary"><i class="fas fa-plus"></i> إنشاء المتجر</button>
        </div>
      </div>
    </div>

    <div id="storeSettingsContainer" class="settings-container store-settings-grid" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-store-alt"></i> إعدادات المتجر</h3></div>
        <div class="card-body">
          <form id="store-form">
            <div class="form-group">
              <label for="storeName">اسم المتجر</label>
              <input type="text" id="storeName" name="storeName" class="form-control" placeholder="متجر-افتراضي">
              <small class="form-text">رابط المتجر هيتولد تلقائيًا بناءً على اسم المتجر</small>
            </div>
            <div class="form-group">
              <label for="storeLink">رابط المتجر</label>
              <input type="text" id="storeLink" name="storeLink" class="form-control" readonly>
              <small class="form-text">الرابط ده هيتغير لو غيّرت اسم المتجر</small>
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

      <div class="card settings-card" id="productsContainer" style="display: none;">
        <div class="card-header"><h3><i class="fas fa-box"></i> إدارة المنتجات</h3></div>
        <div class="card-body">
          <form id="product-form" enctype="multipart/form-data">
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
              <label for="currency">العملة</label>
              <select id="currency" name="currency" class="form-control">
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
              <input type="text" id="category" name="category" class="form-control">
            </div>
            <div class="form-group">
              <label for="image">صورة المنتج</label>
              <input type="file" id="image" name="image" class="form-control" accept="image/png,image/jpeg">
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ المنتج</button>
          </form>
          <div id="productError" class="error-message" style="display: none;"></div>
          <div id="productsList" class="products-list"></div>
        </div>
      </div>
    </div>
  `;

  const toggleInstructionsBtn = document.getElementById("toggleInstructionsBtn");
  const instructionsContainer = document.getElementById("instructionsContainer");
  const storeForm = document.getElementById("store-form");
  const productForm = document.getElementById("product-form");
  const storeError = document.getElementById("errorMessage");
  const productError = document.getElementById("productError");
  const createStoreBtn = document.getElementById("createStoreBtn");
  const storeSettingsContainer = document.getElementById("storeSettingsContainer");
  const createStoreContainer = document.getElementById("createStoreContainer");
  const productsContainer = document.getElementById("productsContainer");
  const loadingSpinner = document.getElementById("loadingSpinner");

  async function handleApiRequest(url, options, errorElement, errorMessage) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error("خطأ في السيرفر، الرجاء المحاولة لاحقًا");
        }
        throw new Error(errorData.message || errorMessage);
      }
      return await response.json();
    } catch (err) {
      console.error("API Error:", err);
      errorElement.textContent = err.message;
      errorElement.style.display = "block";
      throw err;
    }
  }

  async function loadStoreStatus(botId) {
    try {
      loadingSpinner.style.display = "block";
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, storeError, "فشل في جلب بيانات البوت");

      const storeStatus = document.getElementById("storeStatus");
      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, storeError, "فشل في جلب بيانات المتجر");
        storeStatus.innerHTML = `المتجر: <strong>${store.storeName}</strong> (نشط)`;
        createStoreContainer.style.display = "none";
        storeSettingsContainer.style.display = "grid";
        productsContainer.style.display = "block";
      } else {
        storeStatus.innerHTML = "لم يتم إنشاء متجر بعد.";
        createStoreContainer.style.display = "block";
        storeSettingsContainer.style.display = "none";
        productsContainer.style.display = "none";
      }
      loadingSpinner.style.display = "none";
    } catch (err) {
      console.error("خطأ في تحميل حالة المتجر:", err);
      loadingSpinner.style.display = "none";
    }
  }

  async function loadStoreSettings(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, storeError, "فشل في جلب بيانات البوت");

      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, storeError, "فشل في جلب بيانات المتجر");

        document.getElementById("storeName").value = store.storeName;
        document.getElementById("storeLink").value = store.storeLink;
        document.getElementById("templateId").value = store.templateId;
        document.getElementById("primaryColor").value = store.primaryColor;
        document.getElementById("secondaryColor").value = store.secondaryColor;
        document.getElementById("headerHtml").value = store.headerHtml;
        document.getElementById("landingTemplateId").value = store.landingTemplateId;
        document.getElementById("landingHtml").value = store.landingHtml;
      }
    } catch (err) {
      console.error("خطأ في تحميل إعدادات المتجر:", err);
    }
  }

  async function loadProducts(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        document.getElementById("productsList").innerHTML = "<p>أنشئ متجر أولاً قبل إضافة المنتجات.</p>";
        return;
      }

      const products = await handleApiRequest(`/api/stores/${bot.storeId}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "لم يتم العثور على منتجات، أضف منتجك الأول!");

      const productsList = document.getElementById("productsList");
      productsList.innerHTML = products.length
        ? products
            .map(
              (product) => `
                <div class="product-item">
                  <img src="${product.imageUrl || "/placeholder-bot.png"}" alt="${product.productName}" style="max-width: 100px;">
                  <div>
                    <h4>${product.productName}</h4>
                    <p>السعر: ${product.price} ${product.currency}</p>
                    <p>المخزون: ${product.stock}</p>
                    <button onclick="editProduct('${product._id}')" class="btn btn-secondary"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteProduct('${product._id}')" class="btn btn-danger"><i class="fas fa-trash"></i> حذف</button>
                  </div>
                </div>
              `
            )
            .join("")
        : "<p>لم يتم العثور على منتجات، أضف منتجك الأول!</p>";
    } catch (err) {
      console.error("خطأ في تحميل المنتجات:", err);
      document.getElementById("productsList").innerHTML = "<p>لم يتم العثور على منتجات، أضف منتجك الأول!</p>";
    }
  }

  async function saveStoreSettings(botId) {
    storeError.style.display = "none";
    const formData = new FormData(storeForm);
    const data = Object.fromEntries(formData);

    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, storeError, "فشل في جلب بيانات البوت");

      const method = bot.storeId ? "PUT" : "POST";
      const url = bot.storeId ? `/api/stores/${bot.storeId}` : "/api/stores";

      await handleApiRequest(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, selectedBotId: botId }),
      }, storeError, "فشل في حفظ المتجر");

      storeError.textContent = `تم حفظ المتجر بنجاح!`;
      storeError.style.color = "green";
      storeError.style.display = "block";
      await loadStoreStatus(botId);
      await loadStoreSettings(botId);
      await loadProducts(botId);
    } catch (err) {
      console.error("خطأ في حفظ المتجر:", err);
    }
  }

  async function createStore(botId) {
    storeError.style.display = "none";
    try {
      await handleApiRequest("/api/stores", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedBotId: botId }),
      }, storeError, "فشل في إنشاء المتجر");

      storeError.textContent = "تم إنشاء المتجر بنجاح!";
      storeError.style.color = "green";
      storeError.style.display = "block";
      await loadStoreStatus(botId);
      await loadStoreSettings(botId);
      await loadProducts(botId);
    } catch (err) {
      console.error("خطأ في إنشاء المتجر:", err);
    }
  }

  let editingProductId = null;
  async function saveProduct(botId) {
    productError.style.display = "none";
    const formData = new FormData(productForm);

    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "فشل في جلب بيانات البوت");

      if (!bot.storeId) {
        productError.textContent = "أنشئ متجر أولاً قبل إضافة المنتجات.";
        productError.style.display = "block";
        return;
      }

      const method = editingProductId ? "PUT" : "POST";
      const url = editingProductId
        ? `/api/stores/${bot.storeId}/products/${editingProductId}`
        : `/api/stores/${bot.storeId}/products`;

      await handleApiRequest(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }, productError, "فشل في حفظ المنتج");

      productError.textContent = "تم حفظ المنتج بنجاح!";
      productError.style.color = "green";
      productError.style.display = "block";
      productForm.reset();
      editingProductId = null;
      await loadProducts(botId);
    } catch (err) {
      console.error("خطأ في حفظ المنتج:", err);
    }
  }

  window.editProduct = async (productId) => {
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "فشل في جلب بيانات البوت");

      const product = await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "فشل في جلب بيانات المنتج");

      document.getElementById("productName").value = product.productName;
      document.getElementById("description").value = product.description;
      document.getElementById("price").value = product.price;
      document.getElementById("currency").value = product.currency;
      document.getElementById("stock").value = product.stock;
      document.getElementById("lowStockThreshold").value = product.lowStockThreshold;
      document.getElementById("category").value = product.category;
      editingProductId = productId;
    } catch (err) {
      console.error("خطأ في تحميل المنتج:", err);
    }
  };

  window.deleteProduct = async (productId) => {
    if (confirm("هل أنت متأكد من حذف المنتج؟")) {
      try {
        const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, productError, "فشل في جلب بيانات البوت");

        await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }, productError, "فشل في حذف المنتج");

        productError.textContent = "تم حذف المنتج بنجاح!";
        productError.style.color = "green";
        productError.style.display = "block";
        await loadProducts(selectedBotId);
      } catch (err) {
        console.error("خطأ في حذف المنتج:", err);
      }
    }
  };

  // --- Event Listeners ---
  toggleInstructionsBtn.addEventListener("click", () => {
    instructionsContainer.style.display = instructionsContainer.style.display === "none" ? "block" : "none";
    toggleInstructionsBtn.textContent = instructionsContainer.style.display === "none" ? "إظهار التعليمات" : "إخفاء التعليمات";
  });

  storeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveStoreSettings(selectedBotId);
  });

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveProduct(selectedBotId);
  });

  createStoreBtn.addEventListener("click", async () => {
    await createStore(selectedBotId);
  });

  // --- Initial Load ---
  await loadStoreStatus(selectedBotId);
  await loadStoreSettings(selectedBotId);
  if (await checkStoreExists(selectedBotId)) {
    await loadProducts(selectedBotId);
  }
}

// دالة مساعدة للتحقق من وجود متجر
async function checkStoreExists(botId) {
  try {
    const response = await fetch(`/api/bots/${botId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const bot = await response.json();
    return !!bot.storeId;
  } catch (err) {
    console.error("خطأ في التحقق من وجود المتجر:", err);
    return false;
  }
}

// Make loadStoreManagerPage globally accessible
window.loadStoreManagerPage = loadStoreManagerPage;

// Ensure the function is available even if called early
if (window.loadStoreManagerPage) {
  console.log('✅ loadStoreManagerPage is defined and ready');
} else {
  console.error('❌ loadStoreManagerPage is not defined');
}
