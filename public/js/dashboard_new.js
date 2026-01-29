// /public/js/dashboard_new.js
try {
  console.log("dashboard_new.js started loading at", new Date().toISOString());

  document.addEventListener("DOMContentLoaded", async () => {
    // Global variable to store available bots
    let availableBots = [];
    let isInitialLoad = true; // Flag to control initial load

    // Valid pages to prevent unexpected page loads
    const validPages = ['overview', 'bots', 'rules', 'chat-page', 'store-manager', 'orders-center', 'channels', 'facebook', 'instagram', 'whatsapp', 'messages', 'feedback', 'wasenderpro', 'settings'];

    // Local cache keys for fast client-side rendering
    const OVERVIEW_CACHE_PREFIX = 'dashboard_overview_cache_v1';
    const buildOverviewCacheKey = (botId) => `${OVERVIEW_CACHE_PREFIX}:${botId || 'anonymous'}`;
    const readOverviewCache = (botId) => {
      try {
        const cached = localStorage.getItem(buildOverviewCacheKey(botId));
        return cached ? JSON.parse(cached) : null;
      } catch (err) {
        console.warn('Failed to read overview cache:', err);
        return null;
      }
    };
    const writeOverviewCache = (botId, snapshot) => {
      try {
        localStorage.setItem(buildOverviewCacheKey(botId), JSON.stringify({
          ...snapshot,
          cachedAt: Date.now(),
        }));
      } catch (err) {
        console.warn('Failed to write overview cache:', err);
      }
    };

    // Pages configuration for dashboard cards
    const pages = [
      { id: 'bots', name: 'إدارة البوتات', icon: 'fas fa-robot', description: 'تحكم في إنشاء وتعديل البوتات الخاصة بك', role: 'superadmin' },
      { id: 'rules', name: 'القواعد', icon: 'fas fa-book', description: 'إضافة وتعديل قواعد الردود التلقائية' },
      { id: 'chat-page', name: 'صفحة الدردشة', icon: 'fas fa-comment-alt', description: 'تخصيص واجهة الدردشة' },
      { id: 'store-manager', name: 'المتجر الذكي', icon: 'fas fa-store', description: 'إدارة متجرك الذكي ومنتجاتك' },
      { id: 'orders-center', name: 'متابعة الطلبات', icon: 'fas fa-clipboard-list', description: 'عرض طلبات المتجر والمحادثات في مكان واحد' },
      { id: 'facebook', name: 'فيسبوك', icon: 'fab fa-facebook', description: 'ربط وإدارة حساب فيسبوك' },
      { id: 'instagram', name: 'إنستجرام', icon: 'fab fa-instagram', description: 'ربط وإدارة حساب إنستجرام' },
      { id: 'whatsapp', name: 'واتساب', icon: 'fab fa-whatsapp', description: 'ربط وإدارة حساب واتساب' },
      { id: 'messages', name: 'الرسائل', icon: 'fas fa-envelope', description: 'مراجعة محادثات المستخدمين' },
      { id: 'feedback', name: 'التقييمات', icon: 'fas fa-comments', description: 'رؤية تقييمات المستخدمين' },
      { id: 'wasenderpro', name: 'Wasender Pro', icon: 'fas fa-bolt', description: 'مجاني طوال فترة الاشتراك' },
      { id: 'settings', name: 'الإعدادات', icon: 'fas fa-cog', description: 'إدارة إعدادات الحساب' }
    ];

    // Check for token in URL (from /verify/:token redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      try {
        // Decode the token to extract userId, role, and username
        const decoded = jwtDecode(tokenFromUrl);
        localStorage.setItem('token', tokenFromUrl);
        localStorage.setItem('userId', decoded.userId);
        localStorage.setItem('role', decoded.role);
        localStorage.setItem('username', decoded.username);
        console.log('✅ Token from URL stored in localStorage:', decoded);
        // Clear the URL params to avoid reusing the token
        window.history.replaceState({}, document.title, '/dashboard_new.html');
      } catch (err) {
        console.error('❌ Error decoding token from URL:', err.message);
        localStorage.clear();
        window.location.href = "/login.html";
        return;
      }
    }

    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    // Redirect to login if no token or userId
    if (!token || !userId) {
      console.warn('⚠️ No token or userId found in localStorage, redirecting to login');
      localStorage.clear();
      if (window.location.pathname !== "/login.html") {
        window.location.href = "/login.html";
      }
      return;
    }

    // Validate initial hash to prevent unexpected page loads
    let initialHash = window.location.hash.substring(1);
    if (initialHash && !validPages.includes(initialHash)) {
      console.warn(`⚠️ Invalid initial hash: ${initialHash}, resetting to default`);
      initialHash = '';
      window.location.hash = '';
    }

    // Load username
    async function loadUsername() {
      console.log("loadUsername called...");
      const welcomeUsername = document.getElementById("welcome-username");
      try {
        const user = await handleApiRequest('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        }, welcomeUsername, 'فشل في جلب بيانات المستخدم');
        welcomeUsername.textContent = user.username || 'غير معروف';
      } catch (err) {
        welcomeUsername.textContent = 'خطأ في تحميل الاسم';
        console.error('Error loading username:', err);
      }
    }

    // Load bot info
    async function loadBotInfo() {
      console.log("loadBotInfo called...");
      const subscriptionTypeEl = document.getElementById("subscription-type");
      const subscriptionEndEl = document.getElementById("subscription-end");
      const remainingDaysEl = document.getElementById("remaining-days");

      const selectedBotId = localStorage.getItem("selectedBotId");
      console.log('Selected Bot ID in loadBotInfo:', selectedBotId);

      if (!selectedBotId) {
        console.log('No bot selected, displaying default message');
        subscriptionTypeEl.textContent = 'يرجى اختيار بوت';
        subscriptionEndEl.textContent = 'يرجى اختيار بوت';
        remainingDaysEl.textContent = 'يرجى اختيار بوت';
        return;
      }

      try {
        // Find the bot in availableBots
        const bot = availableBots.find(bot => String(bot._id) === String(selectedBotId));
        console.log('Available bots in loadBotInfo:', availableBots);
        console.log('Found bot in loadBotInfo:', bot);

        if (!bot) {
          console.log('Bot not found in availableBots, clearing selectedBotId');
          localStorage.removeItem("selectedBotId");
          subscriptionTypeEl.textContent = 'يرجى اختيار بوت';
          subscriptionEndEl.textContent = 'يرجى اختيار بوت';
          remainingDaysEl.textContent = 'يرجى اختيار بوت';
          return;
        }

        // Display subscription type
        const subscriptionTypes = {
          free: 'مجاني',
          monthly: 'شهري',
          yearly: 'سنوي'
        };
        subscriptionTypeEl.textContent = subscriptionTypes[bot.subscriptionType] || 'غير معروف';

        // Display subscription end date or "معطل" if bot is inactive
        if (!bot.isActive) {
          subscriptionEndEl.textContent = 'معطل';
          remainingDaysEl.textContent = 'غير متاح';
        } else if (bot.autoStopDate) {
          const endDate = new Date(bot.autoStopDate);
          subscriptionEndEl.textContent = endDate.toLocaleDateString('ar-EG');
          const remainingDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
          remainingDaysEl.textContent = remainingDays > 0 ? `${remainingDays} يوم` : 'منتهي';
        } else {
          subscriptionEndEl.textContent = 'غير محدد';
          remainingDaysEl.textContent = 'غير محدد';
        }
      } catch (err) {
        console.error('Error loading bot info:', err);
        subscriptionTypeEl.textContent = 'يرجى اختيار بوت';
        subscriptionEndEl.textContent = 'يرجى اختيار بوت';
        remainingDaysEl.textContent = 'يرجى اختيار بوت';
        localStorage.removeItem("selectedBotId"); // Clear invalid bot ID
      }
    }

    // Load welcome bar (username and bot info)
    async function loadWelcomeBar() {
      console.log("loadWelcomeBar called...");
      await loadUsername();
      await loadBotInfo();
    }

    const content = document.getElementById("content");
    const botSelect = document.getElementById("botSelectDashboard");
    const logoutBtn = document.querySelector(".logout-btn");
    const themeToggleButton = document.getElementById("theme-toggle");
    const notificationsBtn = document.getElementById("notifications-btn");
    const notificationsModal = document.getElementById("notifications-modal");
    const notificationsList = document.getElementById("notifications-list");
    const notificationsCount = document.getElementById("notifications-count");
    const closeNotificationsBtn = document.getElementById("close-notifications-btn");

    // Map of pages to their respective CSS files
    const pageCssMap = {
      bots: "/css/bots.css",
      rules: "/css/rules.css",
      "chat-page": "/css/chatPage.css",
      "store-manager": "/css/storeManager.css",
      "orders-center": "/css/storeManager.css",
      messages: "/css/messages.css",
      facebook: "/css/facebook.css",
      instagram: "/css/facebook.css",
      whatsapp: "/css/facebook.css",
      wasenderpro: "/css/facebook.css",
      settings: "/css/settings.css",
    };

    // Map of pages to their respective JS files
    const pageJsMap = {
      bots: "/js/bots.js",
      rules: "/js/rules.js",
      "chat-page": "/js/chatPage.js",
      "store-manager": "/js/store-dashboard/main.js",
      "orders-center": "/js/orders-center.js",
      messages: "/js/messages.js",
      feedback: "/js/feedback.js",
      channels: "/js/channels.js",
      facebook: "/js/facebook.js",
      instagram: "/js/instagram.js",
      whatsapp: "/js/whatsapp.js",
      wasenderpro: "/js/wasenderpro.js",
      settings: "/js/settings.js",
    };

    // Cache for loaded scripts
    const loadedScripts = new Map();

    // Load CSS dynamically
    function loadPageCss(page) {
      console.log(`loadPageCss called for page: ${page}`);
      document.querySelectorAll('link[data-page-css]').forEach(link => link.remove());
      if (pageCssMap[page]) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = pageCssMap[page];
        link.dataset.pageCss = page;
        document.head.appendChild(link);
      }
    }

    // Load JS dynamically if not already loaded
    async function loadPageJs(page) {
      console.log(`loadPageJs called for page: ${page} at`, new Date().toISOString());
      if (!pageJsMap[page]) return;

      // Check if the script is already loaded or cached
      if (loadedScripts.has(pageJsMap[page])) {
        console.log(`${pageJsMap[page]} already loaded from cache at`, new Date().toISOString());
        return;
      }

      let script = document.querySelector(`script[src="${pageJsMap[page]}"]`);
      if (!script) {
        console.log(`Loading script for page ${page}: ${pageJsMap[page]}`);
        script = document.createElement("script");
        script.src = pageJsMap[page];
        script.async = false; // Ensure synchronous loading
        document.body.appendChild(script);

        // Wait for the script to load
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log(`${pageJsMap[page]} loaded successfully at`, new Date().toISOString());
            loadedScripts.set(pageJsMap[page], true);
            // Add a slight delay to ensure global functions are defined
            setTimeout(resolve, 100);
          };
          script.onerror = () => {
            console.error(`Failed to load script ${pageJsMap[page]} at`, new Date().toISOString());
            reject(new Error(`Failed to load script ${pageJsMap[page]}`));
          };
        });
      } else {
        console.log(`${pageJsMap[page]} already loaded in DOM at`, new Date().toISOString());
        loadedScripts.set(pageJsMap[page], true);
      }

      // Check if the function is defined after loading
      let funcName = page === 'chat-page' ? 'loadChatPage' : 
                     page === 'store-manager' ? 'loadStoreManagerPage' : 
                     `load${page.charAt(0).toUpperCase() + page.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Page`;
      if (typeof window[funcName] !== "function") {
        console.error(`${funcName} not defined after loading ${pageJsMap[page]} at`, new Date().toISOString());
      } else {
        console.log(`${funcName} is now available at`, new Date().toISOString());
      }
    }

    // Load assistantBot.css when assistant modal is shown
    function loadAssistantCss() {
      console.log("loadAssistantCss called...");
      if (!document.querySelector('link[href="/css/assistantBot.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/css/assistantBot.css";
        document.head.appendChild(link);
      }
    }

    // Load notifications.css
    function loadNotificationsCss() {
      console.log("loadNotificationsCss called...");
      if (!document.querySelector('link[href="/css/notifications.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/css/notifications.css";
        document.head.appendChild(link);
      }
    }

    // Theme Handling
    const applyTheme = (theme) => {
      console.log(`applyTheme called with theme: ${theme}`);
      if (theme === "light") {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
        // Update theme toggle icon to show moon (for switching to dark)
        const themeIcon = themeToggleButton.querySelector('i');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      } else {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
        // Update theme toggle icon to show sun (for switching to light)
        const themeIcon = themeToggleButton.querySelector('i');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
      }
      localStorage.setItem("theme", theme);
    };

    const currentTheme = localStorage.getItem("theme") || "dark";
    applyTheme(currentTheme);

    themeToggleButton.addEventListener("click", () => {
      console.log("themeToggleButton clicked...");
      const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
      applyTheme(newTheme);
    });

    // Bot Selector
    async function populateBotSelect() {
      console.log("populateBotSelect called...");
      try {
        content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
        const bots = await handleApiRequest("/api/bots", {
          headers: { Authorization: `Bearer ${token}` },
        }, content, "فشل في جلب البوتات");

        console.log('Fetched bots:', bots);

        botSelect.innerHTML = "<option value=\"\">اختر بوت</option>";
        let userBots = bots;
        if (role !== "superadmin") {
          userBots = bots.filter(bot => {
            const botUserId = typeof bot.userId === 'object' && bot.userId._id ? bot.userId._id : bot.userId;
            return botUserId === userId;
          });
        }

        if (userBots.length === 0) {
          content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-robot"></i> لا يوجد بوتات متاحة</h2><p>يرجى التواصل مع المسؤول لإضافة بوت لحسابك أو إنشاء بوت جديد.</p></div>`;
          botSelect.disabled = true;
          localStorage.removeItem("selectedBotId");
          availableBots = [];
          await loadWelcomeBar();
          return;
        }

        availableBots = userBots;
        userBots.forEach((bot) => {
          botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
        });

        const selectedBotId = localStorage.getItem("selectedBotId");
        console.log('Current selectedBotId from localStorage:', selectedBotId);

        if (selectedBotId && userBots.some(bot => String(bot._id) === String(selectedBotId))) {
          botSelect.value = selectedBotId;
          console.log(`Selected bot ${selectedBotId} found in bots list`);
        } else {
          console.log('Selected bot not found or invalid, clearing selectedBotId');
          localStorage.removeItem("selectedBotId");
          if (userBots.length > 0) {
            botSelect.value = userBots[0]._id;
            localStorage.setItem("selectedBotId", userBots[0]._id);
            console.log(`Set new selectedBotId to first bot: ${userBots[0]._id}`);
          }
        }

        await loadInitialPage();
        await loadWelcomeBar();
        isInitialLoad = false;
      } catch (err) {
        console.error('Error in populateBotSelect:', err);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>خطأ في جلب البوتات: ${err.message}. حاول تحديث الصفحة.</p></div>`;
        botSelect.disabled = true;
        localStorage.removeItem("selectedBotId");
        availableBots = [];
        await loadWelcomeBar();
        isInitialLoad = false;
      }
    }

    botSelect.addEventListener("change", async () => {
      console.log("botSelect change event triggered...");
      const selectedBotId = botSelect.value;
      console.log('Bot selection changed to:', selectedBotId);
      if (selectedBotId) {
        localStorage.setItem("selectedBotId", selectedBotId);
        await loadInitialPage();
        await loadWelcomeBar();
      } else {
        localStorage.removeItem("selectedBotId");
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض المحتوى.</p></div>`;
        window.location.hash = '';
        await loadWelcomeBar();
      }
    });

    // Render Overview Page
    async function renderOverview() {
      console.log("renderOverview called...");
      const selectedBotId = localStorage.getItem("selectedBotId");
      
      if (!selectedBotId) {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض الإحصائيات.</p></div>`;
        return;
      }

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
                <small>عدد المنتجات</small>
              </div>
            </div>

            <div class="stat-card" data-target-page="bots" style="cursor:pointer;">
              <div class="stat-icon"><i class="fas fa-users"></i></div>
              <div class="stat-info">
                <h3>العملاء</h3>
                <p class="stat-value" id="total-customers">جاري التحميل...</p>
                <small>عدد العملاء</small>
              </div>
            </div>
            
            <div class="stat-card" data-target-page="feedback" style="cursor:pointer;">
              <div class="stat-icon"><i class="fas fa-star"></i></div>
              <div class="stat-info">
                <h3>التقييمات</h3>
                <p class="stat-value" id="total-feedback">جاري التحميل...</p>
                <small>عدد التقييمات</small>
              </div>
            </div>
          </div>
          
          <!-- Charts Section -->
          <div class="charts-section">
            <div class="chart-card">
              <h3><i class="fas fa-chart-pie"></i> توزيع المحادثات حسب القناة</h3>
              <canvas id="channelsChart"></canvas>
            </div>
            
            <div class="chart-card">
              <h3><i class="fas fa-chart-bar"></i> الطلبات حسب الحالة</h3>
              <canvas id="ordersStatusChart"></canvas>
            </div>
          </div>
          
          <div class="chart-card-full">
            <h3><i class="fas fa-chart-line"></i> المحادثات اليومية (آخر 7 أيام)</h3>
            <canvas id="dailyMessagesChart"></canvas>
          </div>
          
          <div class="bot-status-card">
            <h3><i class="fas fa-robot"></i> حالة البوت</h3>
            <div class="bot-status-info">
              <div class="status-item">
                <span class="status-label">الحالة:</span>
                <span class="status-value" id="bot-status">جاري التحميل...</span>
              </div>
              <div class="status-item">
                <span class="status-label">نوع الاشتراك:</span>
                <span class="status-value" id="bot-subscription">جاري التحميل...</span>
              </div>
              <div class="status-item">
                <span class="status-label">انتهاء الاشتراك:</span>
                <span class="status-value" id="bot-expiry">جاري التحميل...</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // البطاقات تعمل كأزرار تنقل للصفحات المرتبطة
      content.querySelectorAll('.stat-card').forEach((card) => {
        card.addEventListener('click', () => {
          const target = card.getAttribute('data-target-page');
          if (target) {
            window.location.hash = `#${target}`;
            loadPageContent(target);
          }
        });
      });

      // Render cached snapshot instantly (if available) then refresh from network
      const cachedSnapshot = readOverviewCache(selectedBotId);
      if (cachedSnapshot && cachedSnapshot.botId === selectedBotId) {
        console.log('Applying overview cache for bot', selectedBotId);
        applyOverviewData(cachedSnapshot, 'cache');
      }

      // Load statistics (will refresh UI and cache when network finishes)
      await loadOverviewStats();
    }

    // Apply overview snapshot to DOM and charts
    function applyOverviewData(snapshot, source = 'network') {
      if (!snapshot) return;
      const totals = snapshot.totals || {};
      const ordersCard = snapshot.ordersCard || {};
      const botInfo = snapshot.botInfo || {};
      const charts = snapshot.charts || {};

      const formatCount = (value, fallback = '0') => {
        if (value === undefined || value === null) return fallback;
        return typeof value === 'number' ? value.toLocaleString('ar-EG') : value;
      };

      const totalConversationsEl = document.getElementById('total-conversations');
      if (totalConversationsEl) totalConversationsEl.textContent = formatCount(totals.conversations);

      const totalOrdersEl = document.getElementById('total-orders');
      if (totalOrdersEl) totalOrdersEl.textContent = formatCount(totals.orders);

      const totalRevenueEl = document.getElementById('total-revenue');
      if (totalRevenueEl) {
        const revenueText = totals.revenueText !== undefined ? totals.revenueText : `${Number(totals.revenue || 0).toFixed(2)} ج.م`;
        totalRevenueEl.textContent = revenueText;
      }

      const totalProductsEl = document.getElementById('total-products');
      if (totalProductsEl) totalProductsEl.textContent = formatCount(totals.productsText ?? totals.products);

      const totalCustomersEl = document.getElementById('total-customers');
      if (totalCustomersEl) totalCustomersEl.textContent = formatCount(totals.customersText ?? totals.customers);

      const totalFeedbackEl = document.getElementById('total-feedback');
      if (totalFeedbackEl) totalFeedbackEl.textContent = formatCount(totals.feedback);

      const botStatusEl = document.getElementById('bot-status');
      if (botStatusEl && botInfo.statusText) botStatusEl.textContent = botInfo.statusText;

      const botSubscriptionEl = document.getElementById('bot-subscription');
      if (botSubscriptionEl && botInfo.subscriptionText) botSubscriptionEl.textContent = botInfo.subscriptionText;

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

    // Load Overview Statistics
    async function loadOverviewStats() {
      console.log("loadOverviewStats called...");
      const selectedBotId = localStorage.getItem("selectedBotId");
      
      if (!selectedBotId) return;

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
        // Fetch bot info
        const bot = availableBots.find(b => String(b._id) === String(selectedBotId));
        if (bot) {
          const subscriptionTypes = {
            free: 'مجاني',
            monthly: 'شهري',
            yearly: 'سنوي'
          };
          snapshot.botInfo.statusText = bot.isActive ? '🟢 نشط' : '🔴 متوقف';
          snapshot.botInfo.subscriptionText = subscriptionTypes[bot.subscriptionType] || 'غير معروف';
          if (bot.autoStopDate) {
            const endDate = new Date(bot.autoStopDate);
            snapshot.botInfo.expiryText = endDate.toLocaleDateString('ar-EG');
          } else {
            snapshot.botInfo.expiryText = 'غير محدد';
          }
        }

        // Fetch conversations count from all channels
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

        // Fetch daily messages for chart
        try {
          const response = await fetch(
            `/api/messages/daily/${selectedBotId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.ok) {
            snapshot.charts.dailyMessagesData = await response.json();
          }
        } catch (err) {
          console.log('No daily messages data');
        }

        // Fetch chat orders (always include, even without a store)
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
            else snapshot.charts.ordersData.pending++; // pending/processing/confirmed/shipped → انتظار
          });
        } catch (err) {
          console.log('No chat orders data');
        }

        // Get store info from bot
        try {
          const bot = availableBots.find(b => String(b._id) === String(selectedBotId));
          const storeId = bot && bot.storeId ? (typeof bot.storeId === 'object' ? bot.storeId._id : bot.storeId) : null;
          
          if (storeId) {
            // Fetch customers
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

            // Fetch store orders
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
              
              // Count orders by status
              orders.forEach(order => {
                const status = (order.status || '').toLowerCase();
                if (status === 'cancelled') snapshot.charts.ordersData.cancelled++;
                else if (status === 'delivered') snapshot.charts.ordersData.completed++;
                else snapshot.charts.ordersData.pending++; // pending/processing/confirmed/shipped → انتظار
              });
            } catch (err) {
              console.log('No orders found');
              snapshot.totals.orders = totalOrdersCount;
              snapshot.totals.revenue = revenueTotal;
              snapshot.totals.revenueText = '0 ج.م';
            }

            // Fetch products
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
            // No store linked
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

        // Fetch feedback count
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
        
        // عكس حالة الطلبات في البطاقة
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

        // Render and cache snapshot
        applyOverviewData(snapshot, 'network');
        writeOverviewCache(selectedBotId, snapshot);
      } catch (err) {
        console.error('Error loading overview stats:', err);
      }
    }

    // Render Charts
    let channelsChart, ordersStatusChart, dailyMessagesChart;
    
    function renderCharts(channelsData, ordersData, dailyMessagesData) {
      const isDarkMode = document.body.classList.contains('dark-mode');
      const textColor = isDarkMode ? '#E0E0E0' : '#333333';
      const gridColor = isDarkMode ? '#3A3A4E' : '#D1D5DB';

      // Destroy existing charts
      if (channelsChart) channelsChart.destroy();
      if (ordersStatusChart) ordersStatusChart.destroy();
      if (dailyMessagesChart) dailyMessagesChart.destroy();

      // Channels Distribution Chart (Pie)
      const channelsCtx = document.getElementById('channelsChart');
      if (channelsCtx) {
        channelsChart = new Chart(channelsCtx, {
          type: 'doughnut',
          data: {
            labels: ['فيسبوك', 'إنستجرام', 'واتساب', 'ويب'],
            datasets: [{
              data: [channelsData.facebook, channelsData.instagram, channelsData.whatsapp, channelsData.web],
              backgroundColor: [
                '#1877F2',
                '#E4405F',
                '#25D366',
                '#0ea5e9'
              ],
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
              tooltip: {
                rtl: true,
                textDirection: 'rtl'
              }
            }
          }
        });
      }

      // Orders Status Chart (Bar)
      const ordersCtx = document.getElementById('ordersStatusChart');
      if (ordersCtx) {
        ordersStatusChart = new Chart(ordersCtx, {
          type: 'bar',
          data: {
            labels: ['قيد الانتظار', 'مكتملة', 'ملغاة'],
            datasets: [{
              label: 'عدد الطلبات',
              data: [ordersData.pending, ordersData.completed, ordersData.cancelled],
              backgroundColor: [
                '#FFA500',
                '#00C4B4',
                '#FF6B6B'
              ],
              borderWidth: 0,
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                rtl: true,
                textDirection: 'rtl'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: textColor,
                  font: { family: 'Cairo, sans-serif' }
                },
                grid: {
                  color: gridColor
                }
              },
              x: {
                ticks: {
                  color: textColor,
                  font: { family: 'Cairo, sans-serif' }
                },
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }

      // Daily Messages Chart (Line)
      const dailyCtx = document.getElementById('dailyMessagesChart');
      if (dailyCtx && dailyMessagesData.length > 0) {
        // Get last 7 days
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
              legend: {
                display: false
              },
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
                ticks: {
                  color: textColor,
                  font: { family: 'Cairo, sans-serif' }
                },
                grid: {
                  color: gridColor
                }
              },
              x: {
                ticks: {
                  color: textColor,
                  font: { family: 'Cairo, sans-serif' }
                },
                grid: {
                  color: gridColor
                }
              }
            }
          }
        });
      }
    }

    // دالة مساعدة للانتظار حتى تتعرف الدالة المطلوبة
    async function waitForFunction(funcName, maxAttempts = 100, interval = 100) {
      console.log(`waitForFunction called for ${funcName} with maxAttempts: ${maxAttempts}`);
      let attempts = 0;
      while (attempts < maxAttempts) {
        if (typeof window[funcName] === "function") {
          console.log(`${funcName} is now defined after ${attempts * interval}ms`);
          return window[funcName];
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      }
      throw new Error(`${funcName} function not found after ${maxAttempts * interval}ms. Ensure the corresponding script is loaded and the function is defined.`);
    }

    const loadPageContent = async (page) => {
      console.log(`Attempting to load page: ${page}`);
      if (!validPages.includes(page)) {
        console.warn(`⚠️ Attempted to load invalid page: ${page}, ignoring`);
        return;
      }

      const allowedInitialPage = initialHash || "overview";
      if (isInitialLoad && page !== allowedInitialPage) {
        console.warn(`⚠️ Attempted to load ${page} during initial load, allowed: ${allowedInitialPage}`);
        return;
      }

      content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
      const selectedBotId = localStorage.getItem("selectedBotId");

      loadPageCss(page);
      try {
        await loadPageJs(page);
      } catch (err) {
        console.error(`Failed to load JS for page ${page}:`, err.message);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>فشل في تحميل الصفحة: ${err.message}</p></div>`;
        return;
      }

      if (!selectedBotId && !(role === "superadmin" && page === "bots")) {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
        window.location.hash = page;
        return;
      }

      window.location.hash = page;

      try {
        switch (page) {
          case "bots":
            if (role === "superadmin") {
              const loadBotsPage = await waitForFunction("loadBotsPage");
              console.log(`Loading bots page for superadmin`);
              await loadBotsPage();
            } else {
              throw new Error("غير مصرح لك بالوصول لهذه الصفحة.");
            }
            break;
          case "rules":
            const loadRulesPage = await waitForFunction("loadRulesPage");
            console.log(`Loading rules page`);
            await loadRulesPage();
            break;
          case "chat-page":
            const loadChatPage = await waitForFunction("loadChatPage");
            console.log(`Loading chat-page`);
            await loadChatPage();
            break;
          case "store-manager":
            const loadStoreManagerPage = await waitForFunction("loadStoreManagerPage");
            console.log(`Loading store-manager page`);
            await loadStoreManagerPage();
            break;
          case "orders-center":
            const loadOrdersCenterPage = await waitForFunction("loadOrdersCenterPage");
            console.log(`Loading orders-center page`);
            await loadOrdersCenterPage();
            break;
          case "channels":
            const loadChannelsPage = await waitForFunction("loadChannelsPage");
            console.log(`Loading channels page`);
            await loadChannelsPage();
            break;
          case "facebook":
            const loadFacebookPage = await waitForFunction("loadFacebookPage");
            console.log(`Loading facebook page`);
            await loadFacebookPage();
            break;
          case "instagram":
            const loadInstagramPage = await waitForFunction("loadInstagramPage");
            console.log(`Loading instagram page`);
            await loadInstagramPage();
            break;
          case "whatsapp":
            const loadWhatsAppPage = await waitForFunction("loadWhatsAppPage");
            console.log(`Loading whatsapp page`);
            await loadWhatsAppPage();
            break;
          case "messages":
            const loadMessagesPage = await waitForFunction("loadMessagesPage");
            console.log(`Loading messages page`);
            await loadMessagesPage();
            break;
          case "feedback":
            const loadFeedbackPage = await waitForFunction("loadFeedbackPage");
            console.log(`Loading feedback page`);
            await loadFeedbackPage();
            break;
          case "wasenderpro":
            const loadWasenderProPage = await waitForFunction("loadWasenderProPage");
            console.log(`Loading wasenderpro page`);
            await loadWasenderProPage();
            break;
          case "settings":
            const loadSettingsPage = await waitForFunction("loadSettingsPage");
            console.log(`Loading settings page`);
            await loadSettingsPage();
            break;
          case "overview":
            console.log(`Loading overview page`);
            await renderOverview();
            break;
          default:
            throw new Error("الصفحة المطلوبة غير متوفرة.");
        }
      } catch (error) {
        console.error(`Error loading page ${page}:`, error.message);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
      }
    };

    // Update Sidebar Active State
    function updateSidebarActive(page) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
          item.classList.add('active');
        }
      });
    }

    // Sidebar Toggle for Mobile
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && 
          sidebar.classList.contains('active') &&
          !sidebar.contains(e.target) && 
          !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });

    // Sidebar navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        window.location.hash = page;
        // Close sidebar immediately on mobile to avoid waiting for navigation
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('active');
        }
      });
    });

    // Hide superadmin-only items for non-superadmins
    if (role !== 'superadmin') {
      document.querySelectorAll('.superadmin-only').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Debounce function
    function debounce(func, wait) {
      console.log(`debounce called with wait: ${wait}`);
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Initial Page Load
    const loadInitialPage = async () => {
      console.log("loadInitialPage called...");
      let pageToLoad = initialHash || 'overview';
      if (!validPages.includes(pageToLoad)) {
        console.log(`Loading overview as default view`);
        pageToLoad = 'overview';
        window.location.hash = 'overview';
      }
      console.log(`Loading page: ${pageToLoad}`);
      await loadPageContent(pageToLoad);
      updateSidebarActive(pageToLoad);
    };

    // Handle hash change with debounce
    const debouncedHashChange = debounce(async () => {
      const hash = window.location.hash.substring(1) || 'overview';
      if (validPages.includes(hash)) {
        console.log(`Hash changed, loading page: ${hash}`);
        await loadPageContent(hash);
        updateSidebarActive(hash);
        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('active');
        }
      } else {
        console.log(`Hash invalid, loading overview`);
        window.location.hash = 'overview';
        await loadPageContent('overview');
        updateSidebarActive('overview');
      }
    }, 100);

    window.addEventListener('hashchange', debouncedHashChange);

    // Logout
    async function logoutUser() {
      console.log("logoutUser called...");
      const username = localStorage.getItem("username");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("selectedBotId");
      localStorage.removeItem("theme");
      console.log("Logout initiated, localStorage cleared");
      window.location.href = "/login.html";

      try {
        await handleApiRequest("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }, null, "خطأ في إرسال إشعار تسجيل الخروج");
        console.log("Server logout notification sent.");
      } catch (err) {
        console.error("Error sending logout notification to server:", err);
      }
    }

    logoutBtn.addEventListener("click", logoutUser);

    // Notifications Handling
    let showAllNotifications = false;

    async function fetchNotifications() {
      console.log("fetchNotifications called...");
      try {
        const response = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('فشل في جلب الإشعارات: ' + response.statusText);
        }
        const notifications = await response.json();
        const unreadCount = notifications.filter(n => !n.isRead).length;
        notificationsCount.textContent = unreadCount;
        if (unreadCount > 0) {
          notificationsBtn.classList.add('has-unread');
        } else {
          notificationsBtn.classList.remove('has-unread');
        }

        notificationsList.innerHTML = '';
        const displayNotifications = showAllNotifications ? notifications : notifications.slice(0, 5);

        if (displayNotifications.length === 0) {
          notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
        } else {
          displayNotifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.classList.add('notification-item');
            if (!notification.isRead) {
              notificationItem.classList.add('unread');
            }
            notificationItem.innerHTML = `
              <p class="notification-title">${notification.title}</p>
              <small>${new Date(notification.createdAt).toLocaleString('ar-EG')}</small>
            `;
            notificationItem.addEventListener('click', () => {
              showNotificationModal(notification);
              if (!notification.isRead) {
                markNotificationAsRead(notification._id);
              }
            });
            notificationsList.appendChild(notificationItem);
          });

          if (!showAllNotifications && notifications.length > 5) {
            const moreButton = document.createElement('button');
            moreButton.classList.add('btn', 'btn-secondary', 'more-notifications');
            moreButton.textContent = 'عرض المزيد';
            moreButton.addEventListener('click', () => {
              showAllNotifications = true;
              fetchNotifications();
            });
            notificationsList.appendChild(moreButton);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        notificationsList.innerHTML = '<p class="no-notifications">فشل في جلب الإشعارات</p>';
      }
    }

    async function markNotificationAsRead(notificationId) {
      console.log(`markNotificationAsRead called for notificationId: ${notificationId}`);
      try {
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await fetchNotifications();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    function showNotificationModal(notification) {
      console.log("showNotificationModal called...");
      const modal = document.createElement("div");
      modal.classList.add("modal");
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>${notification.title}</h3>
            <button class="modal-close-btn"><i class="fas fa-times"></i></button>
          </div>
          <div class="notification-content">
            <p>${notification.message}</p>
            <small>${new Date(notification.createdAt).toLocaleString('ar-EG')}</small>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary modal-close-btn">إغلاق</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelectorAll(".modal-close-btn").forEach(btn => {
        btn.addEventListener("click", () => modal.remove());
      });
    }

    notificationsBtn.addEventListener("click", () => {
      console.log("notificationsBtn clicked...");
      loadNotificationsCss();
      notificationsModal.style.display = 'block';
      showAllNotifications = false;
      fetchNotifications();
    });

    closeNotificationsBtn.addEventListener("click", () => {
      console.log("closeNotificationsBtn clicked...");
      notificationsModal.style.display = 'none';
    });

    // Assistant Bot
    const assistantButton = document.getElementById("assistantButton");
    if (assistantButton) {
      assistantButton.addEventListener("click", loadAssistantCss);
      console.log("Assistant button found.");
    } else {
      console.warn("Assistant button element not found.");
    }

    // Initialize
    console.log("Initializing dashboard...");
    await fetchNotifications();
    await populateBotSelect();
  });

  // Simple JWT decode function
  function jwtDecode(token) {
    console.log("jwtDecode called...");
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      throw new Error('Invalid token');
    }
  }

  console.log("dashboard_new.js finished loading at", new Date().toISOString());
} catch (error) {
  console.error("Error in dashboard_new.js:", error.message);
}
