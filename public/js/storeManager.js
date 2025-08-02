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
      <div id="instructionsContainer" class="instructions-container" style="display: none;">
        <h3>📋 خطوات إنشاء وإدارة متجرك الذكي</h3>
        <p>عشان تقدر تدير متجرك بسهولة، اتّبع الخطوات دي:</p>
        <ul>
          <li>
            <strong>1. إنشاء المتجر:</strong> لو لسه ماعملتش متجر، املأ بيانات المتجر (الاسم، القالب، الألوان) واضغط "حفظ المتجر".
          </li>
          <li>
            <strong>2. إضافة المنتجات:</strong> أضف منتجاتك بالاسم، الوصف، السعر، الصورة، والمخزون.
            <br>
            <span style="display: block; margin-top: 5px;">
              - الصور لازم تكون بصيغة PNG أو JPG، ويفضل تكون مربعة.<br>
              - حدد عتبة المخزون المنخفض عشان تتلقى إشعارات لو المخزون قل.
            </span>
          </li>
          <li>
            <strong>3. تخصيص الواجهة:</strong> اختار قالب (كلاسيكي، مودرن، إلخ)، وعدّل الألوان أو أضف HTML مخصص للهيدر أو اللاندينج بيج.
          </li>
          <li>
            <strong>4. إدارة الطلبات:</strong> الطلبات هتظهر في صفحة الحسابات (تحت الإنشاء) مع إشعارات تلقائية لواتساب.
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="toggleInstructionsBtn" class="btn btn-secondary"><i class="fas fa-info-circle"></i> إظهار التعليمات</button>
        <div id="storeStatus" class="page-status" style="margin-left: 20px;"></div>
      </div>
    </div>

    <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div id="storeSettingsContainer" class="settings-container store-settings-grid" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-store-alt"></i> إعدادات المتجر</h3></div>
        <div class="card-body">
          <form id="store-form">
            <div class="form-group">
              <label for="storeName">اسم المتجر</label>
              <input type="text" id="storeName" name="storeName" class="form-control" required>
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
              <input type="color" id="primaryColor" name="primaryColor" class="form-control">
            </div>
            <div class="form-group">
              <label for="secondaryColor">اللون الثانوي</label>
              <input type="color" id="secondaryColor" name="secondaryColor" class="form-control">
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
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">حفظ المتجر</button>
            </div>
          </form>
          <p id="storeError" class="error-message" style="display: none;"></p>
        </div>
      </div>
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-box"></i> إدارة المنتجات</h3></div>
        <div class="card-body">
          <form id="product-form">
            <div class="form-group">
              <label for="productName">اسم المنتج</label>
              <input type="text" id="productName" name="productName" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="description">الوصف</label>
              <textarea id="description" name="description" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="price">السعر</label>
              <input type="number" id="price" name="price" class="form-control" required min="0">
            </div>
            <div class="form-group">
              <label for="currency">العملة</label>
              <select id="currency" name="currency" class="form-control">
                <option value="EGP">جنيه مصري</option>
                <option value="USD">دولار أمريكي</option>
                <option value="SAR">ريال سعودي</option>
                <option value="AED">درهم إماراتي</option>
              </select>
            </div>
            <div class="form-group">
              <label for="image">صورة المنتج</label>
              <input type="file" id="image" name="image" class="form-control" accept="image/*">
            </div>
            <div class="form-group">
              <label for="stock">المخزون</label>
              <input type="number" id="stock" name="stock" class="form-control" required min="0">
            </div>
            <div class="form-group">
              <label for="lowStockThreshold">عتبة المخزون المنخفض</label>
              <input type="number" id="lowStockThreshold" name="lowStockThreshold" class="form-control" min="0" value="10">
            </div>
            <div class="form-group">
              <label for="category">التصنيف</label>
              <input type="text" id="category" name="category" class="form-control">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">إضافة المنتج</button>
            </div>
          </form>
          <p id="productError" class="error-message" style="display: none;"></p>
          <div id="productsList" class="products-grid"></div>
        </div>
      </div>
    </div>
  `;

  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const storeSettingsContainer = document.getElementById("storeSettingsContainer");
  const instructionsContainer = document.getElementById("instructionsContainer");
  const toggleInstructionsBtn = document.getElementById("toggleInstructionsBtn");
  const storeStatus = document.getElementById("storeStatus");
  const storeForm = document.getElementById("store-form");
  const productForm = document.getElementById("product-form");
  const storeError = document.getElementById("storeError");
  const productError = document.getElementById("productError");
  const productsList = document.getElementById("productsList");

  // --- Functions ---

  async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("الرد غير متوقع (مش JSON). يمكن إن الخدمة مش متاحة.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || defaultErrorMessage);
      }
      return await response.json();
    } catch (err) {
      if (errorElement) {
        errorElement.textContent = err.message;
        errorElement.style.display = "block";
      }
      throw err;
    }
  }

  async function loadStoreStatus(botId) {
    console.log(`جاري جلب بيانات البوت بالـ ID: ${botId}`);
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, storeStatus, "فشل في جلب بيانات البوت");

      if (!bot) {
        console.log(`البوت بالـ ID ${botId} مش موجود`);
        storeStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة المتجر:</strong> غير موجود ❌<br>
            <strong>السبب:</strong> البوت غير موجود أو تم حذفه
          </div>
        `;
        instructionsContainer.style.display = "block";
        return;
      }

      console.log(`بيانات البوت:`, bot);

      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, storeStatus, "فشل في جلب بيانات المتجر");

        console.log(`تم جلب بيانات المتجر بنجاح:`, store);
        const statusDiv = document.createElement("div");
        statusDiv.style.display = "inline-block";
        statusDiv.style.color = "green";
        statusDiv.innerHTML = `
          <strong>حالة المتجر:</strong> مفعّل ✅<br>
          <strong>اسم المتجر:</strong> ${store.storeName}<br>
          <strong>تاريخ الإنشاء:</strong> ${new Date(store.createdAt).toLocaleString('ar-EG')}
        `;

        const deleteStoreBtn = document.createElement("button");
        deleteStoreBtn.id = "deleteStoreBtn";
        deleteStoreBtn.className = "btn btn-danger";
        deleteStoreBtn.style.marginLeft = "10px";
        deleteStoreBtn.style.backgroundColor = "#dc3545";
        deleteStoreBtn.style.borderColor = "#dc3545";
        deleteStoreBtn.textContent = "حذف المتجر";

        deleteStoreBtn.addEventListener("click", async () => {
          if (confirm("هل أنت متأكد أنك تريد حذف هذا المتجر؟")) {
            try {
              await handleApiRequest(`/api/stores/${bot.storeId}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }, errorMessage, "فشل في حذف المتجر");

              errorMessage.textContent = "تم حذف المتجر بنجاح!";
              errorMessage.style.color = "green";
              errorMessage.style.display = "block";
              await loadStoreStatus(botId);
              await loadStoreSettings(botId);
            } catch (err) {
              console.error('❌ خطأ في حذف المتجر:', err);
              errorMessage.textContent = 'خطأ في حذف المتجر: ' + (err.message || 'غير معروف');
              errorMessage.style.color = "red";
              errorMessage.style.display = "block";
            }
          }
        });

        storeStatus.innerHTML = "";
        storeStatus.appendChild(statusDiv);
        storeStatus.appendChild(deleteStoreBtn);
        instructionsContainer.style.display = "none";
      } else {
        console.log(`البوت مش مرتبط بمتجر`);
        storeStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة المتجر:</strong> غير موجود ❌
          </div>
        `;
        instructionsContainer.style.display = "block";
      }
    } catch (err) {
      console.error('Error loading store status:', err);
      storeStatus.innerHTML = `
        <div style="display: inline-block; color: red;">
          <strong>حالة المتجر:</strong> غير موجود ❌<br>
          <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
        </div>
      `;
      instructionsContainer.style.display = "block";
    }
  }

  async function loadStoreSettings(botId) {
    loadingSpinner.style.display = "flex";
    storeSettingsContainer.style.display = "none";
    errorMessage.style.display = "none";

    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "فشل في جلب بيانات البوت");

      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, errorMessage, "فشل في جلب بيانات المتجر");

        document.getElementById("storeName").value = store.storeName || '';
        document.getElementById("templateId").value = store.templateId || '1';
        document.getElementById("primaryColor").value = store.primaryColor || '#000000';
        document.getElementById("secondaryColor").value = store.secondaryColor || '#ffffff';
        document.getElementById("headerHtml").value = store.headerHtml || '';
        document.getElementById("landingTemplateId").value = store.landingTemplateId || '1';
        document.getElementById("landingHtml").value = store.landingHtml || '';
        storeSettingsContainer.style.display = "grid";
      } else {
        storeSettingsContainer.style.display = "grid";
      }
    } catch (err) {
      console.error('خطأ في تحميل إعدادات المتجر:', err);
      errorMessage.textContent = "تعذر تحميل إعدادات المتجر، حاول لاحقًا أو تواصل مع الدعم.";
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  async function loadProducts(botId) {
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, productError, "فشل في جلب بيانات البوت");

      if (bot.storeId) {
        const products = await handleApiRequest(`/api/stores/${bot.storeId}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }, productError, "فشل في جلب المنتجات");

        productsList.innerHTML = products.length === 0
          ? '<p>لا توجد منتجات في المتجر.</p>'
          : products.map(product => `
              <div class="product-card">
                <img src="${product.imageUrl || '/placeholder-bot.png'}" alt="${product.productName}">
                <h3>${product.productName}</h3>
                <p>السعر: ${product.price} ${product.currency}</p>
                <p>المخزون: ${product.stock}</p>
                <button onclick="editProduct('${product._id}')">تعديل</button>
                <button onclick="deleteProduct('${product._id}')">حذف</button>
              </div>
            `).join('');
      } else {
        productsList.innerHTML = '<p>لا يوجد متجر مرتبط بالبوت، أنشئ متجر أولاً.</p>';
      }
    } catch (err) {
      console.error("خطأ في جلب المنتجات:", err);
      productError.textContent = err.message || "فشل في جلب المنتجات";
      productError.style.display = "block";
    }
  }

  async function saveStoreSettings(botId) {
    storeError.style.display = "none";
    const storeName = document.getElementById("storeName").value.trim();
    if (!storeName) {
      storeError.textContent = "اسم المتجر مطلوب";
      storeError.style.display = "block";
      return;
    }

    const formData = new FormData(storeForm);
    formData.append('botId', botId); // إضافة botId للربط

    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, storeError, "فشل في جلب بيانات البوت");

      const method = bot.storeId ? 'PUT' : 'POST';
      const url = bot.storeId ? `/api/stores/${bot.storeId}` : '/api/stores';

      const response = await handleApiRequest(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }, storeError, "فشل في حفظ المتجر");

      storeError.textContent = `تم حفظ المتجر وربطه بالبوت بنجاح!`;
      storeError.style.color = "green";
      storeError.style.display = "block";
      await loadStoreStatus(botId);
      await loadStoreSettings(botId);
      await loadProducts(botId);
    } catch (err) {
      console.error("خطأ في حفظ المتجر:", err);
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

      const method = editingProductId ? 'PUT' : 'POST';
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
          method: 'DELETE',
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

  // --- Initial Load ---
  await loadStoreStatus(selectedBotId);
  await loadStoreSettings(selectedBotId);
  await loadProducts(selectedBotId);
}

// Make loadStoreManagerPage globally accessible
window.loadStoreManagerPage = loadStoreManagerPage;

// Ensure the function is available even if called early
if (window.loadStoreManagerPage) {
  console.log('✅ loadStoreManagerPage is defined and ready');
} else {
  console.error('❌ loadStoreManagerPage is not defined');
}
