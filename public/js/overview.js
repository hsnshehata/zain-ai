// public/js/overview.js
(function() {
  console.log("overview.js loaded at", new Date().toISOString());

  const ctx = window.dashboardCtx || {};
  const OVERVIEW_CACHE_PREFIX = 'dashboard_overview_cache_v1';
  const buildOverviewCacheKey = (botId) => `${OVERVIEW_CACHE_PREFIX}:${botId || 'anonymous'}`;

  function readOverviewCache(botId) {
    try {
      const cached = localStorage.getItem(buildOverviewCacheKey(botId));
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Failed to read overview cache:', err);
      return null;
    }
  }

  function writeOverviewCache(botId, snapshot) {
    try {
      localStorage.setItem(buildOverviewCacheKey(botId), JSON.stringify({
        ...snapshot,
        cachedAt: Date.now(),
      }));
    } catch (err) {
      console.warn('Failed to write overview cache:', err);
    }
  }

  // expose cache helpers back to dashboard context
  if (ctx) {
    ctx.readOverviewCache = readOverviewCache;
    ctx.writeOverviewCache = writeOverviewCache;
  }

  let channelsChart, ordersStatusChart, dailyMessagesChart;

  function renderCharts(channelsData, ordersData, dailyMessagesData) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#E0E0E0' : '#333333';
    const gridColor = isDarkMode ? '#3A3A4E' : '#D1D5DB';

    if (channelsChart) channelsChart.destroy();
    if (ordersStatusChart) ordersStatusChart.destroy();
    if (dailyMessagesChart) dailyMessagesChart.destroy();

    const channelsCtx = document.getElementById('channelsChart');
    if (channelsCtx) {
      channelsChart = new Chart(channelsCtx, {
        type: 'doughnut',
        data: {
          labels: ['فيسبوك', 'إنستجرام', 'واتساب', 'ويب'],
          datasets: [{
            data: [channelsData.facebook, channelsData.instagram, channelsData.whatsapp, channelsData.web],
            backgroundColor: ['#1877F2', '#E4405F', '#25D366', '#0ea5e9'],
            borderWidth: 2,
            borderColor: isDarkMode ? '#1A1A2E' : '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                font: { size: 14, family: 'Cairo, sans-serif' },
                padding: 15
              }
            },
            tooltip: { rtl: true, textDirection: 'rtl' }
          }
        }
      });
    }

    const ordersCtx = document.getElementById('ordersStatusChart');
    if (ordersCtx) {
      ordersStatusChart = new Chart(ordersCtx, {
        type: 'bar',
        data: {
          labels: ['قيد الانتظار', 'مكتملة', 'ملغاة'],
          datasets: [{
            label: 'عدد الطلبات',
            data: [ordersData.pending, ordersData.completed, ordersData.cancelled],
            backgroundColor: ['#FFA500', '#00C4B4', '#FF6B6B'],
            borderWidth: 2,
            borderColor: isDarkMode ? '#1A1A2E' : '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { rtl: true, textDirection: 'rtl' }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor, font: { family: 'Cairo, sans-serif' } },
              grid: { color: gridColor }
            },
            x: {
              ticks: { color: textColor, font: { family: 'Cairo, sans-serif' } },
              grid: { color: gridColor }
            }
          }
        }
      });
    }

    const dailyCtx = document.getElementById('dailyMessagesChart');
    if (dailyCtx && dailyMessagesData.length > 0) {
      const last7Days = dailyMessagesData.slice(-7);
      dailyMessagesChart = new Chart(dailyCtx, {
        type: 'line',
        data: {
          labels: last7Days.map(d => new Date(d.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'عدد المحادثات',
            data: last7Days.map(d => d.count),
            borderColor: '#00C4B4',
            backgroundColor: 'rgba(0, 196, 180, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#00C4B4',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              rtl: true,
              textDirection: 'rtl',
              backgroundColor: isDarkMode ? '#2A2A3E' : '#FFFFFF',
              titleColor: textColor,
              bodyColor: textColor,
              borderColor: '#00C4B4',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor, font: { family: 'Cairo, sans-serif' } },
              grid: { color: gridColor }
            },
            x: {
              ticks: { color: textColor, font: { family: 'Cairo, sans-serif' } },
              grid: { color: gridColor }
            }
          }
        }
      });
    }
  }

  function applyOverviewData(snapshot, source = 'network') {
    if (!snapshot) return;
    const totals = snapshot.totals || {};
    const ordersCard = snapshot.ordersCard || {};
    const botInfo = snapshot.botInfo || {};
    const charts = snapshot.charts || {};

    const totalConversationsEl = document.getElementById('total-conversations');
    if (totalConversationsEl) totalConversationsEl.textContent = totals.conversations ?? '0';

    const totalOrdersEl = document.getElementById('total-orders');
    if (totalOrdersEl) totalOrdersEl.textContent = totals.orders ?? '0';

    const totalRevenueEl = document.getElementById('total-revenue');
    if (totalRevenueEl) totalRevenueEl.textContent = totals.revenueText ?? '0 ج.م';

    const totalProductsEl = document.getElementById('total-products');
    if (totalProductsEl) totalProductsEl.textContent = totals.productsText ?? '0';

    const totalFeedbackEl = document.getElementById('total-feedback');
    if (totalFeedbackEl) totalFeedbackEl.textContent = totals.feedback ?? '0';

    const botStatusEl = document.getElementById('bot-status');
    if (botStatusEl) botStatusEl.textContent = botInfo.statusText ?? 'غير معروف';

    const botExpiryEl = document.getElementById('bot-expiry');
    if (botExpiryEl && botInfo.expiryText) botExpiryEl.textContent = botInfo.expiryText;

    const ordersTitleEl = document.getElementById('orders-card-title');
    if (ordersTitleEl && ordersCard.title) ordersTitleEl.textContent = ordersCard.title;

    const ordersSubEl = document.getElementById('orders-card-sub');
    if (ordersSubEl && ordersCard.subtitle) ordersSubEl.textContent = ordersCard.subtitle;

    const safeChannelsData = charts.channelsData || { facebook: 0, instagram: 0, whatsapp: 0, web: 0 };
    const safeOrdersData = charts.ordersData || { pending: 0, completed: 0, cancelled: 0 };
    const safeDailyMessagesData = charts.dailyMessagesData || [];
    renderCharts(safeChannelsData, safeOrdersData, safeDailyMessagesData);

    console.log(`Overview UI updated from ${source} snapshot at`, new Date().toISOString());
  }

  async function loadOverviewStats(navSnapshot) {
    console.log("loadOverviewStats called...");
    const thisNav = navSnapshot ?? ctx.getNavToken?.() ?? 0;
    if (thisNav !== (ctx.getNavToken?.() ?? thisNav)) {
      console.warn('Stale overview stats skipped at start');
      return;
    }

    const selectedBotId = localStorage.getItem("selectedBotId");
    const token = ctx.getToken?.();
    const availableBots = ctx.getAvailableBots?.() || [];

    if (!selectedBotId || !token) return;

    const snapshot = {
      botId: selectedBotId,
      totals: {
        conversations: 0,
        orders: 0,
        revenue: 0,
        revenueText: '0 ج.م',
        products: 0,
        productsText: '0',
        customers: 0,
        customersText: '0',
        feedback: 0,
      },
      ordersCard: { title: 'الطلبات', subtitle: 'إجمالي الطلبات' },
      botInfo: { statusText: 'جاري التحميل...', subscriptionText: 'جاري التحميل...', expiryText: 'جاري التحميل...' },
      charts: {
        channelsData: { facebook: 0, instagram: 0, whatsapp: 0, web: 0 },
        ordersData: { pending: 0, completed: 0, cancelled: 0 },
        dailyMessagesData: [],
      },
      meta: { updatedAt: Date.now() },
    };

    let chatOrdersCounts = { total: 0, pending: 0, byStatus: {} };
    let chatOrdersNewestTs = 0;
    let totalOrdersCount = 0;
    let revenueTotal = 0;

    try {
      const bot = availableBots.find(b => String(b._id) === String(selectedBotId));
      if (bot) {
        const subscriptionTypes = { free: 'مجاني', monthly: 'شهري', yearly: 'سنوي' };
        snapshot.botInfo.statusText = bot.isActive ? '🟢 نشط' : '🔴 متوقف';
        snapshot.botInfo.subscriptionText = subscriptionTypes[bot.subscriptionType] || 'غير معروف';
        if (bot.autoStopDate) {
          const endDate = new Date(bot.autoStopDate);
          snapshot.botInfo.expiryText = endDate.toLocaleDateString('ar-EG');
        } else {
          snapshot.botInfo.expiryText = 'غير محدد';
        }
      }

      try {
        let totalConversations = 0;
        const channels = ['facebook', 'instagram', 'whatsapp', 'web'];
        for (const channel of channels) {
          try {
            const response = await fetch(
              `/api/messages/${selectedBotId}?type=${channel}&page=1&limit=1`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
              const data = await response.json();
              const count = data.totalConversations || 0;
              totalConversations += count;
              snapshot.charts.channelsData[channel] = count;
            }
          } catch (err) {
            console.log(`No ${channel} conversations`);
          }
        }
        snapshot.totals.conversations = totalConversations;
      } catch (err) {
        console.error('Error fetching conversations:', err);
        snapshot.totals.conversations = 0;
      }

      try {
        const response = await fetch(`/api/messages/daily/${selectedBotId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) {
          snapshot.charts.dailyMessagesData = await response.json();
        }
      } catch (err) {
        console.log('No daily messages data');
      }

      try {
        const chatOrdersUrl = selectedBotId ? `/api/chat-orders?botId=${selectedBotId}` : '/api/chat-orders';
        const chatResp = await handleApiRequest(
          chatOrdersUrl,
          { headers: { Authorization: `Bearer ${token}` } },
          null,
          'فشل في جلب طلبات المحادثة'
        );

        chatOrdersCounts = chatResp?.counts || { total: 0, pending: 0, byStatus: {} };
        const chatOrders = Array.isArray(chatResp?.orders) ? chatResp.orders : [];

        chatOrdersNewestTs = Math.max(
          0,
          ...chatOrders.map((o) => new Date(o.createdAt || o.updatedAt || o.lastModifiedAt || 0).getTime())
        );

        totalOrdersCount += chatOrdersCounts.total || chatOrders.length || 0;

        chatOrders.forEach((order) => {
          const st = (order.status || '').toLowerCase();
          if (st === 'cancelled') snapshot.charts.ordersData.cancelled++;
          else if (st === 'delivered') snapshot.charts.ordersData.completed++;
          else snapshot.charts.ordersData.pending++;
        });
      } catch (err) {
        console.log('No chat orders data');
      }

      try {
        const bot = availableBots.find(b => String(b._id) === String(selectedBotId));
        const storeId = bot && bot.storeId ? (typeof bot.storeId === 'object' ? bot.storeId._id : bot.storeId) : null;

        if (storeId) {
          try {
            const customers = await handleApiRequest(
              `/api/customers/${storeId}/customers`,
              { headers: { Authorization: `Bearer ${token}` } },
              null,
              'فشل في جلب العملاء'
            );
            snapshot.totals.customers = customers.length || 0;
            snapshot.totals.customersText = String(customers.length || 0);
          } catch (err) {
            console.log('No customers found');
            snapshot.totals.customers = 0;
            snapshot.totals.customersText = '0';
          }

          try {
            const orders = await handleApiRequest(
              `/api/orders/${storeId}/orders`,
              { headers: { Authorization: `Bearer ${token}` } },
              null,
              'فشل في جلب الطلبات'
            );
            snapshot.totals.orders = orders.length || 0;
            totalOrdersCount += orders.length;

            revenueTotal += orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            snapshot.totals.revenue = revenueTotal;
            snapshot.totals.revenueText = `${revenueTotal.toFixed(2)} ج.م`;

            orders.forEach(order => {
              const status = (order.status || '').toLowerCase();
              if (status === 'cancelled') snapshot.charts.ordersData.cancelled++;
              else if (status === 'delivered') snapshot.charts.ordersData.completed++;
              else snapshot.charts.ordersData.pending++;
            });
          } catch (err) {
            console.log('No orders found');
            snapshot.totals.orders = totalOrdersCount;
            snapshot.totals.revenue = revenueTotal;
            snapshot.totals.revenueText = '0 ج.م';
          }

          try {
            const products = await handleApiRequest(
              `/api/products/${storeId}/products`,
              { headers: { Authorization: `Bearer ${token}` } },
              null,
              'فشل في جلب المنتجات'
            );
            snapshot.totals.products = products.length || 0;
            snapshot.totals.productsText = String(products.length || 0);
          } catch (err) {
            console.log('No products found');
            snapshot.totals.products = 0;
            snapshot.totals.productsText = '0';
          }
        } else {
          snapshot.totals.customersText = 'لا يوجد متجر';
          snapshot.totals.revenueText = 'لا يوجد متجر';
          snapshot.totals.productsText = 'لا يوجد متجر';
        }
      } catch (err) {
        console.error('Error in store operations:', err);
        snapshot.totals.customers = 0;
        snapshot.totals.customersText = '0';
        snapshot.totals.revenue = 0;
        snapshot.totals.revenueText = '0 ج.م';
        snapshot.totals.products = 0;
        snapshot.totals.productsText = '0';
      }

      try {
        const feedbackData = await handleApiRequest(
          `/api/feedback/${selectedBotId}`,
          { headers: { Authorization: `Bearer ${token}` } },
          null,
          'فشل في جلب التقييمات'
        );
        const feedbackCount = Array.isArray(feedbackData) ? feedbackData.length : 0;
        snapshot.totals.feedback = feedbackCount;
      } catch (err) {
        console.error('Error fetching feedback:', err);
        snapshot.totals.feedback = 0;
      }

      const lastSeen = Number(localStorage.getItem('chatOrdersLastSeen') || 0);
      const hasNewOrders = chatOrdersCounts.pending > 0 || chatOrdersNewestTs > lastSeen;
      if (hasNewOrders) {
        const pending = chatOrdersCounts.pending || 0;
        snapshot.ordersCard.title = 'يوجد طلبات جديدة ♥';
        snapshot.ordersCard.subtitle = pending > 0 ? `${pending} طلب محادثة جديد` : 'طلبات محادثة جديدة';
      } else {
        snapshot.ordersCard.title = 'الطلبات';
        snapshot.ordersCard.subtitle = 'إجمالي الطلبات';
      }
      snapshot.totals.orders = totalOrdersCount || snapshot.totals.orders || 0;

      if (thisNav !== (ctx.getNavToken?.() ?? thisNav)) {
        console.warn('Stale overview stats skipped before apply');
        return;
      }

      applyOverviewData(snapshot, 'network');
      writeOverviewCache(selectedBotId, snapshot);
    } catch (err) {
      console.error('Error loading overview stats:', err);
    }
  }

  async function loadOverviewPage(navSnapshot) {
    console.log("renderOverview called...");
    const thisNav = navSnapshot ?? ctx.getNavToken?.() ?? 0;
    const selectedBotId = localStorage.getItem("selectedBotId");

    if (!selectedBotId) {
      if (thisNav !== (ctx.getNavToken?.() ?? thisNav)) return;
      const content = document.getElementById('content');
      if (content) {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض الإحصائيات.</p></div>`;
      }
      return;
    }

    if (thisNav !== (ctx.getNavToken?.() ?? thisNav)) {
      console.warn('Stale overview render skipped before layout inject');
      return;
    }

    const content = document.getElementById('content');
    if (!content) return;

    const isSuperadmin = ctx.getRole?.() === 'superadmin';

    content.innerHTML = `
      <div class="overview-container">
        <h2 class="section-title"><i class="fas fa-chart-line"></i> لمحة عامة</h2>
        
        <div class="stats-grid">
          <div class="stat-card" data-target-page="messages" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-comments"></i></div>
            <div class="stat-info">
              <h3>المحادثات</h3>
              <p class="stat-value" id="total-conversations">جاري التحميل...</p>
              <small>إجمالي المحادثات</small>
            </div>
          </div>
          
          <div class="stat-card" data-target-page="orders-center" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-info">
              <h3 id="orders-card-title">الطلبات</h3>
              <p class="stat-value" id="total-orders">جاري التحميل...</p>
              <small id="orders-card-sub">جاري التحميل...</small>
            </div>
          </div>
          
          <div class="stat-card" data-target-page="store-manager" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-info">
              <h3>المبيعات</h3>
              <p class="stat-value" id="total-revenue">جاري التحميل...</p>
              <small>إجمالي المبيعات</small>
            </div>
          </div>
          
          <div class="stat-card" data-target-page="store-manager" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-box"></i></div>
            <div class="stat-info">
              <h3>المنتجات</h3>
              <p class="stat-value" id="total-products">جاري التحميل...</p>
              <small>إجمالي المنتجات</small>
            </div>
          </div>

          <div class="stat-card" data-target-page="feedback" style="cursor:pointer;">
            <div class="stat-icon"><i class="fas fa-star"></i></div>
            <div class="stat-info">
              <h3>التقييمات</h3>
              <p class="stat-value" id="total-feedback">جاري التحميل...</p>
              <small>إجمالي التقييمات</small>
            </div>
          </div>

          <div class="stat-card" ${isSuperadmin ? 'data-target-page="bots" style="cursor:pointer;"' : 'style="cursor:default;"'}>
            <div class="stat-icon"><i class="fas fa-robot"></i></div>
            <div class="stat-info">
              <h3>حالة البوت</h3>
              <p class="stat-value" id="bot-status">جاري التحميل...</p>
              <small id="bot-expiry">جاري التحميل...</small>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card chart-card">
            <div class="card-header">
              <h3><i class="fas fa-project-diagram"></i> توزيع المحادثات حسب القنوات</h3>
            </div>
            <div class="card-body">
              <canvas id="channelsChart"></canvas>
            </div>
          </div>

          <div class="card chart-card">
            <div class="card-header">
              <h3><i class="fas fa-tasks"></i> حالة الطلبات</h3>
            </div>
            <div class="card-body">
              <canvas id="ordersStatusChart"></canvas>
            </div>
          </div>
        </div>

        <div class="card chart-card full-width">
          <div class="card-header">
            <h3><i class="fas fa-chart-line"></i> المحادثات اليومية (آخر 7 أيام)</h3>
          </div>
          <div class="card-body">
            <canvas id="dailyMessagesChart"></canvas>
          </div>
        </div>
      </div>
    `;

    content.querySelectorAll('.stat-card').forEach((card) => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-target-page');
        if (!target) return;
        if (target === 'bots' && !isSuperadmin) return;
        window.location.hash = `#${target}`;
      });
    });

    const cachedSnapshot = readOverviewCache(selectedBotId);
    if (cachedSnapshot && cachedSnapshot.botId === selectedBotId) {
      if (thisNav !== (ctx.getNavToken?.() ?? thisNav)) {
        console.warn('Stale overview render skipped before cache apply');
        return;
      }
      console.log('Applying overview cache for bot', selectedBotId);
      applyOverviewData(cachedSnapshot, 'cache');
    }

    await loadOverviewStats(thisNav);
  }

  window.loadOverviewPage = loadOverviewPage;
})();
