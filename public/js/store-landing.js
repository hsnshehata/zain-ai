'use strict';
// public/js/store-landing.js
// مسئول عن تحميل بيانات المتجر واختيار القالب المناسب وحقن ملفاته

(function(){
  const log = (...args) => console.log(`[Landing]`, ...args);

  // استخراج storeLink من المسار /store/:storeLink/landing
  function getStoreLinkFromPath(){
    const parts = location.pathname.split('/').filter(Boolean);
    const storeIndex = parts.indexOf('store');
    if (storeIndex !== -1 && parts[storeIndex+1]) return decodeURIComponent(parts[storeIndex+1]);
    return null;
  }

  // تحميل ملف CSS/JS ديناميكياً
  function loadCSS(href){
    return new Promise((resolve,reject)=>{
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve(href);
      link.onerror = () => reject(new Error('فشل تحميل CSS: '+href));
      document.head.appendChild(link);
    });
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = src; s.defer = true;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error('فشل تحميل Script: '+src));
      document.body.appendChild(s);
    });
  }

  // جلب بيانات المتجر + الأقسام + المنتجات
  async function fetchStoreBundle(storeLink, opts = {}){
    // اجلب كل المنتجات (بدون حد 12) عشان البحث والأقسام يعرضوا الكل
    const { preloadAll = false } = opts;
    const storeRes = await fetch(`/api/stores/store/${encodeURIComponent(storeLink)}`);
    if (!storeRes.ok) throw new Error('تعذر جلب بيانات المتجر');
    const store = await storeRes.json();

    const limit = preloadAll ? 5000 : 5000; // حمّل كل المنتجات للواجهة (بحث/أقسام/مميزة)
    const [categoriesRes, productsRes, bestsellersRes] = await Promise.all([
      fetch(`/api/categories/${store._id}/categories`),
      fetch(`/api/products/${store._id}/products?limit=${limit}&sort=date-desc`),
      fetch(`/api/products/${store._id}/products/bestsellers?limit=4`)
    ]);

    const categories = categoriesRes.ok ? await categoriesRes.json() : [];
    const productsPayload = productsRes.ok ? await productsRes.json() : { products: [], total: 0 };
    const bestsellers = bestsellersRes.ok ? await bestsellersRes.json() : [];

    return { store, categories, products: productsPayload.products, bestsellers };
  }

  // تطبيق ألوان البراند على :root
  function applyBrandPalette(store){
    const root = document.documentElement;
    const primary = store.primaryColor || '#4f46e5';
    const secondary = store.secondaryColor || '#f3f4f6';
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--bg-color', '#ffffff');
    root.style.setProperty('--surface', '#ffffff');
    // ممكن نشتق درجات بسيطة
  }

  // خريطة القوالب
  const TEMPLATE_ASSETS = {
    layout1: { css: '/templates/layout1.css', js: '/templates/layout1.js', label: 'القالب الأول' },
    layout2: { css: '/templates/layout2.css', js: '/templates/layout2.js', label: 'القالب الثاني' },
    layout3: { css: '/templates/layout3.css', js: '/templates/layout3.js', label: 'القالب الثالث' },
    layout4: { css: '/templates/layout4.css', js: '/templates/layout4.js', label: 'القالب الرابع' }
  };

  async function bootstrap(){
    try{
      const container = document.getElementById('store-app');
      const loader = document.getElementById('landing-loader');
      const storeLink = getStoreLinkFromPath();
      if (!storeLink){
        container.innerHTML = '<div style="padding:32px;">تعذر تحديد رابط المتجر</div>';
        return;
      }

      log('Fetching bundle for', storeLink);
      const params = new URLSearchParams(location.search);
      const requestedProductId = params.get('product');
      const { store, categories, products, bestsellers } = await fetchStoreBundle(storeLink, { preloadAll: !!requestedProductId });
      applyBrandPalette(store);

      const layoutId = store?.adminConfig?.landingLayout || 'layout1';
      const assets = TEMPLATE_ASSETS[layoutId] || TEMPLATE_ASSETS.layout1;

      // تحميل الـ CSS المشترك + CSS الخاص بالقالب + سكريبت القالب
      await loadCSS('/css/landing-base.css');
      await loadCSS(assets.css);
      await loadScript(assets.js);

      // انتظار جاهزية القالب
      const api = window.StoreLandingTemplates?.[layoutId];
      if (!api || typeof api.render !== 'function') {
        throw new Error('قالب غير جاهز للعرض: '+layoutId);
      }

  // القالب الكلاسيكي بيضيف زر سلة عائم بدل "زيارة المنتجات" — لذلك لا نحقن أي زر هنا

      // بناء الواجهة
      api.render({ container, store, categories, products, bestsellers });

      // لو في منتج مطلوب من الكويري، اعرض صفحة المنتج
      if (requestedProductId && typeof api.showProduct === 'function'){
        const prod = products.find(p => String(p._id) === String(requestedProductId));
        if (prod) {
          api.showProduct(prod, { store });
        }
      }

      // إخفاء اللودر
      if (loader) loader.remove();

      // تم تعطيل زر واتساب العائم الخارجي عشان ما يغطّيش زر السلة
      // لو حبيت ترجّعه، فك الكود التالي وخليه يتفعل عند الحاجة:
      // const support = store?.adminConfig?.supportWidget;
      // if (layoutId !== 'layout1' && support?.enabled && support.chatLink){
      //   const fab = document.createElement('a');
      //   fab.href = support.chatLink; fab.target = '_blank'; fab.rel = 'noopener';
      //   fab.className = 'floating-support-btn';
      //   fab.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
      //   Object.assign(fab.style, {
      //     position:'fixed', right:'18px', bottom:'18px', width:'60px', height:'60px', display:'grid', placeItems:'center',
      //     background:'var(--primary-color)', color:'#fff', borderRadius:'50%', boxShadow:'var(--shadow-md)', zIndex:60
      //   });
      //   document.body.appendChild(fab);
      // }

      log('Landing rendered with', layoutId);
    }catch(err){
      console.error('[Landing] ❌', err);
      const container = document.getElementById('store-app');
      if (container) container.innerHTML = `<div style="padding:32px; color:#b91c1c;">حدث خطأ أثناء تحميل صفحة الهبوط: ${err.message}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
