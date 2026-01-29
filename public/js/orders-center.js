// /public/js/orders-center.js
(function(){
  async function loadScriptOnce(src){
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith(src));
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`فشل تحميل ${src}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error(`فشل تحميل ${src}`));
      document.body.appendChild(script);
    });
  }

  const STATUS_LABELS = {
    pending: 'قيد المعالجة',
    processing: 'تحت المراجعة',
    confirmed: 'مؤكد',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي'
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
  const formatNumber = (v) => new Intl.NumberFormat('ar-EG').format(Number(v)||0);
  const formatCurrency = (amount, currency='EGP') => {
    const num = Number(amount)||0;
    try { return new Intl.NumberFormat('ar-EG',{style:'currency',currency}).format(num); } catch(_) { return `${num.toFixed(2)} ${currency}`; }
  };
  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.toLocaleString('ar-EG');
  };
  const debounce = (fn, delay=300) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; };
  const downloadCsv = (filename, rows) => {
    const csvContent = rows.map(r => r.map(x => `"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };
  const showToast = (message, type='success') => {
    const toast = document.createElement('div');
    toast.className = `store-toast store-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 4000);
  };

  let pageState = { orders: [], chatOrders: [], chatOrdersCounts: { total:0, pending:0, byStatus:{} }, chatCustomers: [], store: null, token: null, analytics: { currency: 'EGP' } };
  const ORDERS_CACHE_PAGE = 'orders-center';

  function applyOrdersCache(snapshot) {
    if (!snapshot) return;
    try {
      pageState = Object.assign({}, pageState, {
        token: localStorage.getItem('token'),
        store: snapshot.store || null,
        orders: Array.isArray(snapshot.orders) ? snapshot.orders : [],
        chatOrders: Array.isArray(snapshot.chatOrders) ? snapshot.chatOrders : [],
        chatCustomers: Array.isArray(snapshot.chatCustomers) ? snapshot.chatCustomers : [],
        chatOrdersCounts: snapshot.chatOrdersCounts || { total:0, pending:0, byStatus:{} },
        analytics: snapshot.analytics || { currency: 'EGP' },
      });
      renderLayout();
      loadModulesAndRender();
      const pending = pageState.chatOrdersCounts?.pending || 0;
      updateOrdersNavDot({ pendingCount: pending, hasNew: pending > 0 });
      console.log('Applied cached orders-center snapshot');
    } catch (err) {
      console.warn('Failed to apply cached orders-center snapshot:', err);
    }
  }

  // حدّث زر "متابعة الطلبات" في النافبار لإبراز الطلبات الجديدة غير المعروضة
  function updateOrdersNavDot({ pendingCount = 0, hasNew = false }){
    const link = document.querySelector('.nav-item[data-page="orders-center"]');
    if (!link) return;

    // أضف الأنماط مرة واحدة
    const styleId = 'orders-nav-dot-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .nav-item.orders-highlight { position: relative; background: rgba(239,68,68,0.14) !important; color: #ef4444 !important; border-radius: 10px; }
        .nav-item.orders-highlight i { color: #ef4444 !important; }
        .nav-item .orders-nav-dot {
          position: absolute;
          inset-inline-start: 10px;
          top: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.08);
        }
      `;
      document.head.appendChild(style);
    }

    let dot = link.querySelector('.orders-nav-dot');
    if (hasNew) {
      link.classList.add('orders-highlight');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'orders-nav-dot';
        dot.setAttribute('aria-label', 'طلبات محادثة معلقة');
        link.appendChild(dot);
      }
      dot.title = `${pendingCount} طلب جديد`;
      dot.style.display = 'inline-block';
      const label = link.querySelector('span');
      if (label) label.textContent = 'يوجد طلبات جديدة ♥';
    } else if (dot) {
      dot.remove();
      link.classList.remove('orders-highlight');
      const label = link.querySelector('span');
      if (label) label.textContent = 'متابعة الطلبات';
    } else {
      link.classList.remove('orders-highlight');
      const label = link.querySelector('span');
      if (label) label.textContent = 'متابعة الطلبات';
    }
  }

  async function loadOrdersCenterPage(){
    const content = document.getElementById('content');
    const token = localStorage.getItem('token');
    const selectedBotId = localStorage.getItem('selectedBotId');

    if (!token || !selectedBotId) {
      content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض الطلبات.</p></div>`;
      return;
    }

    pageState.token = token;

    content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;

    const cached = window.readPageCache ? window.readPageCache(ORDERS_CACHE_PAGE, selectedBotId, 3 * 60 * 1000) : null;
    if (cached) {
      applyOrdersCache(cached);
    }

    try {
      // جلب بيانات البوت للحصول على storeId
      const bots = await handleApiRequest('/api/bots', { headers: { Authorization: `Bearer ${token}` } }, null, 'فشل في جلب البوتات');
      const bot = Array.isArray(bots) ? bots.find(b => String(b._id) === String(selectedBotId)) : null;
      const storeId = bot && bot.storeId ? (bot.storeId._id || bot.storeId) : null;

      // جلب طلبات المحادثة
      const chatResp = await handleApiRequest(`/api/chat-orders?botId=${selectedBotId}`, { headers: { Authorization: `Bearer ${token}` } }, null, 'فشل في جلب طلبات المحادثة');
      const chatOrders = Array.isArray(chatResp?.orders) ? chatResp.orders : [];
      const chatCounts = chatResp?.counts || { total: 0, pending: 0, byStatus: {} };

      const customersResp = await handleApiRequest(`/api/chat-customers?botId=${selectedBotId}`, { headers: { Authorization: `Bearer ${token}` } }, null, 'فشل في جلب بيانات العملاء');
      const chatCustomers = Array.isArray(customersResp?.customers) ? customersResp.customers : [];

      let storeOrders = [];
      let storeName = '';
      let storeCurrency = 'EGP';
      if (storeId) {
        try {
          const orders = await handleApiRequest(`/api/orders/${storeId}/orders`, { headers: { Authorization: `Bearer ${token}` } }, null, 'فشل في جلب طلبات المتجر');
          storeOrders = Array.isArray(orders) ? orders : [];
          if (storeOrders[0]?.currency) storeCurrency = storeOrders[0].currency;
          storeName = bot?.name || '';
        } catch (err) {
          console.warn('تعذر جلب طلبات المتجر:', err.message);
        }
      }

      pageState = {
        token,
        store: storeId ? { _id: storeId, name: storeName } : null,
        orders: storeOrders,
        chatOrders,
        chatCustomers,
        chatOrdersCounts: chatCounts,
        analytics: { currency: storeCurrency }
      };

      renderLayout();

      const lastSeenTs = Number(localStorage.getItem('chatOrdersLastSeen') || 0);
      const latestCreated = Math.max(
        0,
        ...chatOrders.map((o) => new Date(o.createdAt || o.updatedAt || o.lastModifiedAt || 0).getTime())
      );
      const newCount = chatOrders.filter((o) => new Date(o.createdAt || 0).getTime() > lastSeenTs).length;
      const hasNew = newCount > 0;
      updateOrdersNavDot({ pendingCount: newCount || chatCounts.pending || 0, hasNew });

      await loadModulesAndRender();

      // اعتبر أن المستخدم شاهد الطلبات الآن
      localStorage.setItem('chatOrdersLastSeen', String(Date.now()));

      window.writePageCache && window.writePageCache(ORDERS_CACHE_PAGE, selectedBotId, {
        store: pageState.store,
        orders: storeOrders,
        chatOrders,
        chatCustomers,
        chatOrdersCounts: chatCounts,
        analytics: { currency: storeCurrency },
      });
    } catch (err) {
      console.error('Error loading orders-center:', err.message);
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${escapeHtml(err.message || 'تعذر تحميل الطلبات')}</p></div>`;
      updateOrdersNavDot({ pendingCount: 0, hasNew: false });
    }
  }

  function renderLayout(){
    const content = document.getElementById('content');
    const pendingDot = pageState.chatOrdersCounts?.pending > 0 ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-inline-start:6px;"></span>` : '';
    const storeNote = pageState.store ? '' : '<div class="placeholder"><p>لا يوجد متجر مرتبط بهذا البوت حالياً.</p></div>';

    content.innerHTML = `
      <div class="cards-container" style="gap:16px;">
        <div class="card" style="width:100%;">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <h3 style="margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-comments"></i> طلبات المحادثة ${pendingDot}</h3>
            <button id="refreshOrdersCenter" class="btn btn-secondary btn-sm"><i class="fas fa-sync"></i> تحديث</button>
          </div>
          <div id="chat-orders-panel"></div>
        </div>
        <div class="card" style="width:100%;">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <h3 style="margin:0;"><i class="fas fa-clipboard-list"></i> طلبات المتجر</h3>
            <div style="color:#6b7280;font-size:13px;">${pageState.store ? '' : 'لا يوجد متجر مرتبط بهذا البوت'}</div>
          </div>
          ${pageState.store ? '<div id="store-orders-panel"></div>' : storeNote}
        </div>
        <div class="card" style="width:100%;">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <h3 style="margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-user"></i> بيانات العملاء</h3>
            <button id="refreshChatCustomers" class="btn btn-secondary btn-sm"><i class="fas fa-sync"></i> تحديث</button>
          </div>
          <div id="chat-customers-panel"></div>
        </div>
      </div>
    `;

    document.getElementById('refreshOrdersCenter')?.addEventListener('click', () => loadOrdersCenterPage());
    document.getElementById('refreshChatCustomers')?.addEventListener('click', () => loadOrdersCenterPage());
  }

  async function loadModulesAndRender(){
    const helpers = {
      handleApiRequest,
      showToast,
      escapeHtml,
      formatNumber,
      formatCurrency,
      formatDate,
      debounce,
      STATUS_LABELS,
      downloadCsv,
      refreshDashboard: async () => loadOrdersCenterPage()
    };

    // Chat orders
    try {
      await loadScriptOnce('/js/store-dashboard/chat-orders.js');
      if (window.storeDashboard?.chatOrders) {
        const chatMod = window.storeDashboard.chatOrders;
        if (!chatMod._inited && typeof chatMod.init === 'function') {
          chatMod.init({ state: pageState, helpers });
        } else if (chatMod._inited) {
          chatMod.ctx = { state: pageState, helpers };
        }
        if (typeof chatMod.renderPanel === 'function') chatMod.renderPanel();
      }
    } catch (err) {
      console.error('Chat orders module load error:', err.message);
      const panel = document.getElementById('chat-orders-panel');
      if (panel) panel.innerHTML = `<div class="placeholder error"><p>${escapeHtml(err.message)}</p></div>`;
    }

    // Chat customers
    try {
      await loadScriptOnce('/js/store-dashboard/chat-customers.js');
      if (window.storeDashboard?.chatCustomers) {
        const custMod = window.storeDashboard.chatCustomers;
        if (!custMod._inited && typeof custMod.init === 'function') {
          custMod.init({ state: pageState, helpers });
        } else if (custMod._inited) {
          custMod.ctx = { state: pageState, helpers };
        }
        if (typeof custMod.renderPanel === 'function') custMod.renderPanel();
      }
    } catch (err) {
      console.error('Chat customers module load error:', err.message);
      const panel = document.getElementById('chat-customers-panel');
      if (panel) panel.innerHTML = `<div class="placeholder error"><p>${escapeHtml(err.message)}</p></div>`;
    }

    // Store orders (reuse نفس وحدة المتجر)
    if (pageState.store) {
      try {
        await loadScriptOnce('/js/store-dashboard/orders.js');
        if (window.storeDashboard?.orders) {
          const ordersMod = window.storeDashboard.orders;
          if (!ordersMod._inited && typeof ordersMod.init === 'function') {
            ordersMod.init({ state: pageState, helpers });
          } else if (ordersMod._inited) {
            ordersMod.ctx = { state: pageState, helpers };
          }
          if (typeof ordersMod.renderPanel === 'function') ordersMod.renderPanel();
        }
      } catch (err) {
        console.error('Store orders module load error:', err.message);
        const storePanel = document.getElementById('store-orders-panel');
        if (storePanel) storePanel.innerHTML = `<div class="placeholder error"><p>${escapeHtml(err.message)}</p></div>`;
      }
    }
  }

  window.loadOrdersCenterPage = loadOrdersCenterPage;
})();
