// /public/js/store.js
document.addEventListener('DOMContentLoaded', async () => {
  // جلب storeLink من الرابط مباشرة
  const storeLink = window.location.pathname.includes('/landing')
    ? window.location.pathname.split('/landing/')[1]
    : window.location.pathname.split('/')[1];
  const isLandingPage = window.location.pathname.includes('/landing');

  try {
    // جلب بيانات المتجر
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const storeResponse = await fetch(`/api/stores/slug/${storeLink}`, {
      headers
    });
    if (!storeResponse.ok) throw new Error('فشل في جلب بيانات المتجر');
    const store = await storeResponse.json();

    // تحديث اسم المتجر في الصفحة
    document.getElementById('store-name').textContent = store.storeName;

    // تطبيق الألوان المخصصة
    document.documentElement.style.setProperty('--primary-color', store.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', store.secondaryColor);

    // تحميل القالب المناسب
    const templateLink = isLandingPage
      ? `/css/landing-template${store.landingTemplateId}.css`
      : `/css/template${store.templateId}.css`;
    document.getElementById(isLandingPage ? 'landing-template-css' : 'template-css').setAttribute('href', templateLink);

    // تحميل الهيدر المخصص
    const header = document.getElementById('store-header');
    header.innerHTML = store.headerHtml || '<h2>مرحبًا بك في المتجر</h2>';

    if (isLandingPage) {
      // عرض المحتوى المخصص للاندينج بيج
      const landingContent = document.getElementById('landing-content');
      landingContent.innerHTML = store.landingHtml || '<p>مرحبًا بك في الصفحة الرئيسية للمتجر!</p>';
    } else {
      // جلب الأقسام
      const categoriesResponse = await fetch(`/api/categories/slug/${storeLink}/categories`, {
        headers
      });
      if (!categoriesResponse.ok) throw new Error('فشل في جلب الأقسام');
      const categories = await categoriesResponse.json();

      // ملء dropdown الأقسام
      const categorySelect = document.getElementById('categorySelect');
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category._id;
        option.textContent = category.categoryName;
        categorySelect.appendChild(option);
      });

      // جلب المنتجات لصفحة المتجر
      window.loadProducts = async (categoryId = '') => {
        const productsResponse = await fetch(`/api/products/slug/${storeLink}/products${categoryId ? `?category=${categoryId}` : ''}`, {
          headers
        });
        if (!productsResponse.ok) throw new Error('فشل في جلب المنتجات');
        const products = await productsResponse.json();

        // عرض المنتجات في كاردات
        const productsContainer = document.getElementById('products-container');
        productsContainer.innerHTML = products.length > 0 ? products.map(product => `
          <div class="product-card">
            <img src="${product.imageUrl || '/placeholder-bot.png'}" alt="${product.productName}">
            <h3>${product.productName}</h3>
            <p>${product.description || 'لا يوجد وصف'}</p>
            ${product.hasOffer ? `
              <p class="original-price">السعر الأصلي: <del>${product.originalPrice} ${product.currency}</del></p>
              <p class="discounted-price">السعر بعد الخصم: ${product.discountedPrice} ${product.currency}</p>
            ` : `
              <p class="price">السعر: ${product.price} ${product.currency}</p>
            `}
            <p class="stock">المخزون: ${product.stock}</p>
            <button class="add-to-cart" onclick="addToCart('${product._id}', '${product.productName}', '${store._id}')">أضف إلى السلة</button>
          </div>
        `).join('') : '<p>لا توجد منتجات في هذا القسم.</p>';
      };

      // دالة فلترة المنتجات حسب القسم
      window.filterProductsByCategory = () => {
        const categoryId = document.getElementById('categorySelect').value;
        window.loadProducts(categoryId);
      };

      // تحميل المنتجات الافتراضية (كل الأقسام)
      await window.loadProducts();

      // دالة إضافة إلى السلة
      window.addToCart = async (productId, productName, storeId) => {
        const quantity = prompt(`كم وحدة من ${productName} تريد؟`, '1');
        if (quantity && !isNaN(quantity) && quantity > 0) {
          try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/orders/${storeId}/orders`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                products: [{ productId, quantity: parseInt(quantity) }],
                paymentMethod: 'cash_on_delivery'
              })
            });
            if (!response.ok) throw new Error('فشل في إنشاء الطلب');
            alert('تم إضافة المنتج إلى السلة بنجاح!');
          } catch (err) {
            alert('حدث خطأ أثناء إضافة المنتج إلى السلة');
            console.error('خطأ في إضافة المنتج إلى السلة:', err);
          }
        }
      };
    }
  } catch (err) {
    console.error('خطأ في تحميل المتجر:', err);
    document.getElementById('products-container')?.innerHTML = '<p>خطأ في تحميل المتجر، حاول مرة أخرى.</p>';
    document.getElementById('landing-content')?.innerHTML = '<p>خطأ في تحميل الصفحة، حاول مرة أخرى.</p>';
  }
});
