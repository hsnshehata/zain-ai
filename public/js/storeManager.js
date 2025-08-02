// /public/js/storeManager.js
async function loadStoreManagerPage() {
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");
  const storeContainer = document.getElementById("store-manager-container");
  const storeForm = document.getElementById("store-form");
  const productForm = document.getElementById("product-form");
  const storeError = document.getElementById("store-error");
  const productError = document.getElementById("product-error");
  const productsList = document.getElementById("products-list");

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

  // إظهار قسم إدارة المتجر
  content.innerHTML = '';
  storeContainer.style.display = 'grid';

  // دالة مساعدة للتعامل مع طلبات API
  async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
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

  // جلب بيانات المتجر إذا كان موجود
  async function loadStore() {
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, storeError, "فشل في جلب بيانات البوت");
      
      if (bot.storeId) {
        const store = await handleApiRequest(`/api/stores/${bot.storeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }, storeError, "فشل في جلب بيانات المتجر");
        
        document.getElementById("storeName").value = store.storeName;
        document.getElementById("templateId").value = store.templateId;
        document.getElementById("primaryColor").value = store.primaryColor;
        document.getElementById("secondaryColor").value = store.secondaryColor;
        document.getElementById("headerHtml").value = store.headerHtml;
        document.getElementById("landingTemplateId").value = store.landingTemplateId;
        document.getElementById("landingHtml").value = store.landingHtml;
      }
    } catch (err) {
      console.error("خطأ في جلب بيانات المتجر:", err);
    }
  }

  // جلب المنتجات
  async function loadProducts() {
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, productError, "فشل في جلب بيانات البوت");
      
      if (bot.storeId) {
        const products = await handleApiRequest(`/api/stores/${bot.storeId}/products`, {
          headers: { Authorization: `Bearer ${token}` }
        }, productError, "فشل في جلب المنتجات");
        
        productsList.innerHTML = products.map(product => `
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
    }
  }

  // حفظ/تعديل المتجر
  storeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    storeError.style.display = "none";
    const formData = new FormData(storeForm);
    const storeData = Object.fromEntries(formData);
    
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, storeError, "فشل في جلب بيانات البوت");
      
      const method = bot.storeId ? 'PUT' : 'POST';
      const url = bot.storeId ? `/api/stores/${bot.storeId}` : '/api/stores';
      
      await handleApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(storeData)
      }, storeError, "فشل في حفظ المتجر");
      
      storeError.textContent = "تم حفظ المتجر بنجاح!";
      storeError.style.color = "green";
      storeError.style.display = "block";
      await loadStore();
      await loadProducts();
    } catch (err) {
      console.error("خطأ في حفظ المتجر:", err);
    }
  });

  // إضافة/تعديل المنتج
  let editingProductId = null;
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    productError.style.display = "none";
    const formData = new FormData(productForm);
    
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` }
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
        body: formData
      }, productError, "فشل في حفظ المنتج");
      
      productError.textContent = "تم حفظ المنتج بنجاح!";
      productError.style.color = "green";
      productError.style.display = "block";
      productForm.reset();
      editingProductId = null;
      await loadProducts();
    } catch (err) {
      console.error("خطأ في حفظ المنتج:", err);
    }
  });

  // تعديل منتج
  window.editProduct = async (productId) => {
    try {
      const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, productError, "فشل في جلب بيانات البوت");
      
      const product = await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
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

  // حذف منتج
  window.deleteProduct = async (productId) => {
    if (confirm("هل أنت متأكد من حذف المنتج؟")) {
      try {
        const bot = await handleApiRequest(`/api/bots/${selectedBotId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }, productError, "فشل في جلب بيانات البوت");
        
        await handleApiRequest(`/api/stores/${bot.storeId}/products/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }, productError, "فشل في حذف المنتج");
        
        productError.textContent = "تم حذف المنتج بنجاح!";
        productError.style.color = "green";
        productError.style.display = "block";
        await loadProducts();
      } catch (err) {
        console.error("خطأ في حذف المنتج:", err);
      }
    }
  };

  // تحميل بيانات المتجر والمنتجات عند فتح الصفحة
  await loadStore();
  await loadProducts();
}

// جعل الدالة متاحة عالميًا
window.loadStoreManagerPage = loadStoreManagerPage;

console.log('✅ loadStoreManagerPage is defined and ready');
