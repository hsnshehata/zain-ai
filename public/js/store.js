// /public/js/store.js
document.addEventListener('DOMContentLoaded', async () => {
  const storeLink = new URLSearchParams(window.location.search).get('storeId') || window.location.pathname.split('/').pop();
  const isLandingPage = window.location.pathname.includes('/landing');
  const categoriesNav = document.querySelector('.categories-nav');
  const categoriesContainer = document.querySelector('.categories-container');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const randomProductsContainer = document.getElementById('random-products');
  const recentProductsContainer = document.getElementById('recent-products');
  const bestsellersProductsContainer = document.getElementById('bestsellers-products');
  const productsContainer = document.getElementById('products-container');
  const categoryTitle = document.getElementById('category-title');
  const landingCategoriesContainer = document.getElementById('categories-container');
  const sortSelect = document.getElementById('sort-select');
  const filterSelect = document.getElementById('filter-select');
  let currentPage = 1;
  const productsPerPage = 10;

  // دالة لعرض spinner
  const showSpinner = (container) => {
    if (container) container.innerHTML = '<div class="spinner"></div>';
  };

  // دالة لعرض رسالة خطأ
  const showError = (container, message) => {
    if (container) container.innerHTML = `<p class="error-message">${message}</p>`;
  };

  // دالة لعرض رسالة نجاح
  const showSuccess = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // دالة لعرض المنتجات
  const renderProducts = (products, container) => {
    if (!container) return;
    container.innerHTML = '';
    if (products.length === 0) {
      container.innerHTML = '<p class="error-message">لا توجد منتجات متاحة</p>';
      return;
    }
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <img src="${product.imageUrl || '/images/placeholder.png'}" alt="${product.productName}">
        <h3>${product.productName}</h3>
        <p>${product.description || 'بدون وصف'}</p>
        <p>${product.price} ${product.currency}</p>
        ${product.hasOffer ? `<p><s>${product.originalPrice} ${product.currency}</s> ${product.discountedPrice} ${product.currency}</p>` : ''}
        <button onclick="addToCart('${product._id}')">أضف إلى السلة</button>
      `;
      container.appendChild(productCard);
    });
  };

  // دالة لعرض الأقسام
  const renderCategories = (categories, container, navContainer) => {
    if (navContainer) {
      navContainer.innerHTML = '';
      const allTab = document.createElement('div');
      allTab.className = 'category-tab active';
      allTab.textContent = 'الكل';
      allTab.dataset.categoryId = '';
      navContainer.appendChild(allTab);
      categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = 'category-tab';
        tab.textContent = category.name;
        tab.dataset.categoryId = category._id;
        navContainer.appendChild(tab);
      });
      navContainer.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
          navContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const categoryId = tab.dataset.categoryId;
          await fetchProducts(storeLink, categoryId);
        });
      });
    }

    if (container && isLandingPage) {
      container.innerHTML = '';
      categories.forEach(async category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.innerHTML = `
          <h3>${category.name}</h3>
          <p>${category.description || 'بدون وصف'}</p>
        `;
        container.appendChild(categoryCard);
        // جلب المنتجات لكل قسم في اللاند بيج
        try {
          const productsResponse = await fetch(`/api/stores/${storeLink}/products?category=${category._id}`);
          const products = await productsResponse.json();
          const productsContainer = document.createElement('div');
          productsContainer.className = 'products-container';
          renderProducts(products, productsContainer);
          categoryCard.appendChild(productsContainer);
        } catch (err) {
          console.error('خطأ في جلب منتجات القسم:', err);
        }
      });
    }
  };

  // دالة لجلب الأقسام
  const fetchCategories = async (storeId) => {
    try {
      showSpinner(categoriesContainer);
      const response = await fetch(`/api/stores/${storeId}/categories`);
      const categories = await response.json();
      renderCategories(categories, isLandingPage ? landingCategoriesContainer : categoriesContainer, categoriesNav);
      console.log('✅ Fetched categories:', categories);
    } catch (err) {
      console.error('خطأ في جلب الأقسام:', err);
      showError(categoriesContainer, 'خطأ في جلب الأقسام، حاول مرة أخرى.');
      if (isLandingPage) {
        showError(landingCategoriesContainer, 'خطأ في جلب الأقسام، حاول مرة أخرى.');
      }
    }
  };

  // دالة لجلب المنتجات
  const fetchProducts = async (storeId, categoryId = '') => {
    try {
      showSpinner(productsContainer);
      let url = `/api/stores/${storeId}/products?page=${currentPage}&limit=${productsPerPage}`;
      if (categoryId) url += `&category=${categoryId}`;
      if (searchInput?.value) url += `&search=${encodeURIComponent(searchInput.value)}`;
      if (sortSelect?.value) url += `&sort=${sortSelect.value}`;
      if (filterSelect?.value) url += `&filter=${filterSelect.value}`;
      const response = await fetch(url);
      const products = await response.json();
      renderProducts(products, productsContainer);
      console.log('✅ Fetched products:', products);
    } catch (err) {
      console.error('خطأ في جلب المنتجات:', err);
      showError(productsContainer, 'خطأ في جلب المنتجات، حاول مرة أخرى.');
    }
  };

  // دالة لجلب المنتجات العشوائية
  const fetchRandomProducts = async (storeId) => {
    try {
      showSpinner(randomProductsContainer);
      const response = await fetch(`/api/stores/${storeId}/products?sort=random&limit=4`);
      const products = await response.json();
      renderProducts(products, randomProductsContainer);
      console.log('✅ Fetched random products:', products);
    } catch (err) {
      console.error('خطأ في جلب المنتجات العشوائية:', err);
      showError(randomProductsContainer, 'خطأ في جلب المنتجات العشوائية، حاول مرة أخرى.');
    }
  };

  // دالة لجلب المنتجات الحديثة
  const fetchRecentProducts = async (storeId) => {
    try {
      showSpinner(recentProductsContainer);
      const response = await fetch(`/api/stores/${storeId}/products?sort=createdAt&limit=4`);
      const products = await response.json();
      renderProducts(products, recentProductsContainer);
      console.log('✅ Fetched recent products:', products);
    } catch (err) {
      console.error('خطأ في جلب المنتجات الحديثة:', err);
      showError(recentProductsContainer, 'خطأ في جلب المنتجات الحديثة، حاول مرة أخرى.');
    }
  };

  // دالة لجلب المنتجات الأكثر مبيعاً
  const fetchBestsellers = async (storeId) => {
    try {
      showSpinner(bestsellersProductsContainer);
      const response = await fetch(`/api/stores/${storeId}/products/bestsellers?limit=4`);
      const products = await response.json();
      renderProducts(products, bestsellersProductsContainer);
      console.log('✅ Fetched bestsellers:', products);
    } catch (err) {
      console.error('خطأ في جلب المنتجات الأكثر مبيعاً:', err);
      showError(bestsellersProductsContainer, 'خطأ في جلب المنتجات الأكثر مبيعاً، حاول مرة أخرى.');
    }
  };

  // دالة لإضافة منتج إلى السلة
  const addToCart = async (productId) => {
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      const result = await response.json();
      showSuccess('تم إضافة المنتج إلى السلة!');
      console.log('✅ Added to cart:', result);
    } catch (err) {
      console.error('خطأ في إضافة المنتج إلى السلة:', err);
      showError(productsContainer, 'خطأ في إضافة المنتج إلى السلة، حاول مرة أخرى.');
    }
  };

  window.addToCart = addToCart;

  // إعداد البحث
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => fetchProducts(storeLink));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') fetchProducts(storeLink);
    });
  }

  // إعداد الترتيب والتصفية
  if (sortSelect) {
    sortSelect.addEventListener('change', () => fetchProducts(storeLink));
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', () => fetchProducts(storeLink));
  }

  // تحميل بيانات المتجر
  try {
    showSpinner(productsContainer);
    const storeResponse = await fetch(`/api/stores/store/${storeLink}`);
    if (!storeResponse.ok) throw new Error('خطأ في جلب بيانات المتجر');
    const store = await storeResponse.json();

    // تحديث اسم المتجر
    const storeNameElement = document.getElementById('store-name');
    if (storeNameElement) {
      storeNameElement.textContent = store.storeName;
    } else {
      console.error('store-name element not found in DOM');
    }

    // تحديث الهيدر مع جملة الترحيب
    const storeHeaderElement = document.getElementById('store-header');
    if (storeHeaderElement) {
      storeHeaderElement.innerHTML = store.headerHtml || `<h2>مرحبًا بك في متجر ${store.storeName}</h2>`;
    } else {
      console.error('store-header element not found in DOM');
    }

    // تطبيق الألوان المخصصة
    document.documentElement.style.setProperty('--primary-color', store.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', store.secondaryColor);

    // تحميل القالب
    const templateLink = isLandingPage
      ? `/css/landing-template${store.landingTemplateId}.css`
      : `/css/template${store.templateId}.css`;
    const templateCssElement = document.getElementById(isLandingPage ? 'landing-template-css' : 'template-css');
    if (templateCssElement) {
      templateCssElement.setAttribute('href', templateLink);
    } else {
      console.error('template-css or landing-template-css element not found in DOM');
    }

    // تحميل الأقسام والمنتجات
    await fetchCategories(store._id);
    if (!isLandingPage) {
      await fetchRandomProducts(store._id);
      await fetchRecentProducts(store._id);
      await fetchBestsellers(store._id);
      await fetchProducts(store._id);
    }
  } catch (err) {
    console.error('خطأ في تحميل المتجر:', err);
    showError(productsContainer, 'خطأ في تحميل المتجر، حاول مرة أخرى.');
    if (isLandingPage) {
      showError(landingCategoriesContainer, 'خطأ في تحميل الصفحة، حاول مرة أخرى.');
    }
  }
});
