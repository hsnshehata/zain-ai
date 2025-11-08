// القالب الأول: كلاسيكي — بناء واجهة نظيفة واعتيادية
(function(){
  window.StoreLandingTemplates = window.StoreLandingTemplates || {};
  const id = 'layout3';
  // مرجع المتجر عشان السلة واللينكات
  let STORE_REF = null;
  // حالة الواجهة (بحث/مفضلة)
  const UI_STATE = { showFavs: false, query: '', currentCategory: 'all' }; // إضافة currentCategory للفلترة حسب القسم

  // نظام سلة بسيط باستخدام localStorage
  function cartKey(){ return STORE_REF? `zain_cart_${STORE_REF._id}` : 'zain_cart'; }
  function readCart(){
    try { return JSON.parse(localStorage.getItem(cartKey())||'{}'); } catch{ return {}; }
  }
  function writeCart(c){ localStorage.setItem(cartKey(), JSON.stringify(c)); }
  function cartCount(){ const c = readCart(); return Object.values(c).reduce((s,n)=> s + (Number(n)||0), 0); }
  function updateCartBadge(){
    const n = cartCount();
    // بادج الفاب (المصدر الأساسي الآن)
    const fabBadge = document.querySelector('.fab-cart .badge');
    if (fabBadge){
      fabBadge.textContent = n>99?'99+':String(n||0);
      fabBadge.style.display = 'inline-block'; // نظهرها دايمًا
    }
    // بادج زر السلة في الشريط العلوي
    const topBadge = document.querySelector('.top-utility-bar .go-cart .badge');
    if (topBadge){
      if (n > 0){
        topBadge.textContent = n>99?'99+':String(n);
        topBadge.style.display = 'inline-block';
      } else {
        topBadge.textContent = '';
        topBadge.style.display = 'none';
      }
    }
  }
  function addToCart(p, qty=1, selectedOptions=null){
    if (!STORE_REF?.adminConfig?.enableCart) return; // لو السلة مقفولة
    const stock = Number(p?.stock ?? 0);
    if (stock <= 0){
      alert('المنتج غير متوفر حالياً وتم إخفاؤه من المتجر مؤقتًا');
      return;
    }
    const c = readCart();
    const pid = String(p._id);
    let key = pid;
    if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length){
      try { key = `${pid}::${encodeURIComponent(JSON.stringify(selectedOptions))}`; } catch(_){ key = pid; }
    }
    const cur = Number(c[key])||0;
    const wanted = cur + Number(qty||1);
    if (wanted > stock){
      c[key] = stock;
      writeCart(c);
      updateCartBadge();
      alert(`أقصى كمية متاحة حالياً: ${stock}`);
      return;
    }
    c[key] = wanted;
    writeCart(c);
    updateCartBadge();
    // أنيميشن bump للفاب
    const fab = document.querySelector('.fab-cart');
    if (fab){
      fab.classList.remove('cart-bump');
      // إعادة التدفق لإعادة تشغيل الأنيميشن
      void fab.offsetWidth;
      fab.classList.add('cart-bump');
    }
  }

  // المفضلة باستخدام localStorage
  function favKey(){ return STORE_REF? `zain_wishlist_${STORE_REF._id}` : 'zain_wishlist'; }
  function readFavs(){
    try { const arr = JSON.parse(localStorage.getItem(favKey())||'[]'); return new Set((Array.isArray(arr)?arr:[]).map(String)); } catch{ return new Set(); }
  }
  function writeFavs(set){ try { localStorage.setItem(favKey(), JSON.stringify(Array.from(set||[]))); } catch{} }
  function isFavorite(id){ return readFavs().has(String(id)); }
  function toggleFavorite(id){
    const s = readFavs(); const key = String(id);
    if (s.has(key)) s.delete(key); else s.add(key);
    writeFavs(s); updateFavBadge();
    // حدث بسيط لتحديث كل القلوب (بطاقات + سلايدر)
    document.querySelectorAll(`[data-fav="${key}"]`).forEach(btn=>{
      const i = btn.querySelector('i');
      if (s.has(key)){
        btn.classList.add('active'); if (i) i.className = 'fa-solid fa-heart';
      } else {
        btn.classList.remove('active'); if (i) i.className = 'fa-regular fa-heart';
      }
    });
    return s.has(key);
  }
  function updateFavBadge(){
    const el = document.querySelector('.header-classic .icon.favs .badge');
    if (!el) return; const n = readFavs().size; el.textContent = n>99?'99+':String(n||0); el.style.display = n? 'inline-block' : 'none';
  }

  // مشاركة المنتج
  function shareProduct(p){
    const url = new URL(location.href);
    url.searchParams.set('product', p._id);
    const shareData = { title: p.productName, text: p.description||p.productName, url: url.toString() };
    if (navigator.share){ navigator.share(shareData).catch(()=>{}); }
    else {
      navigator.clipboard?.writeText(shareData.url).then(()=>{
        try { const t = document.createElement('div'); t.textContent = 'تم نسخ رابط المنتج'; t.style.position='fixed'; t.style.insetInlineStart='50%'; t.style.insetBlockStart='20px'; t.style.transform='translateX(-50%)'; t.style.background='rgba(0,0,0,.8)'; t.style.color='#fff'; t.style.padding='8px 12px'; t.style.borderRadius='8px'; t.style.zIndex='1000'; document.body.appendChild(t); setTimeout(()=>t.remove(),1200); } catch{}
      });
    }
  }

  // واجهة السلة: فاب + درج
  function mountCartFab(){
    if (!STORE_REF?.adminConfig?.enableCart) return;
    // تم إلغاء الفاب والاكتفاء بزر السلة في الشريط العلوي
    const existing = document.querySelector('.fab-cart');
    if (existing) existing.remove();
  }

  function renderCartList(container){
    const cart = readCart();
    const ids = Object.keys(cart);
    const items = ids.map(id => {
      const [pid, optStr] = String(id).split('::');
      let selectedOptions = [];
      if (optStr){ try { selectedOptions = JSON.parse(decodeURIComponent(optStr)); } catch(_){} }
      const p = (window.__ALL_PRODUCTS__||[]).find(x=>String(x._id)===String(pid));
      return { id, pid, qty: Number(cart[id])||0, p, selectedOptions };
    }).filter(x=>x.p);
    if (items.length===0){
      container.innerHTML = `<div style="text-align:center;color:#6b7280;padding:24px;">السلة فارغة</div>`;
      return { items: [], total: 0, currency: '' };
    }
    let total = 0; let currency = items[0].p.currency || '';
    container.innerHTML = items.map(({p, qty, selectedOptions, id})=>{
      const price = (p.hasOffer && p.discountedPrice) ? p.discountedPrice : p.price;
      total += Number(price||0) * qty;
      const opts = Array.isArray(selectedOptions) && selectedOptions.length
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${selectedOptions.map(o=>`${o.name}: ${o.value}`).join(' ، ')}</div>`
        : '';
      return `
        <div class="cart-item" data-key="${id}" data-id="${p._id}">
          <img src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}" loading="lazy" decoding="async">
          <div>
            <div style="font-weight:700;">${p.productName}</div>
            ${opts}
            <div style="color:var(--primary-color);font-weight:800;">${price} <small>${p.currency||''}</small></div>
          </div>
          <div class="qty">
            <button data-act="dec">-</button>
            <span class="q">${qty}</span>
            <button data-act="inc">+</button>
            <button data-act="rm" title="إزالة" style="margin-inline-start:8px">✕</button>
          </div>
        </div>`;
    }).join('');
    return { items, total, currency };
  }

  function openCartDrawer(){
    // منع فتح أكتر من نسخة للسلة
    const existing = document.querySelector('.cart-drawer-backdrop');
    if (existing){
      // ممكن نركز على أول عنصر أو نهزّه كإشارة
      existing.querySelector('header')?.scrollIntoView({ block:'nearest' });
      return;
    }
    const backdrop = document.createElement('div');
    backdrop.className = 'cart-drawer-backdrop';
  backdrop.innerHTML = `<aside class="cart-drawer"><header><span>سلة المشتريات</span><button class="btn btn-outline" data-close>إغلاق</button></header><div class="cart-list"></div><div class="cart-footer"><div class="cart-total"><span>الإجمالي</span><strong class="t">0</strong></div><div class="checkout-area"></div></div></aside>`;
    document.body.appendChild(backdrop);

    const listEl = backdrop.querySelector('.cart-list');
    const totalEl = backdrop.querySelector('.cart-total .t');
    const checkoutEl = backdrop.querySelector('.checkout-area');

    function loadCustomerCache(){
      try { return JSON.parse(localStorage.getItem(`zain_customer_${STORE_REF._id}`)||'{}'); } catch { return {}; }
    }
    function saveCustomerCache(obj){ try { localStorage.setItem(`zain_customer_${STORE_REF._id}`, JSON.stringify(obj||{})); } catch{} }

    // ضبط السلة حسب المخزون الحالي (حذف العناصر صفر مخزون وتقليل الكميات الزائدة)
    function normalizeCart(){
      try {
        const c = readCart();
        let changed = false;
        for (const id of Object.keys(c)){
          const [pid] = String(id).split('::');
          const p = (window.__ALL_PRODUCTS__||[]).find(x=> String(x._id)===String(pid));
          if (!p) continue;
          const stock = Number(p.stock ?? 0);
          const q = Number(c[id])||0;
          if (stock <= 0){ delete c[id]; changed = true; continue; }
          if (q > stock){ c[id] = stock; changed = true; }
          if (c[id] <= 0){ delete c[id]; changed = true; }
        }
        if (changed){ writeCart(c); }
      } catch(_){ /* no-op */ }
    }

    function refresh(){
      // قبل العرض اضبط السلة على المخزون
      normalizeCart();
      const { items, total, currency } = renderCartList(listEl);
      totalEl.textContent = `${total.toFixed(2)} ${currency}`;
      if (items.length===0){ checkoutEl.innerHTML = ''; return; }
      const cached = loadCustomerCache();
      checkoutEl.innerHTML = `
        <div id="coInit" class="checkout-form">
          <button class="btn btn-primary" id="coStart">إكمال الطلب</button>
        </div>
        <div id="coPhonePanel" class="checkout-form hidden">
          <input type="tel" id="coPhone" placeholder="رقم الموبايل للتواصل" required>
          <button class="btn btn-primary" id="coPhoneConfirm">جلب البيانات</button>
        </div>
        <div id="coStep2" class="checkout-form hidden">
          <input type="text" id="coName" placeholder="الاسم الكامل" required>
          <input type="email" id="coEmail" placeholder="البريد الإلكتروني (اختياري)">
          <input type="text" id="coAddress" placeholder="اكتب العنوان بالتفصيل (المدينة/المنطقة/الشارع/المعلم القريب)" required>
          <small style="color:#6b7280;display:block;margin-top:4px;">العنوان لازم يكون واضح عشان نوصل طلبك بسهولة</small>
          <div class="pay-methods" style="display:grid; gap:6px;">
            <label style="display:flex;align-items:center;gap:8px;"><input type="radio" name="pay" value="cod" checked> الدفع عند الاستلام</label>
            <label style="display:flex;align-items:center;gap:8px;"><input type="radio" name="pay" value="wallet"> الدفع عن طريق المحفظة أو إنستاباي</label>
          </div>
          <textarea id="coNote" rows="2" placeholder="ملاحظات (اختياري)"></textarea>
          <button class="btn btn-primary" id="coSubmit">تأكيد الطلب</button>
        </div>`;
      // تعبئة من الكاش لو موجود
      if (cached.phone){ checkoutEl.querySelector('#coPhone').value = cached.phone; }
      if (cached.name){ checkoutEl.querySelector('#coName').value = cached.name; }
      if (cached.email){ checkoutEl.querySelector('#coEmail').value = cached.email; }
      if (cached.address){ checkoutEl.querySelector('#coAddress').value = cached.address; }

      const init = checkoutEl.querySelector('#coInit');
      const phonePanel = checkoutEl.querySelector('#coPhonePanel');
      const step2 = checkoutEl.querySelector('#coStep2');

      checkoutEl.querySelector('#coStart').onclick = ()=>{
        init.classList.add('hidden');
        phonePanel.classList.remove('hidden');
        checkoutEl.querySelector('#coPhone').focus();
      };

      checkoutEl.querySelector('#coPhoneConfirm').onclick = async ()=>{
        const phoneInput = checkoutEl.querySelector('#coPhone');
        const phone = phoneInput.value.trim();
        const digits = phone.replace(/\D+/g,'');
        if (!digits || digits.length < 6){ alert('أدخل رقم موبايل صالح'); phoneInput.focus(); return; }
        // محاولة جلب بيانات العميل (إن وجدت)
        try {
          const r = await fetch(`/api/customers/public/${STORE_REF._id}/lookup?phone=${encodeURIComponent(phone)}`);
          if (r.ok){
            const data = await r.json();
            if (data?.name) checkoutEl.querySelector('#coName').value = data.name;
            if (data?.email) checkoutEl.querySelector('#coEmail').value = data.email;
            if (data?.address) checkoutEl.querySelector('#coAddress').value = data.address;
          }
        } catch(_){ /* ignore */ }
        // بعد الجلب نعرض النموذج الكامل
        phonePanel.classList.add('hidden');
        step2.classList.remove('hidden');
        checkoutEl.querySelector('#coName').focus();
      };

      checkoutEl.querySelector('#coSubmit').onclick = async ()=>{
        const phone = checkoutEl.querySelector('#coPhone').value.trim();
        const name = checkoutEl.querySelector('#coName').value.trim();
        const email = checkoutEl.querySelector('#coEmail').value.trim();
  const addr = checkoutEl.querySelector('#coAddress').value.trim();
        const note = checkoutEl.querySelector('#coNote').value.trim();
        const payVal = (checkoutEl.querySelector('input[name="pay"]:checked')?.value)||'cod';
  if (!name || !phone){ alert('يرجى إدخال الاسم ورقم الموبايل'); return; }
  if (!addr || addr.length < 8){ alert('يرجى كتابة العنوان بالتفصيل (المدينة/المنطقة/الشارع/المعلم القريب)'); return; }
        const payload = {
          products: items.map(x=>({ productId: x.p._id, quantity: x.qty, selectedOptions: x.selectedOptions||[] })),
          paymentMethod: payVal==='cod' ? 'cash_on_delivery' : 'whatsapp_confirmation',
          customerName: name,
          customerWhatsapp: phone,
          customerEmail: email,
          customerAddress: addr,
          customerNote: note
        };
        checkoutEl.querySelector('#coSubmit').disabled = true;
        try {
          const r = await fetch(`/api/orders/${STORE_REF._id}/orders`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
          if (!r.ok) throw new Error('failed');
          const order = await r.json();
          saveCustomerCache({ name, phone, email, address: addr });
          writeCart({});
          updateCartBadge();
          listEl.innerHTML = `<div style=\"text-align:center;color:#10b981;padding:24px;\">تم تسجيل الطلب بنجاح، سنقوم بالتواصل معك قريبًا</div>`;
          checkoutEl.innerHTML = '';
          // في حالة المحفظة/إنستاباي: توجيه للواتساب برسالة تفاصيل الطلب
          if (payVal !== 'cod'){
            const wa = STORE_REF?.whatsapp ? String(STORE_REF.whatsapp).replace(/\D+/g,'') : '';
            if (wa){
              try {
                const lines = items.map(x=>{
                  const price = (x.p.hasOffer && x.p.discountedPrice) ? x.p.discountedPrice : x.p.price;
                  const optTxt = (x.selectedOptions && x.selectedOptions.length)
                    ? ` (${x.selectedOptions.map(o=>o.value).join(' / ')})`
                    : '';
                  return `- ${x.p.productName}${optTxt} × ${x.qty} = ${price} ${x.p.currency||''}`;
                });
                const sum = items.reduce((s,x)=>{
                  const price = (x.p.hasOffer && x.p.discountedPrice) ? Number(x.p.discountedPrice) : Number(x.p.price);
                  return s + (price||0) * x.qty;
                },0);
                const cur = items[0]?.p?.currency || '';
                const msg = `مرحبا، أتممت طلب عبر الموقع\nرقم الطلب: ${order._id}\nالاسم: ${name}\nالهاتف: ${phone}\n\nالمنتجات:\n${lines.join('\n')}\n\nالإجمالي: ${sum.toFixed(2)} ${cur}\nطريقة الدفع: المحفظة/إنستاباي\n${note?`\nملاحظات: ${note}`:''}`;
                const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
              } catch(_){ /* ignore */ }
            }
          }
        } catch(e){
          alert('تعذر إكمال الطلب، حاول مرة أخرى');
          checkoutEl.querySelector('#coSubmit').disabled = false;
        }
      };
    }

    refresh();

    backdrop.addEventListener('click', (e)=>{ if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('[data-close]').addEventListener('click', ()=> backdrop.remove());
    listEl.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if (!btn) return;
      const itemEl = btn.closest('.cart-item'); const key = itemEl?.getAttribute('data-key');
      if (!key) return;
      const cart = readCart();
      const act = btn.getAttribute('data-act');
      if (act==='inc'){
        const [pid] = String(key).split('::');
        const p = (window.__ALL_PRODUCTS__||[]).find(x=> String(x._id)===String(pid));
        const stock = Number(p?.stock ?? Infinity);
        const next = (Number(cart[key])||0) + 1;
        if (next > stock){ alert(`أقصى كمية متاحة حالياً: ${isFinite(stock)?stock:0}`); return; }
        cart[key] = next;
      }
      if (act==='dec'){ cart[key] = Math.max(1, (Number(cart[key])||0) - 1); }
      if (act==='rm'){ delete cart[key]; }
      writeCart(cart); updateCartBadge(); refresh();
    });
  }

  // دالة مساعدة لبناء بطاقة منتج
  function productCard(p, enableCart){
    // Helpers
    const rnd = (min, max)=> Math.random()*(max-min)+min;
    const stars = (()=>{
      // توزيع النجوم الآن على كامل ارتفاع البطاقة بدل الجزء العلوي فقط
      const count = 24; const arr = [];
      for (let i=0;i<count;i++){
        const x = rnd(2, 98).toFixed(2);
        const y = rnd(4, 94).toFixed(2); // يغطي تقريباً كل الكارت مع هامش بسيط
        const d = rnd(4, 9).toFixed(2); // مدة نبض أطول لراحة العين
        const s = rnd(1.4, 3.6).toFixed(2); // حجم النجمة
        const delay = rnd(-4, 4).toFixed(2);
        arr.push(`<span style="--x:${x}%;--y:${y}%;--d:${d}s;--delay:${delay}s;--s:${s}px"></span>`);
      }
      return arr.join('');
    })();

    // Data
    const priceNow = (p.hasOffer && p.discountedPrice) ? p.discountedPrice : p.price;
    const priceWas = (p.hasOffer && p.originalPrice) ? p.originalPrice : null;
    const currency = p.currency || '';
    let percent = null;
    try { if (priceWas) { percent = Math.round((1 - (Number(priceNow||0)/Number(priceWas||1))) * 100); } } catch(_){ percent = null; }
    const fav = isFavorite(p._id);
    const sales = Number(p.salesCount||p.totalSold||0);
    const isBestseller = Boolean(p.isBestseller || p.bestSeller || p.bestseller || sales >= 10);
    let isNew = false;
    try { const dt = new Date(p.createdAt || p.created_at || p.dateAdded); if (!isNaN(dt.getTime())){ isNew = (Date.now() - dt.getTime()) <= (1000*60*60*24*14); } } catch(_){ isNew = false; }

    // Badges under image
    const badgeBest = isBestseller ? `<span class="badge-astro best" title="الأكثر مبيعاً"><i class="fa-solid fa-rocket"></i> الأكثر مبيعاً</span>` : '';
    const badgeDisc = (percent && percent>0) ? `<span class="badge-astro disc" title="خصم ${percent}%"><i class="fa-solid fa-bolt"></i> خصم ${percent}%</span>` : (p.hasOffer?`<span class="badge-astro disc" title="عرض"><i class="fa-solid fa-bolt"></i> عرض</span>`:'');
    const badgeNew = isNew ? `<span class="badge-astro new" title="جديد"><i class="fa-solid fa-star-of-life"></i> جديد</span>` : '';

    const priceLine = `
      <div class="price-line">
        <div class="now">${priceNow} <small>${currency}</small></div>
        ${priceWas?`<div class="was">${priceWas}</div>`:''}
      </div>`;

    return `
      <div class="product-card product-card-astro" aria-label="${p.productName}" data-pid="${p._id}">
        <div class="stars" aria-hidden="true">${stars}</div>
        <a class="media" href="?product=${p._id}" data-view="${p._id}" aria-label="عرض سريع">
          <img src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}" loading="lazy" decoding="async">
        </a>
        <button class="fav-toggle ${fav?'active':''}" title="أضف للمفضلة" aria-label="أضف للمفضلة" data-fav="${p._id}"><i class="${fav?'fa-solid fa-heart':'fa-regular fa-heart'}"></i></button>
        <div class="badges-row">${badgeNew}${badgeBest}${badgeDisc}</div>
        <div class="content">
          <div class="title-line"><div class="name">${p.productName}</div></div>
          ${priceLine}
          ${p.description?`<div class="desc">${p.description}</div>`:''}
          <div class="actions">
            ${enableCart?`<button class="btn btn-primary" data-add="${p._id}"><i class=\"fa-solid fa-cart-plus\"></i> أضف للسلة</button>`:''}
            <button class="icon-btn" title="عرض المنتج" aria-label="عرض المنتج" data-view="${p._id}"><i class="fa-regular fa-eye"></i></button>
            <button class="icon-btn" title="مشاركة" aria-label="مشاركة" data-share="${p._id}"><i class="fa-solid fa-share-nodes"></i></button>
          </div>
        </div>
      </div>`;
  }

  function socialIcons(social){
    const items = [
      ['facebook','fa-brands fa-facebook'],
      ['instagram','fa-brands fa-instagram'],
      ['twitter','fa-brands fa-x-twitter'],
      ['youtube','fa-brands fa-youtube'],
      ['tiktok','fa-brands fa-tiktok'],
      ['linkedin','fa-brands fa-linkedin']
    ].filter(([k])=>social?.[k]).map(([k,icon])=>`<a href="${social[k]}" target="_blank" rel="noopener" aria-label="${k}"><i class="${icon}"></i></a>`).join('');
    return items ? `<div class="social">${items}</div>` : '';
  }

  function renderHero(store){
    const tagline = store.storeDescription || '';
  const logo = store.storeLogoUrl ? `<div class="logo-wrap"><img src="${store.storeLogoUrl}" alt="${store.storeName}" decoding="async" fetchpriority="high"></div>` : '';
    // دمج البنر داخل الهيرو بدل سكشن مستقل
    const banner = store.adminConfig?.banner?.enabled ? store.adminConfig.banner : null;
    let heroBanner = '';
    if (banner?.imageUrl){
      const act = banner.linkType || '';
      const productIdAttr = act === 'product' && banner.productId ? ` data-product-id="${banner.productId}"` : '';
      const urlAttr = act === 'external' && banner.externalUrl ? ` data-url="${banner.externalUrl}"` : '';
      heroBanner = `<div class="hero-banner-img" role="link" tabindex="0" aria-label="بنر مميز" data-banner-act="${act}"${productIdAttr}${urlAttr}>
        <img src="${banner.imageUrl}" alt="بنر المتجر" ${act? 'decoding="async" fetchpriority="high"':'loading="lazy" decoding="async"'}>
      </div>`;
    }
    const ctaCfg = store.adminConfig?.heroCta || {};
    const ctaText = (ctaCfg.text || 'ابدأ التسوق الآن').trim();
    const ctaAct = ctaCfg.linkType || 'scroll_products'; // scroll_products | favorites | external | product
    const ctaExtra = ctaAct === 'product' && ctaCfg.productId ? ` data-product-id="${ctaCfg.productId}"` : '';
    const ctaUrl = ctaAct === 'external' && ctaCfg.url ? ctaCfg.url : '';
    const ctaColor = ctaCfg.color || 'var(--primary-color)';
    return `
      <section class="hero-header" aria-label="${store.storeName||'المتجر'}">
        <div class="hero-brand">
          <div class="brand-info">
            <h1>${store.storeName||''}</h1>
            ${tagline?`<div class="tagline">${tagline}</div>`:''}
          </div>
          <div class="brand-logo">${logo}</div>
        </div>
        ${heroBanner}
        <div class="hero-cta-wrap">
          <button class="hero-cta" data-cta="${ctaAct}"${ctaExtra}${ctaUrl?` data-url="${ctaUrl}"`:''} style="--cta-color:${ctaColor}">
            <span class="txt">${ctaText}</span>
            <i class="fa-solid fa-arrow-down-long" aria-hidden="true"></i>
          </button>
        </div>
        <div class="hero-scroll-indicator" aria-hidden="true"><div class="wheel"></div></div>
      </section>`;
  }

  function renderBanner(admin, products){
    if (!admin?.banner?.enabled) return '';
    const b = admin.banner;
    // بناء الأزرار
    let ctas = '';
    if (b.linkType === 'product' && b.productId){
      const p = products?.find(x => String(x._id) === String(b.productId));
      if (p){
        ctas = `
          <a class="cta" href="?product=${p._id}" data-view="${p._id}"><i class="fa-regular fa-eye"></i> عرض</a>
          ${STORE_REF?.adminConfig?.enableCart?`<button class="cta" data-add="${p._id}" style="display:inline-flex;align-items:center;gap:6px;"><i class=\"fa-solid fa-cart-plus\"></i> أضف للسلة</button>`:''}
        `;
      }
    } else if (b.linkType === 'external' && b.externalUrl){
      ctas = `<a class="cta" href="${b.externalUrl}" target="_blank" rel="noopener">انتقل إلى</a>`;
    }
    const text = b.text ? `<div class="banner-text">${b.text}</div>` : '';
  const img = b.imageUrl ? `<img class="banner-img" src="${b.imageUrl}" alt="بنر" loading="lazy" decoding="async">` : '';
    return `
      <div class="banner-classic">
        <div class="wrap">
          <div class="banner-hero">
            ${img}
            ${ctas?`<div class="banner-ctas">${ctas}</div>`:''}
          </div>
          ${text}
        </div>
      </div>`;
  }

  function renderCategoriesBar(categories, admin){
    const allPill = `<button class="pill active" data-cid="all"><i class="fa-regular fa-square"></i> الكل</button>`;
    const pills = categories.map(c=>`<button class="pill" data-cid="${c._id}"><i class="fa-regular fa-folder"></i> ${c.name}</button>`).join('');
    const extra = admin?.extraSection?.enabled && admin.extraSection.url && admin.extraSection.label
      ? `<a class="pill" href="${admin.extraSection.url}" target="_blank" rel="noopener">${admin.extraSection.label}</a>` : '';
    return `<div class="categories-bar"><div class="wrap">${allPill}${pills}${extra}</div></div>`;
  }

  function productChip(p){
    const price = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
    const fav = isFavorite(p._id);
    return `
      <div class="product-chip" data-view="${p._id}" aria-label="${p.productName}">
        <div class="thumb">
          <img src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}" loading="lazy" decoding="async">
          <button class="fav ${fav?'active':''}" title="أضف للمفضلة" data-fav="${p._id}"><i class="${fav?'fa-solid fa-heart':'fa-regular fa-heart'}"></i></button>
        </div>
        <div class="meta">
          <div class="name">${p.productName}</div>
          <div class="price">${price} <small>${p.currency||''}</small></div>
        </div>
      </div>`;
  }

  function renderFeatured(products){
    const list = products.slice(0,8);
  const slides = list.map((p,i)=>{
      const price = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
      const fav = isFavorite(p._id);
    return `
  <div class="cinema-slide${i===0?' is-active anim-fade':''}" data-idx="${i}" data-view="${p._id}" aria-label="${p.productName}">
      <img class="bg" src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}" ${i===0?"fetchpriority=\"high\" decoding=\"async\"":"loading=\"lazy\" decoding=\"async\""}>
          <div class="overlay"></div>
          <div class="content">
            <div class="title">${p.productName}</div>
            <div class="price">${price} <small>${p.currency||''}</small></div>
            <div class="acts">
              <button class="cinema-cta" data-view="${p._id}"><i class="fa-regular fa-eye"></i> عرض المنتج</button>
            </div>
          </div>
        </div>`;
    }).join('');
    return `
      <section id="featured" class="section featured-cinema">
        <h2 class="section-title" style="text-align:center;">إليك بعض منتجاتنا المميزة</h2>
        <div class="cinema-viewport">
          ${slides}
          <button class="nav prev" aria-label="السابق"><i class="fa-solid fa-angle-right"></i></button>
          <button class="nav next" aria-label="التالي"><i class="fa-solid fa-angle-left"></i></button>
        </div>
      </section>`;
  }

  function renderCategoriesShow(categories){
    const list = categories.slice(0,6).map(c=>`<div class="cat" data-cid="${c._id}" role="link" tabindex="0" aria-label="${c.name}"><span>${c.name}</span></div>`).join('');
    return `<section id="cats" class="section"><h2 class="section-title" style="text-align:center;">تصفح حسب القسم</h2><div class="categories-show">${list}</div></section>`;
  }

  function renderAbout(store){
    // إزالة أيقونات السوشيال من هنا بناءً على الطلب — ستظهر فقط في الفوتر
    return `<section id="about" class="about-classic"><div class="wrap"><h2 class="section-title">عن المتجر</h2><p style="line-height:1.8;color:#374151;">${store.storeDescription||'مرحبا بك في متجرنا. نقدم لك أفضل المنتجات بأفضل الأسعار.'}</p></div></section>`;
  }

  function renderFooter(store){
    const socials = socialIcons(store.socialLinks);
    const mapsBtn = store.googleMapsLink ? `<a href="${store.googleMapsLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#10b981;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;"><i class="fa-solid fa-map-location-dot"></i> خرائط جوجل</a>` : '';
    const siteBtn = store.website ? `<a href="${store.website}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;"><i class="fa-solid fa-globe"></i> الموقع الإلكتروني</a>` : '';
    const hasActions = Boolean(mapsBtn || siteBtn);
    const contacts = `
      <ul style="list-style:none;padding:0;margin:10px 0 0;display:grid;gap:6px;">
        ${store.whatsapp?`<li><a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener"><i class=\"fa-brands fa-whatsapp\"></i> واتساب: ${store.whatsapp}</a></li>`:''}
        ${store.mobilePhone?`<li><a href="tel:${store.mobilePhone}"><i class=\"fa-solid fa-phone\"></i> موبايل: ${store.mobilePhone}</a></li>`:''}
        ${store.landline?`<li><a href="tel:${store.landline}"><i class=\"fa-solid fa-phone-volume\"></i> أرضي: ${store.landline}</a></li>`:''}
        ${store.email?`<li><a href="mailto:${store.email}"><i class=\"fa-regular fa-envelope\"></i> البريد: ${store.email}</a></li>`:''}
        ${store.address?`<li><i class=\"fa-solid fa-location-dot\"></i> ${store.address}</li>`:''}
      </ul>`;
    const actions = hasActions ? `<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">${mapsBtn}${siteBtn}</div>` : '';
    return `<footer class="footer-classic"><div class="wrap">
      <div>
        <div class="brand" style="color:#fff;gap:10px;">${store.storeLogoUrl?`<img src="${store.storeLogoUrl}" alt="${store.storeName}" style="width:72px;height:72px;">`:''}<strong>${store.storeName||''}</strong></div>
        <p style="opacity:.8;margin-top:8px;">${store.footerText||''}</p>
      </div>
      <div>
        <strong>تابعنا</strong>
        ${socials || '<div style="margin-top:10px;color:#d1d5db;">لا توجد روابط اجتماعية</div>'}
      </div>
      <div>
        <strong>تواصل معنا</strong>
        ${contacts}
        ${actions}
      </div>
    </div><div class="copyright">© ${(new Date).getFullYear()} ${store.storeName||''} - جميع الحقوق محفوظة</div></footer>`;
  }

  function attachInteractions(root, ctx){
    // الهيرو: البحث + الأزرار
    // لم نعد نستخدم بحث/أزرار داخل الهيرو
    // CTA الرئيسي
    const heroCta = root.querySelector('.hero-cta');
    if (heroCta){
      heroCta.addEventListener('click', ()=>{
        const act = heroCta.getAttribute('data-cta');
        if (act === 'scroll_products'){
          root.querySelector('#products')?.scrollIntoView({ behavior:'smooth', block:'start' });
        } else if (act === 'favorites'){
          UI_STATE.showFavs = true; applyFilters(root, ctx);
          root.querySelector('#products')?.scrollIntoView({ behavior:'smooth', block:'start' });
        } else if (act === 'external'){
          const url = heroCta.getAttribute('data-url'); if (url) window.open(url, '_blank');
        } else if (act === 'product'){
          const pid = heroCta.getAttribute('data-product-id');
          const p = ctx.products.find(x=> String(x._id) === String(pid));
          if (p){ showProduct(p, { store: ctx.store }); }
        }
      });
    }
    // تفاعل صورة البنر داخل الهيرو
    const heroBannerImg = root.querySelector('.hero-banner-img');
    if (heroBannerImg){
      const trigger = ()=>{
        const act = heroBannerImg.getAttribute('data-banner-act');
        if (!act) return;
        if (act === 'product'){
          const pid = heroBannerImg.getAttribute('data-product-id');
          const p = ctx.products.find(x=> String(x._id) === String(pid));
          if (p){ showProduct(p, { store: ctx.store }); }
        } else if (act === 'external'){
          const url = heroBannerImg.getAttribute('data-url'); if (url) window.open(url,'_blank');
        } else if (act === 'scroll_products'){
          root.querySelector('#products')?.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      };
      heroBannerImg.addEventListener('click', trigger);
      heroBannerImg.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); } });
    }

    // اعتراض نقر القلب: إزالة مرحلة الالتقاط لأنها ممكن تمنع وصول الحدث بشكل صحيح في السلايدر
    root.addEventListener('click', (e)=>{
      const favBtn = e.target.closest('[data-fav]');
      if (!favBtn) return;
      // لو الزر داخل سلايدر مميز أو بطاقة منتج
      const pid = favBtn.getAttribute('data-fav');
      if (!pid) return;
      const active = toggleFavorite(pid);
      // تحديث واجهة المفضلة لو وضع المفضلة مفعّل
      if (UI_STATE.showFavs) applyFilters(root, ctx);
      e.preventDefault();
      e.stopPropagation();
    });

    // تفاعل: عرض سريع
    root.addEventListener('click', (e)=>{
      if (e.defaultPrevented) return;
      // تجاهل لو النقرة على القلب داخل اللينك
      if (e.target.closest('[data-fav]')){ e.preventDefault(); return; }
      const viewBtn = e.target.closest('[data-view]');
      if (viewBtn){
        const pid = viewBtn.getAttribute('data-view');
        const p = ctx.products.find(x => String(x._id) === String(pid));
        if (p){
          showProduct(p, { store: ctx.store });
          const url = new URL(location.href);
          url.searchParams.set('product', p._id);
          history.pushState({ product: p._id }, '', url);
        }
        e.preventDefault();
        return;
      }
    });
    // سلايدر المميزة السينمائي: تشغيل تلقائي وحركات مختلفة
    const cinema = root.querySelector('#featured.featured-cinema .cinema-viewport');
    if (cinema){
      const slides = Array.from(cinema.querySelectorAll('.cinema-slide'));
      let idx = slides.findIndex(s=>s.classList.contains('is-active'));
      if (idx < 0) idx = 0;
      const anims = ['fade','slide','zoom'];
      let timer; let isVisible = true; let isTabActive = !document.hidden;
      const setActive = (nextIdx, animName) => {
        slides.forEach(s => { s.classList.remove('is-active','anim-fade','anim-slide','anim-zoom'); });
        const next = slides[nextIdx];
        if (!next) return;
        next.classList.add('is-active', `anim-${animName}`);
        idx = nextIdx;
      };
      const next = () => {
        const anim = anims[(idx+1) % anims.length];
        const ni = (idx + 1) % slides.length;
        setActive(ni, anim);
      };
      const prev = () => {
        const anim = anims[(idx+anims.length-1) % anims.length];
        const pi = (idx - 1 + slides.length) % slides.length;
        setActive(pi, anim);
      };
      const start = ()=> { if (!isVisible || !isTabActive) return; stop(); timer = setInterval(next, 5000); };
      const stop = ()=> { if (timer) { clearInterval(timer); timer = null; } };
      // مراقبة الظهور داخل الشاشة
      const io = new IntersectionObserver(entries=>{
        entries.forEach(ent=>{ if (ent.target === cinema){ isVisible = ent.isIntersecting; if (isVisible) start(); else stop(); } });
      }, { threshold: 0.2 });
      io.observe(cinema);
      document.addEventListener('visibilitychange', ()=>{ isTabActive = !document.hidden; if (isTabActive) start(); else stop(); });
      start();
      cinema.addEventListener('mouseenter', stop);
      cinema.addEventListener('mouseleave', start);
      cinema.querySelector('.nav.next')?.addEventListener('click', ()=>{ stop(); next(); start(); });
      cinema.querySelector('.nav.prev')?.addEventListener('click', ()=>{ stop(); prev(); start(); });
    }

    // تفاعل: إضافة للسلة
    root.addEventListener('click', (e)=>{
      const addBtn = e.target.closest('[data-add]');
      if (addBtn){
        const pid = addBtn.getAttribute('data-add');
        const p = ctx.products.find(x => String(x._id) === String(pid));
        if (p){
          const hasOptions = !!(p.optionsEnabled && Array.isArray(p.optionGroups) && p.optionGroups.some(g=>Array.isArray(g.values) && g.values.length));
          if (hasOptions){
            // افتح العرض السريع لاختيار الخيارات قبل الإضافة للسلة
            showProduct(p, { store: ctx.store, forceOptions: true });
          } else {
            addToCart(p, 1);
          }
        }
        e.preventDefault();
        return;
      }
    });

    // مشاركة المنتج
    root.addEventListener('click', (e)=>{
      const shareBtn = e.target.closest('[data-share]');
      if (shareBtn){
        const pid = shareBtn.getAttribute('data-share');
        const p = ctx.products.find(x => String(x._id) === String(pid));
        if (p) shareProduct(p);
        e.preventDefault();
        return;
      }
    });

    // إزالة المستمع الاحتياطي المكرر لمنع تداخل مزدوج

    // لم نعد نستخدم أيقونات الهيدر؛ السلة من الفاب، المفضلة من زر الهيرو

    // تفاعل أزرار الأقسام (فلترة حسب القسم)
    const catBar = root.querySelector('.categories-bar');
    if (catBar){
      catBar.addEventListener('click', (e)=>{
        const pill = e.target.closest('.pill');
        if (!pill) return;
        if (!pill.hasAttribute('data-cid')) return; // تجاهل روابط إضافية بدون data-cid
        const cid = pill.getAttribute('data-cid') || 'all';
        UI_STATE.currentCategory = cid;
        // تحديث الشكل النشط
        catBar.querySelectorAll('.pill').forEach(b=>{
          b.classList.toggle('active', b.getAttribute('data-cid') === UI_STATE.currentCategory);
        });
        applyFilters(root, ctx);
      });
    }
  }

  function applyFilters(root, ctx){
    const grid = root.querySelector('#products .featured-grid'); if (!grid) return;
    const title = root.querySelector('#products .section-title');
    const favs = readFavs();
    let list = ctx.products.slice();
    if (UI_STATE.showFavs){ list = list.filter(p=>favs.has(String(p._id))); }
    if (UI_STATE.query){
      const q = UI_STATE.query;
      list = list.filter(p=> (p.productName||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
    }
    if (UI_STATE.currentCategory && UI_STATE.currentCategory !== 'all'){
      const catIdStr = String(UI_STATE.currentCategory);
      list = list.filter(p=>{
        const c = p.category;
        if (!c) return false;
        if (typeof c === 'string' || typeof c === 'number') return String(c) === catIdStr;
        if (typeof c === 'object') return String(c._id||'') === catIdStr;
        return false;
      });
    }

    grid.innerHTML = list.map(p=>productCard(p, ctx.store.adminConfig?.enableCart)).join('') || `<div style=\"grid-column:1/-1;text-align:center;color:#6b7280;\">لا توجد منتجات مطابقة</div>`;

  // تفعيل تأثير الميل (Tilt) بعد الحقن
  initCosmicTilt(grid);

    // تحديث عنوان القسم حسب الحالة
    let newTitle = 'كل المنتجات';
    if (UI_STATE.showFavs) newTitle = 'المفضلة';
    else if (UI_STATE.currentCategory && UI_STATE.currentCategory !== 'all'){
      const cat = (ctx.categories||[]).find(c=> String(c._id) === String(UI_STATE.currentCategory));
      newTitle = cat?.name || 'كل المنتجات';
    }
    title.textContent = newTitle;

    // إخفاء قسم المميزة عند اختيار قسم أو في وضع المفضلة
    const feat = root.querySelector('#featured');
    if (feat){ feat.classList.toggle('hidden', !!UI_STATE.showFavs || (UI_STATE.currentCategory && UI_STATE.currentCategory !== 'all')); }

    // باقي الأقسام تُخفى فقط في وضع المفضلة
    ['#cats','.about-classic'].forEach(sel=>{
      const el = root.querySelector(sel); if (!el) return;
      if (UI_STATE.showFavs) el.classList.add('hidden'); else el.classList.remove('hidden');
    });
  }

  // دالة لتفعيل الميل التفاعلي للبطاقات الفضائية بدون ضغط على الأداء
  function initCosmicTilt(scope){
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isCoarse = window.matchMedia('(pointer:coarse)').matches;
      if (prefersReduced || isCoarse) return; // تعطيل على الأجهزة اللمسية أو تقليل الحركة
      const cards = scope.querySelectorAll('.product-card-cosmic[data-tilt]');
      let rafId = null;
      cards.forEach(card=>{
        card.addEventListener('mousemove', (e)=>{
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width; // 0..1
            const y = (e.clientY - rect.top) / rect.height; // 0..1
          card.dataset.tiltActive = 'true';
          const tiltX = (y - 0.5) * 10; // rotateX
          const tiltY = (x - 0.5) * 12; // rotateY
          const glowX = (x * 100).toFixed(2);
          const glowY = (y * 100).toFixed(2);
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(()=>{
            card.style.transform = `translateZ(0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
            card.style.backgroundPosition = `${glowX}% ${glowY}%`;
          });
        });
        card.addEventListener('mouseleave', ()=>{
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(()=>{
            card.style.transform = 'translateZ(0) rotateX(0deg) rotateY(0deg)';
            card.dataset.tiltActive = 'false';
          });
        });
      });
    } catch(_){ /* تجاهل أي خطأ */ }
  }

  function showProduct(p, options = {}){
    const images = [p.imageUrl, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean);
    const nowPrice = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
    const wasPrice = p.hasOffer && p.originalPrice ? p.originalPrice : null;
    const percent = wasPrice ? Math.round((1 - (Number(nowPrice||0)/Number(wasPrice||1))) * 100) : null;
    const saved = wasPrice ? Math.max(0, Number(wasPrice) - Number(nowPrice||0)) : 0;
    // بادجات مطابقة لستايل الكروت
    const sales = Number(p.salesCount||p.totalSold||0);
    const isBestseller = Boolean(p.isBestseller || p.bestSeller || p.bestseller || sales >= 10);
    let isNew = false;
    try { const dt = new Date(p.createdAt || p.created_at || p.dateAdded); if (!isNaN(dt.getTime())){ isNew = (Date.now() - dt.getTime()) <= (1000*60*60*24*14); } } catch(_){ isNew = false; }
    const badgeBest = isBestseller ? `<span class="badge-astro best" title="الأكثر مبيعاً"><i class="fa-solid fa-rocket"></i> الأكثر مبيعاً</span>` : '';
    const badgeDisc = (percent && percent>0) ? `<span class="badge-astro disc" title="خصم ${percent}%"><i class="fa-solid fa-bolt"></i> خصم ${percent}%</span>` : (p.hasOffer?`<span class="badge-astro disc" title="عرض"><i class="fa-solid fa-bolt"></i> عرض</span>`:'');
    const badgeNew = isNew ? `<span class="badge-astro new" title="جديد"><i class="fa-solid fa-star-of-life"></i> جديد</span>` : '';
    // نجوم الخلفية
    const rnd = (min, max)=> Math.random()*(max-min)+min;
    const stars = (()=>{ const count=30; const arr=[]; for(let i=0;i<count;i++){ const x=rnd(2,98).toFixed(2); const y=rnd(4,96).toFixed(2); const d=rnd(4,9).toFixed(2); const s=rnd(1.4,3.4).toFixed(2); const delay=rnd(-4,4).toFixed(2); arr.push(`<span style="--x:${x}%;--y:${y}%;--d:${d}s;--delay:${delay}s;--s:${s}px"></span>`);} return arr.join(''); })();

    const backdrop = document.createElement('div');
    backdrop.className = 'product-detail-backdrop';
    const normalizeValues = (vals)=>{
      try {
        const parts = Array.isArray(vals) ? vals : (typeof vals === 'string' ? [vals] : []);
        const out = [];
        for (const part of parts){
          if (typeof part !== 'string') continue;
          part
            .split(/[ ,،;؛\n]+/)
            .map(s=>s.trim())
            .filter(Boolean)
            .forEach(v=> out.push(v));
        }
        // unique while preserving order
        return Array.from(new Set(out));
      } catch(_) { return []; }
    };

    const hasOptions = !!(p.optionsEnabled && Array.isArray(p.optionGroups) && p.optionGroups.some(g=> normalizeValues(g.values).length));
    const optionsHtml = hasOptions ? `
      <div class="product-options" style="margin-block:10px;display:grid;gap:10px;">
        ${p.optionGroups.filter(g=> normalizeValues(g.values).length).map(g=>{
            const vals = normalizeValues(g.values);
            return `
          <div class="option-group" data-name="${g.name}" data-required="${g.required? 'true':'false'}">
            <label style="display:block;margin-block-end:4px;">${g.name}${g.required?' *':''}</label>
            <select data-opt style="inline-size:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;">
              <option value="">اختر ${g.name}...</option>
              ${vals.map(v=>`<option value=\"${v}\">${v}</option>`).join('')}
            </select>
          </div>
        `}).join('')}
      </div>
    ` : '';

    backdrop.innerHTML = `
      <div class="product-detail product-detail-astro">
        <div class="pd-stars" aria-hidden="true">${stars}</div>
        <button class="close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
        <button class="detail-fav ${isFavorite(p._id)?'active':''}" title="أضف للمفضلة" data-fav="${p._id}" aria-label="أضف للمفضلة"><i class="${isFavorite(p._id)?'fa-solid fa-heart':'fa-regular fa-heart'}"></i></button>
        <div class="media">
          <div class="main"><img src="${images[0]||'/icons/icon-512.png'}" alt="${p.productName}" decoding="async"></div>
          <div class="thumbs">
            ${images.map((src,i)=>`<button data-idx="${i}"><img src="${src}" alt="${p.productName} - صورة ${i+1}" loading="lazy" decoding="async"></button>`).join('')}
          </div>
        </div>
        <div class="info">
          <div class="badges-row">${badgeNew}${badgeBest}${badgeDisc}</div>
          <div class="title">${p.productName}</div>
          <div class="price-line">
            <div class="now">${nowPrice} <small>${p.currency||''}</small></div>
            ${wasPrice?`<div class="was">${wasPrice}</div>`:''}
          </div>
          ${p.description?`<div class="desc">${p.description}</div>`:''}
          ${p.detailedDescription?`<div class="desc" style="margin-top:6px;">${p.detailedDescription}</div>`:''}
          ${optionsHtml}
          ${wasPrice?`<div class="offer-pill" title="وفرت ${saved} ${p.currency||''}">خصم ${percent||0}% • وفرت ${saved} ${p.currency||''}</div>`:''}
          <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${STORE_REF?.adminConfig?.enableCart?`<button class="btn btn-primary" data-add="${p._id}"><i class=\"fa-solid fa-cart-plus\"></i> أضف للسلة</button>`:''}
            <button class="btn btn-outline" data-close>رجوع</button>
            <button class="btn btn-outline" data-share="${p._id}"><i class="fa-solid fa-share-nodes"></i> مشاركة</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(backdrop);

    const mainImg = backdrop.querySelector('.media .main img');
    backdrop.querySelectorAll('.thumbs button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.dataset.idx);
        const src = images[idx];
        if (src) mainImg.src = src;
      });
    });

    function closeDetail(pop = true){
      backdrop.remove();
      if (pop) {
        const url = new URL(location.href);
        url.searchParams.delete('product');
        history.pushState({}, '', url);
      }
    }

    backdrop.addEventListener('click', (e)=>{
      if (e.target === backdrop) closeDetail();
    });
    backdrop.querySelector('.close').addEventListener('click', ()=> closeDetail());
    const backBtn = backdrop.querySelector('[data-close]');
    if (backBtn) backBtn.addEventListener('click', ()=> closeDetail());

    // التعامل مع أزرار الإضافة والمشاركة داخل نافذة التفاصيل + التحقق من الخيارات
    backdrop.addEventListener('click', (e)=>{
      const shareBtn = e.target.closest('[data-share]');
      if (shareBtn){
        shareProduct(p);
        e.preventDefault();
        return;
      }
      const favBtn = e.target.closest('.detail-fav[data-fav]');
      if (favBtn){
        const pid = favBtn.getAttribute('data-fav');
        const nowActive = toggleFavorite(pid);
        // تحديث شكل الزر فورًا
        const icon = favBtn.querySelector('i');
        if (icon){ icon.className = nowActive ? 'fa-solid fa-heart' : 'fa-regular fa-heart'; }
        favBtn.classList.toggle('active', nowActive);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const addBtn = e.target.closest('[data-add]');
      if (addBtn){
        if (hasOptions){
          const groups = Array.from(backdrop.querySelectorAll('.option-group'));
          const selected = [];
          for (const g of groups){
            const required = g.getAttribute('data-required') === 'true';
            const select = g.querySelector('select[data-opt]');
            const val = (select?.value||'').trim();
            if (required && !val){
              alert(`يرجى اختيار ${g.getAttribute('data-name')}`);
              select?.focus();
              return;
            }
            if (val){ selected.push({ name: g.getAttribute('data-name')||'', value: val }); }
          }
          // ثبّت ترتيب الخيارات لضمان اتحاد المفتاح لنفس الاختيارات
          selected.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
          addToCart(p, 1, selected);
        } else {
          addToCart(p, 1);
        }
        closeDetail(false);
        e.preventDefault();
        return;
      }
    });

    // دعم الرجوع بزر المتصفح
    const onPop = () => { try { backdrop.remove(); } catch(_){} window.removeEventListener('popstate', onPop); };
    window.addEventListener('popstate', onPop);
  }

  function render(ctx){
    const { container, store, categories, products } = ctx;
    STORE_REF = store; // خزن المرجع للسلة والمشاركة
    // خريطة المنتجات لاستخدامها في السلة
    try { window.__ALL_PRODUCTS__ = Array.isArray(products) ? products.slice() : []; } catch(_){}
    const visibleProducts = (Array.isArray(products)? products : []).filter(p => Number(p.stock) > 0);
    const ctxView = { ...ctx, products: visibleProducts };
    // شريط أعلى ثابت فيه البحث + المفضلة + السلة (السلة فاب موجودة مسبقاً بس نضيف أيقونة نصية هنا إن رغبت) مع إبقاء الفاب
    const topBar = `
      <div class="top-utility-bar" role="banner">
        <div class="inner">
          <div class="search-wrap" role="search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input type="search" placeholder="ابحث عن منتج..." aria-label="بحث عن منتج" class="top-search">
          </div>
          <button class="util-btn favs-toggle" aria-label="إظهار المفضلة"><i class="fa-regular fa-heart"></i></button>
          <button class="util-btn go-cart" aria-label="عرض السلة"><i class="fa-solid fa-cart-shopping"></i><span class="badge" style="display:none">0</span></button>
          <button class="util-btn go-support" aria-label="الدعم"><i class="fa-solid fa-headset"></i></button>
        </div>
      </div>`;
    // حقن طبقة الخلفية الثابتة مرة واحدة لو مش موجودة
    if (!document.querySelector('.global-hero-bg')){
      const bg = document.createElement('div');
      bg.className = 'global-hero-bg';
      document.body.prepend(bg); // في أعلى البودي عشان أقل z-index من المحتوى
    }

    container.innerHTML = [
      topBar,
      renderHero(store),
      renderFeatured(visibleProducts),
      renderCategoriesBar(Array.isArray(categories)?categories:[], store.adminConfig)
    ].join('');

    // قسم المنتجات الكامل (anchor)
    const productsSection = document.createElement('section');
    productsSection.id = 'products';
    productsSection.className = 'section';
  productsSection.innerHTML = `<h2 class="section-title" style="text-align:center;">كل المنتجات</h2><div class="featured-grid">${visibleProducts.map(p=>productCard(p, store.adminConfig?.enableCart)).join('')}</div>`;
    container.appendChild(productsSection);

    // About + Footer في النهاية
    container.insertAdjacentHTML('beforeend', renderAbout(store));
    container.insertAdjacentHTML('beforeend', renderFooter(store));

  attachInteractions(container, ctxView);
    // ربط أحداث البحث والأزرار في الشريط العلوي
    const topSearch = container.querySelector('.top-search');
    if (topSearch){
      let timer;
      const doFilter = ()=>{
        UI_STATE.query = (topSearch.value||'').trim().toLowerCase();
        applyFilters(container, ctxView);
        container.querySelector('#products')?.scrollIntoView({ behavior:'smooth', block:'start' });
      };
      topSearch.addEventListener('input', ()=>{
        if (timer) clearTimeout(timer);
        timer = setTimeout(doFilter, 170);
      });
    }
    const favToggleTop = container.querySelector('.favs-toggle');
    if (favToggleTop){
      favToggleTop.addEventListener('click', ()=>{
        UI_STATE.showFavs = !UI_STATE.showFavs;
        favToggleTop.classList.toggle('active', UI_STATE.showFavs);
        applyFilters(container, ctxView);
        container.querySelector('#products')?.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    }
    const goCartBtn = container.querySelector('.go-cart');
    if (goCartBtn){
      goCartBtn.addEventListener('click', ()=>{
        const existing = document.querySelector('.cart-drawer-backdrop');
        if (existing){ existing.remove(); }
        else { openCartDrawer(); }
      });
    }
    // تحديث عدد السلة بعد الريندر
    updateCartBadge();
    updateFavBadge();
  mountCartFab(); // الآن تنظف فقط لو موجود
  mountSupportWidget(store, container);
    // تطبيق أي فلاتر حالية (مبدئيًا عرض الكل)
    applyFilters(container, ctxView);
  }

  // زر الدعم العائم بنفس منطق صفحة الدردشة
  function mountSupportWidget(store, root){
    try {
      const cfg = store?.adminConfig?.supportWidget;
      if (!cfg?.enabled || !cfg.chatLink) return;
      // إعادة بناء لوحة الدعم بأسلوب القالب القديم لكن تحت زر الدعم في أعلى يمين الصفحة
      if (document.getElementById('chatIframeContainer')) return;
      const panel = document.createElement('div');
      panel.id = 'chatIframeContainer';
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-label','دردشة الدعم');
      panel.style.cssText = 'position:fixed; z-index:1000; display:none;';
      // محتوى داخلي بنفس أبعاد النسخة القديمة (350x530) مع إزاحة iframe لأعلى -20px لمنع السكرول الداخلي
      panel.innerHTML = `
        <div class="support-chat-shell" style="position: relative; width: 350px; height: 530px; background: #fff; overflow: hidden; border:1px solid #e5e7eb; border-radius: 14px; box-shadow:0 18px 50px -12px rgba(0,0,0,.25);">
          <button id="closeChatIframe" aria-label="إغلاق" style="position: absolute; top: 10px; left: 10px; background: #dc3545; color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 2; display:grid;place-items:center;font-weight:700;">✕</button>
          <iframe src="${cfg.chatLink}" style="position: absolute; top: -20px; width: 100%; height: 550px; border: none; border-radius: 0;" scrolling="no" loading="lazy" referrerpolicy="no-referrer"></iframe>
        </div>`;
      document.body.appendChild(panel);

      const btn = root.querySelector('.go-support');
      const closer = panel.querySelector('#closeChatIframe');

      function positionPanel(){
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        // الموضع: تحت الزر ومحاذاة يساره (حتى لا يخرج خارج الشاشة يمينًا)
        const top = rect.bottom + window.scrollY + 8; // مسافة بسيطة
        const panelWidth = 350; // لازم يطابق عرض الشيل
        let left = rect.left + window.scrollX - panelWidth; // يسار الزر
        // تأمين بقاء اللوحة بالكامل داخل الفيو بورت
        const minLeft = 8;
        const maxLeft = (window.innerWidth - panelWidth - 8);
        if (left < minLeft) left = minLeft;
        if (left > maxLeft) left = maxLeft;
        panel.style.top = top + 'px';
        panel.style.left = left + 'px';
      }

      if (btn){
        btn.addEventListener('click', ()=>{
          const visible = panel.style.display === 'block';
          if (!visible){ positionPanel(); panel.style.display = 'block'; }
          else { panel.style.display = 'none'; }
        });
  window.addEventListener('resize', ()=>{ if (panel.style.display === 'block') positionPanel(); });
  // أزلنا إعادة التموضع أثناء الاسكرول ليظل ثابتا مثل الشريط العلوي
      }
      if (closer){ closer.addEventListener('click', ()=>{ panel.style.display='none'; }); }
    } catch (_) { /* no-op */ }
  }

  window.StoreLandingTemplates[id] = { render, showProduct };
})();
