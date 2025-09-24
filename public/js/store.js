// /public/js/store.js
document.addEventListener('DOMContentLoaded', async () => {
  const storeId = new URLSearchParams(window.location.search).get('storeId') || window.location.pathname.split('/').pop();
  const isLandingPage = window.location.pathname.includes('/landing');
  
  try {
    // جلب بيانات المتجر
    const storeResponse = await fetch(`/api/stores/${storeId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
      // جلب المنتجات لصفحة المتجر
      const productsResponse = await fetch(`/api/stores/${storeId}/products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!productsResponse.ok) throw new Error('فشل في جلب المنتجات');
      const products = await productsResponse.json();

      // عرض المنتجات في كاردات
      const productsContainer = document.getElementById('products-container');
      productsContainer.innerHTML = products.map(product => `
        <div class="product-card">
          <img src="${product.imageUrl || '/placeholder-bot.png'}" alt="${product.productName}">
          <h3>${product.productName}</h3>
          <p>${product.description || 'لا يوجد وصف'}</p>
          <p>السعر: ${product.price} ${product.currency}</p>
          <p>المخزون: ${product.stock}</p>
          <button onclick="addToCart('${product._id}', '${product.productName}')">أضف إلى السلة</button>
        </div>
      `).join('');

      // دالة إضافة إلى السلة (يمكن توسيعها لاحقًا)
      window.addToCart = async (productId, productName) => {
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
            alert('تم إضافة المنتج إلى السلة بنجاح!');
          } catch (err) {
            alert('حدث خطأ أثناء إضافة المنتج إلى السلة');
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
