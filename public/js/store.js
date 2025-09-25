// /public/js/store.js
document.addEventListener('DOMContentLoaded', async () => {
  const storeId = new URLSearchParams(window.location.search).get('storeId') || window.location.pathname.split('/').pop();
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
    container.innerHTML = '<div class="spinner"></div>';
  };

  // دالة لعرض رسالة خطأ
  const showError = (container, message) => {
    container.innerHTML = `<p class="error-message">${message}</p>`;
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
        <button onclick="addToCart('${product._id}', '${product.productName}')">أضف إلى السلة</button>
      </div>
    `).join('');
  };

  // دالة لعرض أزرار الـ Pagination
  const renderPagination = (totalProducts) => {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.innerHTML = `
      <button class="btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
      <span>الصفحة ${currentPage} من ${totalPages}</span>
      <button class="btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>
    `;
    productsContainer.insertAdjacentElement('afterend', paginationContainer);
  };

  // دالة لعرض الأقسام
  const renderCategories = (categories) => {
    categoriesContainer.innerHTML = '<button class="category-tab active" data-category-id="all">الكل</button>';
    categories.forEach(category => {
      categoriesContainer.innerHTML += `
        <button class="category-tab" data-category-id="${category._id}">${category.name}</button>
      `;
    });
  };

  // دالة لعرض الأقسام في اللاندينج بيج
  const renderLandingCategories = async (categories) => {
    landingCategoriesContainer.innerHTML = '';
    for (const category of categories) {
      const response = await fetch(`/api/stores/${storeId}/products?category=${category._id}&random=true&limit=1`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const products = await response.json();
      const randomProduct = products[0] || {};
      landingCategoriesContainer.innerHTML += `
        <div class="category-card">
          <img src="${randomProduct.imageUrl || '/placeholder-bot.png'}" alt="${category.name}">
          <h3>${category.name}</h3>
          <button onclick="loadCategoryProducts('${category._id}', '${category.name}')">تصفح القسم</button>
        </div>
      `;
    }
  };

  // دالة جلب المنتجات
  const fetchProducts = async (params = {}) => {
    showSpinner(productsContainer);
    params.page = currentPage;
    params.limit = productsPerPage;
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(`/api/stores/${storeId}/products?${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
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
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('فشل في جلب الأقسام');
      const categories = await response.json();
      renderCategories(categories);
      if (isLandingPage) {
        document.getElementById('landing-categories').style.display = 'block';
        await renderLandingCategories(categories);
      }
    } catch (err) {
      console.error('خطأ في جلب الأقسام:', err);
    }
  };

  // دالة جلب المنتجات العشوائية
  const fetchRandomProducts = async () => {
    showSpinner(randomProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products?random=true&limit=4`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('فشل في جلب المنتجات العشوائية');
      const products = await response.json();
      renderProducts(products, randomProductsContainer);
    } catch (err) {
      showError(randomProductsContainer, 'خطأ في تحميل المنتجات العشوائية.');
      console.error('خطأ في جلب المنتجات العشوائية:', err);
    }
  };

  // دالة جلب المنتجات الجديدة
  const fetchRecentProducts = async () => {
    showSpinner(recentProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products?sort=date-desc&limit=4`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('فشل في جلب المنتجات الجديدة');
      const products = await response.json();
      renderProducts(products, recentProductsContainer);
    } catch (err) {
      showError(recentProductsContainer, 'خطأ في تحميل المنتجات الجديدة.');
      console.error('خطأ في جلب المنتجات الجديدة:', err);
    }
  };

  // دالة جلب المنتجات الأكثر مبيعاً
  const fetchBestsellers = async () => {
    showSpinner(bestsellersProductsContainer);
    try {
      const response = await fetch(`/api/stores/${storeId}/products/bestsellers?limit=4`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('فشل في جلب المنتجات الأكثر مبيعاً');
      const products = await response.json();
      renderProducts(products, bestsellersProductsContainer);
    } catch (err) {
      showError(bestsellersProductsContainer, 'خطأ في تحميل المنتجات الأكثر مبيعاً.');
      console.error('خطأ في جلب المنتجات الأكثر مبيعاً:', err);
    }
  };

  // دالة تحميل منتجات قسم معين
  window.loadCategoryProducts = async (categoryId, categoryName) => {
    currentPage = 1; // إعادة تعيين الصفحة عند تغيير القسم
    categoryTitle.textContent = categoryId === 'all' ? 'جميع المنتجات' : categoryName;
    document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.category-tab[data-category-id="${categoryId}"]`)?.classList.add('active');
    const params = categoryId === 'all' ? {} : { category: categoryId };
    await fetchProducts(params);
  };

  // دالة تغيير الصفحة
  window.changePage = async (page) => {
    if (page < 1) return;
    currentPage = page;
    const params = {};
    const categoryId = document.querySelector('.category-tab.active')?.getAttribute('data-category-id');
    if (categoryId && categoryId !== 'all') params.category = categoryId;
    if (sortSelect.value !== 'default') params.sort = sortSelect.value;
    if (filterSelect.value !== 'all') params.filter = filterSelect.value;
    if (searchInput.value.trim()) params.search = searchInput.value.trim();
    await fetchProducts(params);
  };

  // دالة إضافة إلى السلة
  window.addToCart = async (productId, productName) => {
    if (!confirm(`هل تريد إضافة ${productName} إلى السلة؟`)) return;
    const quantity = prompt(`كم وحدة من ${productName} تريد؟`, '1');
    if (quantity && !isNaN(quantity) && quantity > 0) {
      try {
        const response = await fetch(`/api/stores/${storeId}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    currentPage = 1; // إعادة تعيين الصفحة عند البحث
    const searchTerm = searchInput.value.trim();
    await fetchProducts({ search: searchTerm });
  });

  searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      currentPage = 1;
      const searchTerm = searchInput.value.trim();
      await fetchProducts({ search: searchTerm });
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
    await fetchProducts(params);
  });

  filterSelect.addEventListener('change', async () => {
    currentPage = 1;
    const sortValue = sortSelect.value;
    const filterValue = filterSelect.value;
    const params = {};
    if (sortValue !== 'default') params.sort = sortValue;
    if (filterValue !== 'all') params.filter = filterValue;
    if (searchInput.value.trim()) params.search = searchInput.value.trim();
    await fetchProducts(params);
  });

  categoriesNav.addEventListener('click', async (e) => {
    if (e.target.classList.contains('category-tab')) {
      currentPage = 1;
      const categoryId = e.target.getAttribute('data-category-id');
      const categoryName = e.target.textContent;
      await loadCategoryProducts(categoryId, categoryName);
    }
  });

  try {
    // جلب بيانات المتجر
    const storeResponse = await fetch(`/api/stores/${storeId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!storeResponse.ok) throw new Error('فشل في جلب بيانات المتجر');
    const store = await storeResponse.json();

    // تحديث اسم المتجر
    document.getElementById('store-name').textContent = store.storeName;

    // تطبيق الألوان المخصصة
    document.documentElement.style.setProperty('--primary-color', store.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', store.secondaryColor);

    // تحميل القالب
    const templateLink = isLandingPage
      ? `/css/landing-template${store.landingTemplateId}.css`
      : `/css/template${store.templateId}.css`;
    document.getElementById(isLandingPage ? 'landing-template-css' : 'template-css').setAttribute('href', templateLink);

    // تحميل الهيدر المخصص
    document.getElementById('store-header').innerHTML = store.headerHtml || '<h2>مرحبًا بك في المتجر</h2>';

    // تحميل الأقسام والمنتجات
    await fetchCategories();
    if (!isLandingPage) {
      await fetchRandomProducts();
      await fetchRecentProducts();
      await fetchBestsellers();
      await fetchProducts();
    }
  } catch (err) {
    console.error('خطأ في تحميل المتجر:', err);
    showError(productsContainer, 'خطأ في تحميل المتجر، حاول مرة أخرى.');
    if (isLandingPage) {
      showError(landingCategoriesContainer, 'خطأ في تحميل الصفحة، حاول مرة أخرى.');
    }
  }
});
