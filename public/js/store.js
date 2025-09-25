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
    if (!container) {
      console.error('Container not found for rendering products');
      return;
    }
    if (!products || products.length === 0) {
      container.innerHTML = '<p>لا توجد منتجات متاحة</p>';
      return;
    }
    container.innerHTML = products.map(product => `
      <div class="product-card">
        <img src="${product.imageUrl || '/placeholder-bot.png'}" alt="${product.productName}">
        <h3>${product.productName}</h3>
        <p>${product.description || 'لا يوجد وصف'}</p>
        ${product.hasOffer ? `
          <p class="offer-price">السعر: <span class="original-price">${product.originalPrice} ${product.currency}</span> ${product.discountedPrice} ${product.currency}</p>
        ` : `
          <p>السعر: ${product.price} ${product.currency}</p>
        `}
        <p>المخزون: ${product.stock}</p>
        <button onclick="addToCart('${product._id}', '${product.productName}', '${storeLink}')">أضف إلى السلة</button>
      </div>
    `).join('');
  };

  // دالة لعرض أزرار الـ Pagination
  const renderPagination = (totalProducts) => {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.innerHTML = `
      <button class="btn" onclick="changePage(${currentPage - 1}, '${storeLink}')" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
      <span>الصفحة ${currentPage} من ${totalPages}</span>
      <button class="btn" onclick="changePage(${currentPage + 1}, '${storeLink}')" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>
    `;
    if (productsContainer) {
      productsContainer.insertAdjacentElement('afterend', paginationContainer);
    }
  };

  // دالة لعرض الأقسام
  const renderCategories = (categories) => {
    if (!categoriesContainer) {
      console.error('categoriesContainer not found in DOM');
      return;
    }
    categoriesContainer.innerHTML = '<button class="category-tab active" data-category-id="all">الكل</button>';
    categories.forEach(category => {
      categoriesContainer.innerHTML += `
        <button class="category-tab" data-category-id="${category._id}">${category.name}</button>
      `;
    });
  };

  // دالة لعرض الأقسام في اللاندينج بيج
  const renderLandingCategories = async (categories, storeId) => {
    if (!landingCategoriesContainer) {
      console.error('landingCategoriesContainer not found in DOM');
      return;
    }
    landingCategoriesContainer.innerHTML = '';
    for (const category of categories) {
      const response = await fetch(`/api/stores/${storeId}/products?category=${category._id}&random=true&limit=1`);
      const { products } = await response.json();
      const randomProduct = products[0] || {};
      landingCategoriesContainer.innerHTML += `
        <div class="category-card">
          <img src="${randomProduct.imageUrl || '/placeholder-bot.png'}" alt="${category.name}">
          <h3>${category.name}</h3>
          <button onclick="loadCategoryProducts('${category._id}', '${category.name}', '${storeId}')">تصفح القسم</button>
        </div>
      `;
    }
  };

  // دالة جلب المنتجات
  const fetchProducts = async (storeId, params = {}) => {
    showSpinner(productsContainer);
    params.page = currentPage;
    params.limit = productsPerPage;
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(`/api/stores/${storeId}/products?${query}`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات');
      const { products, total } = await response.json();
      renderProducts(products, productsContainer);
      renderPagination(total);
    } catch (err) {
      showError(productsContainer, 'خطأ في تحميل المنتجات، حاول مرة أخرى.');
      console.error('خطأ في جلب المنتجات:', err);
    }
  };

  // دالة جلب الأقسام
  const fetchCategories = async (storeId) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/categories`);
      if (!response.ok) throw new Error('فشل في جلب الأقسام');
      const categories = await response.json();
      renderCategories(categories);
      if (isLandingPage) {
        document.getElementById('landing-categories').style.display = 'block';
        await renderLandingCategories(categories, storeId);
      }
    } catch (err) {
      console.error('خطأ في جلب الأقسام:', err);
      showError(categoriesContainer, 'خطأ في تحميل الأقسام، حاول مرة أخرى.');
    }
  };

  // دالة جلب المنتجات العشوائية
  const fetchRandomProducts = async (storeId) => {
    showSpinner(randomProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products?random=true&limit=4`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات العشوائية');
      const { products } = await response.json();
      renderProducts(products, randomProductsContainer);
    } catch (err) {
      showError(randomProductsContainer, 'خطأ في تحميل المنتجات العشوائية.');
      console.error('خطأ في جلب المنتجات العشوائية:', err);
    }
  };

  // دالة جلب المنتجات الجديدة
  const fetchRecentProducts = async (storeId) => {
    showSpinner(recentProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products?sort=date-desc&limit=4`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات الجديدة');
      const { products } = await response.json();
      renderProducts(products, recentProductsContainer);
    } catch (err) {
      showError(recentProductsContainer, 'خطأ في تحميل المنتجات الجديدة.');
      console.error('خطأ في جلب المنتجات الجديدة:', err);
    }
  };

  // دالة جلب المنتجات الأكثر مبيعاً
  const fetchBestsellers = async (storeId) => {
    showSpinner(bestsellersProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products/bestsellers?limit=4`);
      if (!response.ok) throw new Error('فشل في جلب المنتجات الأكثر مبيعاً');
      const products = await response.json();
      renderProducts(products, bestsellersProductsContainer);
    } catch (err) {
      showError(bestsellersProductsContainer, 'خطأ في تحميل المنتجات الأكثر مبيعاً.');
      console.error('خطأ في جلب المنتجات الأكثر مبيعاً:', err);
    }
  };

  // دالة تحميل منتجات قسم معين
  window.loadCategoryProducts = async (categoryId, categoryName, storeId) => {
    currentPage = 1; // إعادة تعيين الصفحة عند تغيير القسم
    categoryTitle.textContent = categoryId === 'all' ? 'جميع المنتجات' : categoryName;
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.category-tab[data-category-id="${categoryId}"]`)?.classList.add('active');
    const params = categoryId === 'all' ? {} : { category: categoryId };
    await fetchProducts(storeId, params);
  };

  // دالة تغيير الصفحة
  window.changePage = async (page, storeId) => {
    if (page < 1) return;
    currentPage = page;
    const params = {};
    const categoryId = document.querySelector('.category-tab.active')?.getAttribute('data-category-id');
    if (categoryId && categoryId !== 'all') params.category = categoryId;
    if (sortSelect.value !== 'default') params.sort = sortSelect.value;
    if (filterSelect.value !== 'all') params.filter = filterSelect.value;
    if (searchInput.value.trim()) params.search = searchInput.value.trim();
    await fetchProducts(storeId, params);
  };

  // دالة إضافة إلى السلة
  window.addToCart = async (productId, productName, storeLink) => {
    if (!confirm(`هل تريد إضافة ${productName} إلى السلة؟`)) return;
    const quantity = prompt(`كم وحدة من ${productName} تريد؟`, '1');
    if (quantity && !isNaN(quantity) && quantity > 0) {
      try {
        const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
        const response = await fetch(`/api/stores/${store._id}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            products: [{ productId, quantity: parseInt(quantity) }],
            paymentMethod: 'cash_on_delivery'
          })
        });
        if (!response.ok) throw new Error('فشل في إنشاء الطلب');
        showSuccess('تم إضافة المنتج إلى السلة بنجاح!');
      } catch (err) {
        alert('حدث خطأ أثناء إضافة المنتج إلى السلة');
        console.error('خطأ في إضافة المنتج:', err);
      }
    }
  };

  // إضافة event listeners
  searchBtn.addEventListener('click', async () => {
    currentPage = 1;
    const searchTerm = searchInput.value.trim();
    const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
    await fetchProducts(store._id, { search: searchTerm });
  });

  searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      currentPage = 1;
      const searchTerm = searchInput.value.trim();
      const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
      await fetchProducts(store._id, { search: searchTerm });
    }
  });

  sortSelect.addEventListener('change', async () => {
    currentPage = 1;
    const sortValue = sortSelect.value;
    const filterValue = filterSelect.value;
    const params = {};
    if (sortValue !== 'default') params.sort = sortValue;
    if (filterValue !== 'all') params.filter = filterValue;
    if (searchInput.value.trim()) params.search = searchInput.value.trim();
    const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
    await fetchProducts(store._id, params);
  });

  filterSelect.addEventListener('change', async () => {
    currentPage = 1;
    const sortValue = sortSelect.value;
    const filterValue = filterSelect.value;
    const params = {};
    if (sortValue !== 'default') params.sort = sortValue;
    if (filterValue !== 'all') params.filter = filterValue;
    if (searchInput.value.trim()) params.search = searchInput.value.trim();
    const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
    await fetchProducts(store._id, params);
  });

  categoriesNav.addEventListener('click', async (e) => {
    if (e.target.classList.contains('category-tab')) {
      currentPage = 1;
      const categoryId = e.target.getAttribute('data-category-id');
      const categoryName = e.target.textContent;
      const store = await fetch(`/api/stores/store/${storeLink}`).then(res => res.json());
      await loadCategoryProducts(categoryId, categoryName, store._id);
    }
  });

  try {
    // جلب بيانات المتجر
    const storeResponse = await fetch(`/api/stores/store/${storeLink}`);
    if (!storeResponse.ok) throw new Error('فشل في جلب بيانات المتجر');
    const store = await storeResponse.json();

    // تحديث اسم المتجر
    const storeNameElement = document.getElementById('store-name');
    if (storeNameElement) {
      storeNameElement.textContent = store.storeName;
    } else {
      console.error('store-name element not found in DOM');
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

    // تحميل الهيدر المخصص
    const storeHeaderElement = document.getElementById('store-header');
    if (storeHeaderElement) {
      storeHeaderElement.innerHTML = store.headerHtml || '<h2>مرحبًا بك في المتجر</h2>';
    } else {
      console.error('store-header element not found in DOM');
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
