// /public/js/store.js
document.addEventListener("DOMContentLoaded", async () => {
  const storeLink = window.location.pathname.split('/').pop();
  console.log(`[${new Date().toISOString()}] 🔍 Initializing store page for storeLink: ${storeLink}`);

  // تحميل CSS بناءً على القالب
  async function loadStoreTemplate() {
    try {
      const response = await fetch(`/api/stores/link/${storeLink}`);
      if (!response.ok) {
        throw new Error('فشل في جلب بيانات المتجر');
      }
      const store = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Fetched store data:`, store);

      // تحميل ملف CSS بناءً على templateId
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = `/css/template${store.templateId}.css`;
      document.head.appendChild(cssLink);

      // تحديث الألوان
      document.documentElement.style.setProperty('--primary-color', store.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', store.secondaryColor);

      // تحديث اسم المتجر
      const storeNameElement = document.getElementById("store-name");
      if (storeNameElement) {
        storeNameElement.textContent = store.storeName;
      }

      // تحديث الهيدر المخصص
      const headerHtmlContainer = document.getElementById("header-html");
      if (headerHtmlContainer && store.headerHtml) {
        headerHtmlContainer.innerHTML = store.headerHtml;
      }

      // تحديث بيانات التواصل والنص الاختياري في الـ footer
      const footer = document.querySelector('.store-footer');
      if (footer) {
        const contactInfo = document.createElement('div');
        contactInfo.className = 'contact-info';
        let contactContent = '<h3>بيانات التواصل</h3><ul>';
        if (store.whatsapp) contactContent += `<li><i class="fas fa-whatsapp"></i> واتساب: <a href="https://wa.me/${store.whatsapp}" target="_blank">${store.whatsapp}</a></li>`;
        if (store.website) contactContent += `<li><i class="fas fa-globe"></i> الموقع: <a href="${store.website}" target="_blank">${store.website}</a></li>`;
        if (store.mobilePhone) contactContent += `<li><i class="fas fa-mobile-alt"></i> الهاتف المحمول: ${store.mobilePhone}</li>`;
        if (store.landline) contactContent += `<li><i class="fas fa-phone"></i> الهاتف الأرضي: ${store.landline}</li>`;
        if (store.email) contactContent += `<li><i class="fas fa-envelope"></i> الإيميل: <a href="mailto:${store.email}">${store.email}</a></li>`;
        if (store.address) contactContent += `<li><i class="fas fa-map-marker-alt"></i> العنوان: ${store.address}</li>`;
        if (store.googleMapsLink) contactContent += `<li><i class="fas fa-map"></i> خريطة جوجل: <a href="${store.googleMapsLink}" target="_blank">عرض الخريطة</a></li>`;
        contactContent += '</ul>';
        if (contactContent !== '<h3>بيانات التواصل</h3><ul></ul>') {
          contactInfo.innerHTML = contactContent;
          footer.appendChild(contactInfo);
        }

        if (store.footerText) {
          const footerText = document.createElement('div');
          footerText.className = 'footer-text';
          footerText.innerHTML = store.footerText;
          footer.appendChild(footerText);
        }
      }

      return store;
    } catch (err) {
      console.error("خطأ في تحميل بيانات المتجر:", err);
      document.getElementById("content").innerHTML = `
        <div class="error-message">
          <h2>خطأ</h2>
          <p>فشل في تحميل المتجر: ${err.message}</p>
        </div>
      `;
      return null;
    }
  }

  // جلب الأقسام
  async function fetchCategories(storeId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Fetching categories for store ${storeId}`);
      const response = await fetch(`/api/stores/${storeId}/categories`);
      if (!response.ok) throw new Error('فشل في جلب الأقسام');
      const categories = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${categories.length} categories`, categories);

      const categoriesNav = document.getElementById("categories-nav");
      if (!categoriesNav) return;
      categoriesNav.innerHTML = `
        <div class="categories-container">
          <div class="category-tab active" data-category-id="all">الكل</div>
          ${categories.map(cat => `<div class="category-tab" data-category-id="${cat._id}">${cat.name}</div>`).join('')}
        </div>
        <div class="search-container">
          <input type="text" id="search-input" placeholder="ابحث عن منتج...">
          <button id="search-btn"><i class="fas fa-search"></i> بحث</button>
        </div>
      `;

      // إضافة Event Listeners للأقسام
      const categoryTabs = document.querySelectorAll(".category-tab");
      categoryTabs.forEach(tab => {
        tab.addEventListener("click", () => {
          categoryTabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          const categoryId = tab.getAttribute("data-category-id");
          fetchProducts(storeId, categoryId === "all" ? null : categoryId);
        });
      });

      // إضافة Event Listener للبحث
      const searchBtn = document.getElementById("search-btn");
      const searchInput = document.getElementById("search-input");
      if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
          fetchProducts(storeId, null, searchInput.value);
        });
        searchInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            fetchProducts(storeId, null, searchInput.value);
          }
        });
      }
    } catch (err) {
      console.error("خطأ في جلب الأقسام:", err);
      document.getElementById("categories-nav").innerHTML = `
        <div class="error-message">فشل في تحميل الأقسام: ${err.message}</div>
      `;
    }
  }

  // جلب المنتجات
  async function fetchProducts(storeId, categoryId = null, search = '', sort = 'date-desc', filter = null, page = 1) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Fetching products for store ${storeId}`, { categoryId, search, sort, filter, page });
      const queryParams = new URLSearchParams();
      if (categoryId) queryParams.set('category', categoryId);
      if (search) queryParams.set('search', search);
      if (sort) queryParams.set('sort', sort);
      if (filter) queryParams.set('filter', filter);
      queryParams.set('page', page);

      const response = await fetch(`/api/stores/${storeId}/products?${queryParams.toString()}`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات');
      const { products, total } = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${products.length} products, total: ${total}`);

      const productsContainer = document.getElementById("products-container");
      if (!productsContainer) return;

      productsContainer.innerHTML = products.length
        ? products.map(product => `
            <div class="product-card">
              <img src="${product.imageUrl || '/images/default-product.png'}" alt="${product.productName}">
              <h3>${product.productName}</h3>
              <p>${product.description || 'لا يوجد وصف'}</p>
              <p class="offer-price">
                ${product.hasOffer 
                  ? `<span class="original-price">${product.originalPrice} ${product.currency}</span> ${product.discountedPrice} ${product.currency}`
                  : `${product.price} ${product.currency}`}
              </p>
              <p>المخزون: ${product.stock}</p>
              <button onclick="addToCart('${product._id}')">أضف إلى السلة</button>
            </div>
          `).join('')
        : '<p>لا توجد منتجات متاحة</p>';

      // تحديث الـ Pagination
      updatePagination(total, page);
    } catch (err) {
      console.error("خطأ في جلب المنتجات:", err);
      document.getElementById("products-container").innerHTML = `
        <div class="error-message">فشل في تحميل المنتجات: ${err.message}</div>
      `;
    }
  }

  // جلب المنتجات الأكثر مبيعاً
  async function fetchBestsellers(storeId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Fetching bestsellers for store ${storeId}`);
      const response = await fetch(`/api/stores/${storeId}/products/bestsellers?limit=4`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات الأكثر مبيعاً');
      const bestsellers = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${bestsellers.length} bestsellers`);

      const bestsellersContainer = document.getElementById("bestsellers-container");
      if (!bestsellersContainer) return;

      bestsellersContainer.innerHTML = bestsellers.length
        ? bestsellers.map(product => `
            <div class="product-card">
              <img src="${product.imageUrl || '/images/default-product.png'}" alt="${product.productName}">
              <h3>${product.productName}</h3>
              <p>${product.description || 'لا يوجد وصف'}</p>
              <p class="offer-price">
                ${product.hasOffer 
                  ? `<span class="original-price">${product.originalPrice} ${product.currency}</span> ${product.discountedPrice} ${product.currency}`
                  : `${product.price} ${product.currency}`}
              </p>
              <button onclick="addToCart('${product._id}')">أضف إلى السلة</button>
            </div>
          `).join('')
        : '<p>لا توجد منتجات أكثر مبيعاً متاحة</p>';
    } catch (err) {
      console.error("خطأ في جلب المنتجات الأكثر مبيعاً:", err);
      document.getElementById("bestsellers-container").innerHTML = `
        <div class="error-message">فشل في تحميل المنتجات الأكثر مبيعاً: ${err.message}</div>
      `;
    }
  }

  // جلب المنتجات العشوائية
  async function fetchRandomProducts(storeId) {
    try {
      console.log(`[${new Date().toISOString()}] 📡 Fetching random products for store ${storeId}`);
      const response = await fetch(`/api/stores/${storeId}/products?random=true&limit=4`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات العشوائية');
      const { products } = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Fetched ${products.length} random products`);

      const randomProductsContainer = document.getElementById("random-products-container");
      if (!randomProductsContainer) return;

      randomProductsContainer.innerHTML = products.length
        ? products.map(product => `
            <div class="product-card">
              <img src="${product.imageUrl || '/images/default-product.png'}" alt="${product.productName}">
              <h3>${product.productName}</h3>
              <p>${product.description || 'لا يوجد وصف'}</p>
              <p class="offer-price">
                ${product.hasOffer 
                  ? `<span class="original-price">${product.originalPrice} ${product.currency}</span> ${product.discountedPrice} ${product.currency}`
                  : `${product.price} ${product.currency}`}
              </p>
              <button onclick="addToCart('${product._id}')">أضف إلى السلة</button>
            </div>
          `).join('')
        : '<p>لا توجد منتجات مختارة متاحة</p>';
    } catch (err) {
      console.error("خطأ في جلب المنتجات العشوائية:", err);
      document.getElementById("random-products-container").innerHTML = `
        <div class="error-message">فشل في تحميل المنتجات المختارة: ${err.message}</div>
      `;
    }
  }

  // تحديث الـ Pagination
  function updatePagination(total, currentPage) {
    const limit = 10;
    const totalPages = Math.ceil(total / limit);
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = `
      <button class="btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
      <span>صفحة ${currentPage} من ${totalPages}</span>
      <button class="btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>
    `;
  }

  // تغيير الصفحة
  window.changePage = (page) => {
    const categoryId = document.querySelector(".category-tab.active")?.getAttribute("data-category-id");
    const search = document.getElementById("search-input")?.value || '';
    const sort = document.getElementById("sort-select")?.value || 'date-desc';
    const filter = document.getElementById("filter-select")?.value || null;
    fetchProducts(storeLink, categoryId === "all" ? null : categoryId, search, sort, filter, page);
  };

  // إضافة إلى السلة (وظيفة مؤقتة)
  window.addToCart = (productId) => {
    console.log(`[${new Date().toISOString()}] 🛒 Adding product ${productId} to cart`);
    alert('تم إضافة المنتج إلى السلة!');
  };

  // تحميل المتجر
  const store = await loadStoreTemplate();
  if (store) {
    await fetchCategories(store._id);
    await fetchBestsellers(store._id);
    await fetchRandomProducts(store._id);
    await fetchProducts(store._id);

    // إضافة Event Listeners للترتيب والتصفية
    const sortSelect = document.getElementById("sort-select");
    const filterSelect = document.getElementById("filter-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        const categoryId = document.querySelector(".category-tab.active")?.getAttribute("data-category-id");
        const search = document.getElementById("search-input")?.value || '';
        fetchProducts(store._id, categoryId === "all" ? null : categoryId, search, sortSelect.value);
      });
    }
    if (filterSelect) {
      filterSelect.addEventListener("change", () => {
        const categoryId = document.querySelector(".category-tab.active")?.getAttribute("data-category-id");
        const search = document.getElementById("search-input")?.value || '';
        fetchProducts(store._id, categoryId === "all" ? null : categoryId, search, sortSelect?.value || 'date-desc', filterSelect.value);
      });
    }
  }
});
