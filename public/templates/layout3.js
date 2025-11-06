(function(){
  window.StoreLandingTemplates = window.StoreLandingTemplates || {};
  const id = 'layout3';
  // مرجع المتجر عشان السلة واللينكات
  let STORE_REF = null;
  // حالة الواجهة (بحث/مفضلة)
  const UI_STATE = { showFavs: false, query: '' };
  // مجموعة لتحديد الأكثر مبيعاً
  let BESTSELLER_IDS = new Set();

  // توليد تنويع ثابت للكروت (حجم/نسبة) بناءً على الID عشان الشكل ما يترعش
  function hashStr(s){ try { s = String(s||''); } catch(_) { s=''; } let h=0; for (let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return Math.abs(h); }
  function pickMasonryVariant(pid){
    const h = hashStr(pid);
    const r = h % 100; // 0..99
    let sizeCls = '';
    // نسبة صغيرة للكبير، وأكبر شوية للعرضي، والباقي عادي
    if (r < 10) sizeCls = 'mason-big';
    else if (r < 35) sizeCls = 'mason-wide';
    else sizeCls = '';
    const a = (h % 3);
    const aspectCls = a===0? 'ar-square' : a===1? 'ar-portrait' : 'ar-landscape';
    return `${sizeCls} ${aspectCls}`.trim();
  }

  // نظام سلة بسيط باستخدام localStorage
  function cartKey(){ return STORE_REF? `zain_cart_${STORE_REF._id}` : 'zain_cart'; }
  function readCart(){
    try { return JSON.parse(localStorage.getItem(cartKey())||'{}'); } catch{ return {}; }
  }
  function writeCart(c){ localStorage.setItem(cartKey(), JSON.stringify(c)); }
  function cartCount(){ const c = readCart(); return Object.values(c).reduce((s,n)=> s + (Number(n)||0), 0); }
  function updateCartBadge(){
    const el = document.querySelector('.header-classic .icon.cart .badge');
    if (!el) return;
    const n = cartCount();
    el.textContent = n>99?'99+':String(n||0);
    el.style.display = n? 'inline-block' : 'none';
    // تحديث بادج الفاب
    const fab = document.querySelector('.fab-cart .badge');
    if (fab){ fab.textContent = n>99?'99+':String(n||0); fab.style.display = n? 'inline-block' : 'none'; }
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
    // حدث بسيط لتحديث قلوب البطاقات
    document.querySelectorAll(`.product-card [data-fav="${key}"]`).forEach(btn=>{
      const i = btn.querySelector('i');
      if (s.has(key)){ btn.classList.add('active'); i.className = 'fa-solid fa-heart'; }
      else { btn.classList.remove('active'); i.className = 'fa-regular fa-heart'; }
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
    if (document.querySelector('.fab-cart')) return;
    const fab = document.createElement('button');
    fab.className = 'fab fab-cart';
    fab.innerHTML = `<i class="fa-solid fa-cart-shopping"></i><span class="badge" style="display:none">0</span>`;
    fab.addEventListener('click', openCartDrawer);
    document.body.appendChild(fab);
    updateCartBadge();
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
          <img src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}">
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
    const price = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
    const priceHtml = `<div class="price">${price} <span style="font-size:12px;color:#6b7280">${p.currency||''}</span></div>`;
    // حساب البادجات على الصورة: خصم / جديد / الأكثر مبيعاً
    const wasPrice = p.hasOffer && p.originalPrice ? Number(p.originalPrice) : null;
    const nowPrice = Number(price||0);
    const discountPercent = wasPrice ? Math.max(0, Math.round((1 - (nowPrice/Math.max(1,wasPrice))) * 100)) : null;
    const createdAt = p.createdAt ? new Date(p.createdAt) : null;
    const daysSince = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000*60*60*24)) : Infinity;
    const isNewProd = daysSince <= 21; // جديد خلال 21 يوم
    const isBest = BESTSELLER_IDS.has(String(p._id));
    const fav = isFavorite(p._id);
    const ribbons = `
      <div class="ribbons">
        ${discountPercent!==null?`<span class="ribbon discount"><i class=\"fa-solid fa-tags\"></i><b>خصم ${discountPercent}%</b></span>`:''}
        ${isNewProd?`<span class="ribbon new"><i class=\"fa-solid fa-star\"></i><b>جديد</b></span>`:''}
        ${isBest?`<span class="ribbon bestseller"><i class=\"fa-solid fa-fire\"></i><b>الأكثر مبيعاً</b></span>`:''}
      </div>`;
    const masonCls = pickMasonryVariant(p._id);
    return `
      <div class="product-card ${masonCls}" aria-label="${p.productName}" data-pid="${p._id}">
        <a class="image" href="?product=${p._id}" data-view="${p._id}" aria-label="عرض سريع">
          <img src="${p.imageUrl||'/icons/icon-512.png'}" alt="${p.productName}">
          ${ribbons}
          <button class="fav-toggle ${fav?'active':''}" title="أضف للمفضلة" aria-label="أضف للمفضلة" data-fav="${p._id}"><i class="${fav?'fa-solid fa-heart':'fa-regular fa-heart'}"></i></button>
        </a>
        <div class="content">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="font-weight:700;">${p.productName}</div>
          </div>
          ${priceHtml}
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

  function renderHeader(store){
    return `
    <header class="header-classic">
      <div class="wrap">
        <div class="brand">
          ${store.storeLogoUrl?`<img src="${store.storeLogoUrl}" alt="${store.storeName}">`:''}
          <span>${store.storeName||''}</span>
        </div>
        <nav class="nav" aria-label="قائمة التنقل">
          <a href="#featured">الرئيسية</a>
          <a href="#products">المنتجات</a>
          <a href="#about">اتصل بنا</a>
        </nav>
        <div class="icons">
          <div class="header-search" aria-label="بحث">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="search" placeholder="ابحث عن منتج..." aria-label="بحث" />
          </div>
          <div class="icon favs" title="المفضلة"><i class="fa-regular fa-heart"></i><span class="badge" style="display:none">0</span></div>
          <div class="icon cart" title="السلة"><i class="fa-solid fa-cart-shopping"></i><span class="badge" style="display:none">0</span></div>
        </div>
      </div>
    </header>`;
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
  const headline = (b.text||'').trim();
    const img = b.imageUrl ? `<img class="banner-img" src="${b.imageUrl}" alt="بنر">` : '';
    const ctasOverImage = img && ctas ? `<div class=\"banner-ctas banner-ctas--over\">${ctas}</div>` : '';
    const ctasInContent = !img && ctas ? `<div class=\"banner-ctas\">${ctas}</div>` : '';
    return `
      <section class="banner-hero">
        <div class="hero-inner">
          <div class="hero-content">
            ${headline ? `<h1 class=\"hero-title\">${headline}</h1>` : ''}
            ${ctasInContent}
          </div>
          ${img?`<div class="hero-media">${img}${ctasOverImage}</div>`:''}
        </div>
      </section>`;
  }

  function renderCategoriesBar(categories, admin){
    const allPill = `<button class="pill active" data-cid="all"><i class="fa-regular fa-square"></i> الكل</button>`;
    const pills = categories.map(c=>`<button class="pill" data-cid="${c._id}"><i class="fa-regular fa-folder"></i> ${c.name}</button>`).join('');
    const extra = admin?.extraSection?.enabled && admin.extraSection.url && admin.extraSection.label
      ? `<a class="pill" href="${admin.extraSection.url}" target="_blank" rel="noopener">${admin.extraSection.label}</a>` : '';
    return `<div class="categories-bar"><div class="wrap">${allPill}${pills}${extra}</div></div>`;
  }

  function renderFeatured(products, enableCart){
    const slides = products.slice(0,3);
    if (!slides.length) return '';
    const makeCTA = (p)=> `
      <div class="slide-ctas">
        ${enableCart?`<button class="cta" data-add="${p._id}"><i class=\"fa-solid fa-cart-plus\"></i> أضف للسلة</button>`:''}
        <a class="cta alt" href="?product=${p._id}" data-view="${p._id}"><i class="fa-regular fa-eye"></i> عرض</a>
      </div>`;
    const slideHTML = slides.map((p,i)=>{
      const price = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
      const cur = p.currency||'';
      return `
        <div class="slide ${i===0?'active':''}" data-idx="${i}" style="--bg:url('${(p.imageUrl||'/icons/icon-512.png').replace(/'/g,"%27")}')">
          <div class="slide-bg" aria-hidden="true"></div>
          <div class="slide-overlay overlay-${i%3}" aria-hidden="true"></div>
          <div class="slide-content">
            <h3 class="slide-title">${p.productName||''}</h3>
            ${p.description?`<p class="slide-desc">${p.description}</p>`:''}
            <div class="slide-price">${price} <small>${cur}</small></div>
            ${makeCTA(p)}
          </div>
        </div>`;
    }).join('');
    const dots = slides.map((_,i)=>`<button class="dot ${i===0?'active':''}" data-idx="${i}" aria-label="انتقال إلى الشريحة ${i+1}"></button>`).join('');
    return `
      <section id="featured" class="section featured-slider">
        <div class="featured-head">
          <h2 class="section-title" style="margin:0;">منتجاتنا المميزة</h2>
        </div>
        <div class="slider" data-autoplay="5000">
          ${slideHTML}
          <button class="nav prev" aria-label="السابق"><i class="fa-solid fa-chevron-right"></i></button>
          <button class="nav next" aria-label="التالي"><i class="fa-solid fa-chevron-left"></i></button>
          <div class="dots" role="tablist">${dots}</div>
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
    // تأثير تصغير الهيدر عند السكرول
    const header = root.querySelector('.header-classic');
    const heroMedia = root.querySelector('.banner-hero .hero-media');
    const onScroll = () => {
      if (header){ if (window.scrollY>10) header.classList.add('scrolled'); else header.classList.remove('scrolled'); }
      // حرّك الحاوية كلها عشان الـCTAs تتحرك مع الصورة
      if (heroMedia){ const y = window.scrollY||0; const t = Math.min(60, y*0.20); heroMedia.style.transform = `translateY(${t}px) scale(1.06)`; }
    };
    window.addEventListener('scroll', onScroll, { passive:true }); onScroll();

    // اعتراض نقر القلب مبكرًا (مرحلة الالتقاط) لمنع فتح العرض السريع
    root.addEventListener('click', (e)=>{
      const favBtn = e.target.closest('[data-fav]');
      if (favBtn){
        const pid = favBtn.getAttribute('data-fav');
        toggleFavorite(pid);
        if (UI_STATE.showFavs) applyFilters(root, ctx);
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

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

    // تفعيل/إلغاء المفضلة على بطاقة المنتج (احتياطي لو ما اشتغلت مرحلة الالتقاط)
    root.addEventListener('click', (e)=>{
      const favBtn = e.target.closest('[data-fav]');
      if (favBtn){
        const pid = favBtn.getAttribute('data-fav');
        toggleFavorite(pid);
        if (UI_STATE.showFavs) applyFilters(root, ctx);
        e.preventDefault();
        return;
      }
    });

    // فتح السلة من أيقونة الهيدر
    const headerCart = root.querySelector('.icons .cart');
    if (headerCart){ headerCart.addEventListener('click', openCartDrawer); }

    // تفعيل وضع المفضلة
    const favsIcon = root.querySelector('.icons .favs');
    if (favsIcon){
      favsIcon.addEventListener('click', ()=>{
        UI_STATE.showFavs = !UI_STATE.showFavs;
        favsIcon.classList.toggle('active', UI_STATE.showFavs);
        applyFilters(root, ctx);
      });
    }

    // البحث — الحقل ظاهر داخل الهيدر
    const searchInput = root.querySelector('.header-search input');
    if (searchInput){
      searchInput.addEventListener('input', ()=>{
        UI_STATE.query = (searchInput.value||'').trim().toLowerCase();
        applyFilters(root, ctx);
      });
    }

    // سلايدر المنتجات المميزة
    const slider = root.querySelector('.featured-slider .slider');
    if (slider){
      const slides = Array.from(slider.querySelectorAll('.slide'));
      const dots = Array.from(slider.querySelectorAll('.dot'));
      const prevBtn = slider.querySelector('.nav.prev');
      const nextBtn = slider.querySelector('.nav.next');
      let current = Math.max(0, slides.findIndex(s=>s.classList.contains('active')));
      if (current<0) current = 0;
      let timer = null;
      const AUTOPLAY = Number(slider.getAttribute('data-autoplay')||5000);
      function setActive(idx){
        slides.forEach((s,i)=>{ s.classList.toggle('active', i===idx); });
        dots.forEach((d,i)=>{ d.classList.toggle('active', i===idx); d.setAttribute('aria-selected', i===idx?'true':'false'); });
        current = idx;
      }
      function next(){ setActive((current+1)%slides.length); }
      function prev(){ setActive((current-1+slides.length)%slides.length); }
      function start(){ if (timer) clearInterval(timer); timer = setInterval(next, AUTOPLAY); }
      function stop(){ if (timer) { clearInterval(timer); timer = null; } }
      prevBtn?.addEventListener('click', ()=>{ stop(); prev(); start(); });
      nextBtn?.addEventListener('click', ()=>{ stop(); next(); start(); });
      dots.forEach(d=> d.addEventListener('click', ()=>{ const i = Number(d.getAttribute('data-idx'))||0; stop(); setActive(i); start(); }));
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      // سحب باللمس للموبايل
      let touchStartX = 0, touchStartY = 0, touching = false;
      slider.addEventListener('touchstart', (e)=>{
        const t = e.touches[0];
        touchStartX = t.clientX; touchStartY = t.clientY; touching = true; stop();
      }, { passive: true });
      slider.addEventListener('touchmove', (e)=>{
        // لو الحركة رأسية أكتر من أفقية نسيبها للسكرول
      }, { passive: true });
      slider.addEventListener('touchend', (e)=>{
        if (!touching) return; touching = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30){
          if (dx < 0) next(); else prev();
        }
        start();
      });
      // Parallax بالماوس
      slider.addEventListener('mousemove', (e)=>{
        const rect = slider.getBoundingClientRect();
        const x = ((e.clientX - rect.left)/rect.width) - 0.5; // -0.5..0.5
        const y = ((e.clientY - rect.top)/rect.height) - 0.5;
        const active = slides[current];
        const bg = active?.querySelector('.slide-bg');
        const content = active?.querySelector('.slide-content');
        const tx = x * 18, ty = y * 10;
        if (bg) bg.style.transform = `translate(${tx}px, ${ty}px) scale(1.05)`;
        if (content) content.style.transform = `translate(${(-tx*0.25)}px, ${(-ty*0.25)}px)`;
      });
      slider.addEventListener('mouseleave', ()=>{
        const active = slides[current];
        const bg = active?.querySelector('.slide-bg');
        const content = active?.querySelector('.slide-content');
        if (bg) bg.style.transform = `scale(1.0)`;
        if (content) content.style.transform = `translateY(0)`;
      });
      start();
    }

    // أزلنا فلترة الأقسام حسب الطلب
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
    grid.innerHTML = list.map(p=>productCard(p, ctx.store.adminConfig?.enableCart)).join('') || `<div style="grid-column:1/-1;text-align:center;color:#6b7280;">لا توجد منتجات مطابقة</div>`;
    // عنوان القسم حسب الحالة
    if (UI_STATE.query) title.textContent = 'نتائج البحث';
    else if (UI_STATE.showFavs) title.textContent = 'المفضلة';
    else title.textContent = 'كل المنتجات';

    // في حالة البحث أو المفضلة: إخفاء الأقسام غير المنتجات
    const searchMode = UI_STATE.query || UI_STATE.showFavs;
  ['.banner-hero','.banner-classic','#featured','#cats','.about-classic'].forEach(sel=>{
      const el = root.querySelector(sel); if (!el) return;
      if (searchMode) el.classList.add('hidden'); else el.classList.remove('hidden');
    });
  }

  function showProduct(p, options = {}){
    const images = [p.imageUrl, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean);
    const nowPrice = p.hasOffer && p.discountedPrice ? p.discountedPrice : p.price;
    const wasPrice = p.hasOffer && p.originalPrice ? p.originalPrice : null;
    const percent = wasPrice ? Math.round((1 - (Number(nowPrice||0)/Number(wasPrice||1))) * 100) : null;
    const saved = wasPrice ? Math.max(0, Number(wasPrice) - Number(nowPrice||0)) : 0;

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
      <div class="product-detail">
        <button class="close" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
        <div class="media">
          <div class="main"><img src="${images[0]||'/icons/icon-512.png'}" alt="${p.productName}"></div>
          <div class="thumbs">
            ${images.map((src,i)=>`<button data-idx="${i}"><img src="${src}" alt="${p.productName} - صورة ${i+1}"></button>`).join('')}
          </div>
        </div>
        <div class="info">
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
    // احسب الأكثر مبيعاً (Top نسبة 15% أو 6 عناصر كحد أقصى) وخزنهم في مجموعة للاستخدام في البطاقات
    try {
      const sorted = visibleProducts.slice().sort((a,b)=> Number(b.salesCount||0) - Number(a.salesCount||0));
      const topCount = Math.max(3, Math.min(6, Math.ceil(sorted.length * 0.15)));
      BESTSELLER_IDS = new Set(sorted.slice(0, topCount).map(p=> String(p._id)));
    } catch(_) { BESTSELLER_IDS = new Set(); }
    const ctxView = { ...ctx, products: visibleProducts };
    container.innerHTML = [
      renderHeader(store),
      renderBanner(store.adminConfig, visibleProducts),
      renderFeatured(visibleProducts, store.adminConfig?.enableCart)
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
    // تحديث عدد السلة بعد الريندر
    updateCartBadge();
    updateFavBadge();
    mountCartFab();
    mountSupportWidget(store);
    // تطبيق أي فلاتر حالية (مبدئيًا عرض الكل)
    applyFilters(container, ctxView);
  }

  // زر الدعم العائم بنفس منطق صفحة الدردشة
  function mountSupportWidget(store){
    try {
      const cfg = store?.adminConfig?.supportWidget;
      if (!cfg?.enabled || !cfg.chatLink) return;
      if (document.getElementById('supportButtonContainer')) return;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
  <div id="supportButtonContainer" style="position: fixed; bottom: 20px; left: 20px; z-index: 1000;">
        <img id="supportButton" src="https://i.ibb.co/7JJScM0Q/zain-ai.png" alt="دعم العملاء" style="width: 60px; height: 60px; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;">
      </div>
  <div id="chatIframeContainer" style="display: none; position: fixed; bottom: 20px; left: 20px; z-index: 1000;">
        <div style="position: relative; width: 350px; height: 530px; background: white; overflow: hidden;">
          <button id="closeChatIframe" style="position: absolute; top: 10px; left: 10px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 1;">✕</button>
          <iframe src="${cfg.chatLink}" style="position: absolute; top: -20px; width: 100%; height: 550px; border: none; border-radius: 8px;" scrolling="no"></iframe>
        </div>
      </div>`;
      document.body.appendChild(wrapper);
      const supportButton = document.getElementById('supportButton');
      const chatIframeContainer = document.getElementById('chatIframeContainer');
      const closeChatIframe = document.getElementById('closeChatIframe');
      supportButton.addEventListener('click', () => {
        chatIframeContainer.style.display = chatIframeContainer.style.display === 'none' ? 'block' : 'none';
        supportButton.style.display = chatIframeContainer.style.display === 'block' ? 'none' : 'block';
      });
      closeChatIframe.addEventListener('click', () => {
        chatIframeContainer.style.display = 'none';
        supportButton.style.display = 'block';
      });
    } catch (_) { /* no-op */ }
  }

  window.StoreLandingTemplates[id] = { render, showProduct };
})();
