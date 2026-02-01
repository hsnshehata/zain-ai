// /public/js/dashboard_new.js
try {
  console.log("dashboard_new.js started loading at", new Date().toISOString());

  document.addEventListener("DOMContentLoaded", async () => {
    // الحالة العامة للوحة التحكم
    let availableBots = [];
    let isInitialLoad = true;
    let currentPage = 'overview';
    let navToken = 0; // يزيد مع كل تنقل لإلغاء التحميلات القديمة
    let suppressHashChange = false;

    // الصفحات المسموح بها
    const validPages = ['overview', 'bots', 'rules', 'chat-page', 'store-manager', 'orders-center', 'channels', 'facebook', 'instagram', 'whatsapp', 'messages', 'feedback', 'wasenderpro', 'settings'];

    // كروت الداشبورد
    const pages = [
      { id: 'bots', name: 'إدارة البوتات', icon: 'fas fa-robot', description: 'تحكم في إنشاء وتعديل البوتات الخاصة بك', role: 'superadmin' },
      { id: 'rules', name: 'القواعد', icon: 'fas fa-book', description: 'إضافة وتعديل قواعد الردود التلقائية' },
      { id: 'chat-page', name: 'واجهة الدردشة', icon: 'fas fa-comment-alt', description: 'تخصيص واجهة الدردشة' },
      { id: 'store-manager', name: 'المتجر الذكي', icon: 'fas fa-store', description: 'إدارة متجرك الذكي ومنتجاتك' },
      { id: 'orders-center', name: 'متابعة الطلبات', icon: 'fas fa-clipboard-list', description: 'عرض طلبات المتجر والمحادثات في مكان واحد' },
      { id: 'channels', name: 'القنوات', icon: 'fas fa-random', description: 'إدارة قنوات الربط المختلفة' },
      { id: 'facebook', name: 'فيسبوك', icon: 'fab fa-facebook', description: 'ربط وإدارة حساب فيسبوك' },
      { id: 'instagram', name: 'إنستجرام', icon: 'fab fa-instagram', description: 'ربط وإدارة حساب إنستجرام' },
      { id: 'whatsapp', name: 'واتساب', icon: 'fab fa-whatsapp', description: 'ربط وإدارة حساب واتساب' },
      { id: 'messages', name: 'الرسائل', icon: 'fas fa-envelope', description: 'مراجعة محادثات المستخدمين' },
      { id: 'feedback', name: 'التقييمات', icon: 'fas fa-comments', description: 'رؤية تقييمات المستخدمين' },
      { id: 'wasenderpro', name: 'Wasender Pro', icon: 'fas fa-bolt', description: 'مجاني طوال فترة الاشتراك' },
      { id: 'settings', name: 'الإعدادات', icon: 'fas fa-cog', description: 'إدارة إعدادات الحساب' }
    ];

    // التوكن القادم من الـ URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      try {
        const decoded = jwtDecode(tokenFromUrl);
        localStorage.setItem('token', tokenFromUrl);
        localStorage.setItem('userId', decoded.userId);
        localStorage.setItem('role', decoded.role);
        localStorage.setItem('username', decoded.username);
        console.log('✅ Token from URL stored in localStorage:', decoded);
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

    if (!token || !userId) {
      console.warn('⚠️ No token or userId found in localStorage, redirecting to login');
      localStorage.clear();
      if (window.location.pathname !== "/login.html") {
        window.location.href = "/login.html";
      }
      return;
    }

    // تهيئة الدوال المساعدة
    const content = document.getElementById("content");
    const botSelect = document.getElementById("botSelectDashboard");
    const logoutBtn = document.querySelector(".logout-btn");
    const themeToggleButton = document.getElementById("theme-toggle");
    const notificationsBtn = document.getElementById("notifications-btn");
    const notificationsModal = document.getElementById("notifications-modal");
    const notificationsList = document.getElementById("notifications-list");
    const notificationsCount = document.getElementById("notifications-count");
    const closeNotificationsBtn = document.getElementById("close-notifications-btn");
    const homeBtn = document.getElementById("home-btn");
    const initialHash = window.location.hash.substring(1);

    // الخرائط الخاصة بالـ CSS والـ JS
    const pageCssMap = {
      bots: "/css/bots.css",
      rules: "/css/rules.css",
      "chat-page": "/css/chatPage.css",
      "store-manager": "/css/storeManager.css",
      "orders-center": "/css/orders.css",
      channels: "/css/channels.css",
      facebook: "/css/facebook.css",
      instagram: "/css/facebook.css",
      whatsapp: "/css/facebook.css",
      messages: "/css/messages.css",
      feedback: "/css/feedback.css",
      wasenderpro: "/css/facebook.css",
      settings: "/css/settings.css",
      overview: "/css/dashboard.css"
    };

    const pageJsMap = {
      overview: "/js/overview.js",
      bots: "/js/bots.js",
      rules: "/js/rules.js",
      "chat-page": "/js/chatPage.js",
      "store-manager": "/js/store-dashboard/main.js",
      "orders-center": "/js/orders-center.js",
      channels: "/js/channels.js",
      facebook: "/js/facebook.js",
      instagram: "/js/instagram.js",
      whatsapp: "/js/whatsapp.js",
      messages: "/js/messages.js",
      feedback: "/js/feedback.js",
      wasenderpro: "/js/wasenderpro.js",
      settings: "/js/settings.js"
    };

    const loadedScripts = new Map();

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

    async function loadPageJs(page) {
      console.log(`loadPageJs called for page: ${page} at`, new Date().toISOString());
      if (!pageJsMap[page]) return;

      if (loadedScripts.has(pageJsMap[page])) {
        console.log(`${pageJsMap[page]} already loaded from cache at`, new Date().toISOString());
        return;
      }

      let script = document.querySelector(`script[src="${pageJsMap[page]}"]`);
      if (!script) {
        console.log(`Loading script for page ${page}: ${pageJsMap[page]}`);
        script = document.createElement("script");
        script.src = pageJsMap[page];
        script.async = false;
        document.body.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log(`${pageJsMap[page]} loaded successfully at`, new Date().toISOString());
            loadedScripts.set(pageJsMap[page], true);
            setTimeout(resolve, 50);
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
    }

    function loadAssistantCss() {
      console.log("loadAssistantCss called...");
      if (!document.querySelector('link[href="/css/assistantBot.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/css/assistantBot.css";
        document.head.appendChild(link);
      }
    }

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
        const themeIcon = themeToggleButton.querySelector('i');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      } else {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
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

    // ربط السياق العام لاستخدامه من overview.js
    const dashboardCtx = {
      getNavToken: () => navToken,
      getRole: () => role,
      getToken: () => token,
      getUserId: () => userId,
      getAvailableBots: () => availableBots,
      setAvailableBots: (bots) => { availableBots = bots; }
    };
    window.dashboardCtx = dashboardCtx;

    // تحميل اسم المستخدم
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

    // بيانات البوت
    async function loadBotInfo() {
      console.log("loadBotInfo called...");
      const subscriptionTypeEl = document.getElementById("subscription-type");
      const subscriptionEndEl = document.getElementById("subscription-end");
      const remainingDaysEl = document.getElementById("remaining-days");

      const selectedBotId = localStorage.getItem("selectedBotId");
      if (!selectedBotId) {
        subscriptionTypeEl.textContent = 'يرجى اختيار بوت';
        subscriptionEndEl.textContent = 'يرجى اختيار بوت';
        remainingDaysEl.textContent = 'يرجى اختيار بوت';
        return;
      }

      try {
        const bot = availableBots.find(bot => String(bot._id) === String(selectedBotId));
        if (!bot) {
          localStorage.removeItem("selectedBotId");
          subscriptionTypeEl.textContent = 'يرجى اختيار بوت';
          subscriptionEndEl.textContent = 'يرجى اختيار بوت';
          remainingDaysEl.textContent = 'يرجى اختيار بوت';
          return;
        }

        const subscriptionTypes = { free: 'مجاني', monthly: 'شهري', yearly: 'سنوي' };
        subscriptionTypeEl.textContent = subscriptionTypes[bot.subscriptionType] || 'غير معروف';

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
        localStorage.removeItem("selectedBotId");
      }
    }

    async function loadWelcomeBar() {
      console.log("loadWelcomeBar called...");
      await loadUsername();
      await loadBotInfo();
    }

    // البطاقات
    function renderDashboardCards() {
      console.log("renderDashboardCards called...");
      content.innerHTML = '<div class="dashboard-cards-container"></div>';
      const container = content.querySelector('.dashboard-cards-container');
      const filteredPages = pages.filter(page => !page.role || page.role === role);
      filteredPages.forEach((page, index) => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        card.style.setProperty('--index', index);
        card.dataset.tooltip = page.description;
        card.dataset.page = page.id;
        card.innerHTML = `
          <i class="${page.icon}"></i>
          <h3>${page.name}</h3>
          <p>${page.description}</p>
        `;
        card.addEventListener('click', () => {
          window.location.hash = page.id;
        });
        container.appendChild(card);
      });
    }

    // انتظار توفر الدوال
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

    // إخفاء العناصر الخاصة بالسوبر أدمن للمستخدم العادي
    if (role !== 'superadmin') {
      document.querySelectorAll('.superadmin-only, [data-role="superadmin"], .nav-item[data-page="bots"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    const updateSidebarActive = (page) => {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
          item.classList.add('active');
        }
      });
    };

    const loadPageContent = async (page) => {
      console.log(`Attempting to load page: ${page}`);
      if (!validPages.includes(page)) {
        console.warn(`⚠️ Attempted to load invalid page: ${page}, ignoring`);
        return;
      }

      if (page === 'bots' && role !== 'superadmin') {
        console.warn('User not authorized for bots page, redirecting to overview');
        suppressHashChange = true;
        window.location.hash = 'overview';
        setTimeout(() => { suppressHashChange = false; }, 50);
        await loadPageContent('overview');
        return;
      }

      const thisNav = ++navToken;
      currentPage = page;
      updateSidebarActive(page);

      const selectedBotId = localStorage.getItem("selectedBotId");
      content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;

      loadPageCss(page);
      try {
        await loadPageJs(page);
        if (thisNav !== navToken) {
          console.warn(`Stale navigation for ${page}, aborting after JS load`);
          return;
        }
      } catch (err) {
        console.error(`Failed to load JS for page ${page}:`, err.message);
        if (thisNav !== navToken) return;
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>فشل في تحميل الصفحة: ${err.message}</p></div>`;
        return;
      }

      if (!selectedBotId && !(role === "superadmin" && page === "bots")) {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
        if (window.location.hash.substring(1) !== page) {
          suppressHashChange = true;
          window.location.hash = page;
          setTimeout(() => { suppressHashChange = false; }, 50);
        }
        return;
      }

      if (window.location.hash.substring(1) !== page) {
        suppressHashChange = true;
        window.location.hash = page;
        setTimeout(() => { suppressHashChange = false; }, 50);
      }

      try {
        if (thisNav !== navToken) {
          console.warn(`Stale navigation for ${page}, aborting before render`);
          return;
        }

        switch (page) {
          case "overview": {
            const loadOverviewPage = await waitForFunction("loadOverviewPage");
            console.log(`Loading overview page`);
            await loadOverviewPage(thisNav);
            break;
          }
          case "bots": {
            if (role === "superadmin") {
              const loadBotsPage = await waitForFunction("loadBotsPage");
              console.log(`Loading bots page for superadmin`);
              await loadBotsPage();
            } else {
              throw new Error("غير مصرح لك بالوصول لهذه الصفحة.");
            }
            break;
          }
          case "rules": {
            const loadRulesPage = await waitForFunction("loadRulesPage");
            console.log(`Loading rules page`);
            await loadRulesPage();
            break;
          }
          case "chat-page": {
            const loadChatPage = await waitForFunction("loadChatPage");
            console.log(`Loading chat-page`);
            await loadChatPage();
            break;
          }
          case "store-manager": {
            const loadStoreManagerPage = await waitForFunction("loadStoreManagerPage");
            console.log(`Loading store-manager page`);
            await loadStoreManagerPage();
            break;
          }
          case "orders-center": {
            const loadOrdersCenterPage = await waitForFunction("loadOrdersCenterPage");
            console.log(`Loading orders-center page`);
            await loadOrdersCenterPage();
            break;
          }
          case "channels": {
            const loadChannelsPage = await waitForFunction("loadChannelsPage");
            console.log(`Loading channels page`);
            await loadChannelsPage();
            break;
          }
          case "facebook": {
            const loadFacebookPage = await waitForFunction("loadFacebookPage");
            console.log(`Loading facebook page`);
            await loadFacebookPage();
            break;
          }
          case "instagram": {
            const loadInstagramPage = await waitForFunction("loadInstagramPage");
            console.log(`Loading instagram page`);
            await loadInstagramPage();
            break;
          }
          case "whatsapp": {
            const loadWhatsAppPage = await waitForFunction("loadWhatsAppPage");
            console.log(`Loading whatsapp page`);
            await loadWhatsAppPage();
            break;
          }
          case "messages": {
            const loadMessagesPage = await waitForFunction("loadMessagesPage");
            console.log(`Loading messages page`);
            await loadMessagesPage();
            break;
          }
          case "feedback": {
            const loadFeedbackPage = await waitForFunction("loadFeedbackPage");
            console.log(`Loading feedback page`);
            await loadFeedbackPage();
            break;
          }
          case "wasenderpro": {
            const loadWasenderProPage = await waitForFunction("loadWasenderProPage");
            console.log(`Loading wasenderpro page`);
            await loadWasenderProPage();
            break;
          }
          case "settings": {
            const loadSettingsPage = await waitForFunction("loadSettingsPage");
            console.log(`Loading settings page`);
            await loadSettingsPage();
            break;
          }
          default:
            throw new Error("الصفحة المطلوبة غير متوفرة.");
        }
      } catch (error) {
        console.error(`Error loading page ${page}:`, error.message);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
      }
    };

    // Debounce
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

    const loadInitialPage = async () => {
      console.log("loadInitialPage called...");
      isInitialLoad = false;
      const hashNow = window.location.hash.substring(1);
      let pageToLoad = hashNow || initialHash || 'overview';
      if (!validPages.includes(pageToLoad)) {
        console.log(`Hash/initial invalid, fallback to overview`);
        pageToLoad = 'overview';
        window.location.hash = 'overview';
      }
      console.log(`Loading page: ${pageToLoad}`);
      suppressHashChange = true;
      await loadPageContent(pageToLoad);
      setTimeout(() => { suppressHashChange = false; }, 50);
    };

    const debouncedHashChange = debounce(async () => {
      if (suppressHashChange) return;
      const hash = window.location.hash.substring(1) || 'overview';
      if (validPages.includes(hash)) {
        console.log(`Hash changed, loading page: ${hash}`);
        await loadPageContent(hash);
      } else {
        console.log(`Hash invalid, loading overview`);
        window.location.hash = 'overview';
        await loadPageContent('overview');
      }
    }, 150);

    window.addEventListener('hashchange', debouncedHashChange);

    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        console.log("Home button clicked...");
        window.location.hash = '';
        renderDashboardCards();
      });
    }

    // تسجيل الخروج
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

    // إتاحة الدالة على المستوى العام لضمان عملها مع handleApiRequest في كل الصفحات
    window.logoutUser = logoutUser;

    if (logoutBtn) {
      logoutBtn.addEventListener("click", logoutUser);
    }

    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    const collapseMobileSidebar = () => {
      if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    };

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

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          sidebar && sidebar.classList.contains('active') &&
          !sidebar.contains(e.target) &&
          mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
        collapseMobileSidebar();
      }
    });

    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        const navLink = e.target.closest('a');
        if (!navLink) return;
        // أغلق القائمة مباشرة بعد الضغط على رابط أثناء العرض على الجوال
        collapseMobileSidebar();
      });
    }

    // الإشعارات
    let showAllNotifications = false;
    let notificationFilter = 'all';
    let notificationsCache = [];
    const seenNotificationIds = new Set(JSON.parse(localStorage.getItem('nc_seen_ids') || '[]'));

    const notificationFilters = Array.from(document.querySelectorAll('.nc-filter'));
    const markAllBtn = document.getElementById('nc-mark-all');

    // حاوية التوست الحديث
    const toastContainer = document.createElement('div');
    toastContainer.className = 'nc-toast-container';
    document.body.appendChild(toastContainer);

    const classifyType = (notification) => {
      const raw = (notification.type || '').toLowerCase();
      if (raw) return raw;
      const text = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();
      if (/طلب|اوردر|order|شحن|تسليم|دفع/.test(text)) return 'orders';
      if (/تنبيه|تحذير|alert|مشكلة|خطأ|fail|error/.test(text)) return 'alerts';
      if (/نظام|system|تحديث|صيانة|cron|server/.test(text)) return 'system';
      return 'general';
    };

    const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' });

    const renderNotifications = (withToasts = false) => {
      notificationsList.innerHTML = '';
      const filtered = notificationsCache.filter((n) => {
        if (notificationFilter === 'unread') return !n.isRead;
        if (notificationFilter === 'system') return classifyType(n) === 'system';
        if (notificationFilter === 'orders') return classifyType(n) === 'orders';
        if (notificationFilter === 'alerts') return classifyType(n) === 'alerts';
        return true;
      });

      const displayNotifications = showAllNotifications ? filtered : filtered.slice(0, 10);

      if (displayNotifications.length === 0) {
        notificationsList.innerHTML = '<div class="nc-empty">لا توجد إشعارات تطابق الفلتر الحالي.</div>';
      } else {
        displayNotifications.forEach((notification) => {
          const type = classifyType(notification);
          const item = document.createElement('div');
          item.className = `nc-item ${notification.isRead ? '' : 'unread'}`;
          item.innerHTML = `
            <div class="nc-item-header">
              <span class="pill pill-${type}">${type === 'orders' ? 'طلبات' : type === 'alerts' ? 'تنبيه' : type === 'system' ? 'نظام' : 'عام'}</span>
              <span class="nc-time">${formatDateTime(notification.createdAt)}</span>
            </div>
            <div class="nc-item-body">
              <p class="nc-title">${notification.title || 'بدون عنوان'}</p>
              <p class="nc-message">${notification.message || ''}</p>
            </div>
            <div class="nc-item-actions">
              ${notification.isRead ? '<span class="nc-status read">مقروء</span>' : '<span class="nc-status unread">غير مقروء</span>'}
              <div class="nc-buttons">
                <button class="btn-ghost" data-action="open">عرض التفاصيل</button>
                ${notification.isRead ? '' : '<button class="btn-ghost" data-action="mark">تحديد كمقروء</button>'}
              </div>
            </div>
          `;

          item.querySelector('[data-action="open"]').addEventListener('click', (e) => {
            e.stopPropagation();
            showNotificationModal(notification);
            if (!notification.isRead) {
              markNotificationAsRead(notification._id, false);
            }
          });

          const markBtn = item.querySelector('[data-action="mark"]');
          if (markBtn) {
            markBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              await markNotificationAsRead(notification._id, true);
            });
          }

          item.addEventListener('click', () => {
            showNotificationModal(notification);
            if (!notification.isRead) {
              markNotificationAsRead(notification._id, false);
            }
          });

          notificationsList.appendChild(item);
        });

        if (!showAllNotifications && filtered.length > displayNotifications.length) {
          const moreButton = document.createElement('button');
          moreButton.classList.add('btn', 'btn-secondary', 'more-notifications');
          moreButton.textContent = 'عرض المزيد';
          moreButton.addEventListener('click', () => {
            showAllNotifications = true;
            renderNotifications();
          });
          notificationsList.appendChild(moreButton);
        }
      }

      if (withToasts && notificationsModal.style.display === 'none') {
        const newOnes = notificationsCache.filter((n) => !n.isRead && !seenNotificationIds.has(n._id)).slice(0, 3);
        newOnes.forEach((n) => {
          seenNotificationIds.add(n._id);
          showToast(n);
        });
        localStorage.setItem('nc_seen_ids', JSON.stringify(Array.from(seenNotificationIds)));
      }
    };

    async function fetchNotifications(withToasts = true) {
      console.log("fetchNotifications called...");
      try {
        const response = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('فشل في جلب الإشعارات: ' + response.statusText);
        }
        notificationsCache = await response.json();
        const unreadCount = notificationsCache.filter(n => !n.isRead).length;
        notificationsCount.textContent = unreadCount;
        if (unreadCount > 0) {
          notificationsBtn.classList.add('has-unread');
        } else {
          notificationsBtn.classList.remove('has-unread');
        }
        renderNotifications(withToasts);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        notificationsList.innerHTML = '<p class="no-notifications">فشل في جلب الإشعارات</p>';
      }
    }

    async function markNotificationAsRead(notificationId, reRender = true) {
      console.log(`markNotificationAsRead called for notificationId: ${notificationId}`);
      try {
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        notificationsCache = notificationsCache.map((n) => n._id === notificationId ? { ...n, isRead: true } : n);
        const unreadCount = notificationsCache.filter(n => !n.isRead).length;
        notificationsCount.textContent = unreadCount;
        if (unreadCount > 0) {
          notificationsBtn.classList.add('has-unread');
        } else {
          notificationsBtn.classList.remove('has-unread');
        }
        if (reRender) renderNotifications(false);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    async function markAllAsRead() {
      const unreadIds = notificationsCache.filter(n => !n.isRead).map(n => n._id);
      if (!unreadIds.length) return;
      await Promise.all(unreadIds.map((id) => markNotificationAsRead(id, false)));
      renderNotifications(false);
    }

    function showNotificationModal(notification) {
      console.log("showNotificationModal called...");
      const type = classifyType(notification);
      const modal = document.createElement("div");
      modal.classList.add("modal", "nc-detail-modal");
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <span class="pill pill-${type}">${type === 'orders' ? 'طلبات' : type === 'alerts' ? 'تنبيه' : type === 'system' ? 'نظام' : 'عام'}</span>
              <h3>${notification.title}</h3>
            </div>
            <button class="modal-close-btn"><i class="fas fa-times"></i></button>
          </div>
          <div class="notification-content">
            <p>${notification.message}</p>
            <small>${formatDateTime(notification.createdAt)}</small>
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

    function showToast(notification) {
      const type = classifyType(notification);
      const toast = document.createElement('div');
      toast.className = `nc-toast pill-${type}`;
      toast.innerHTML = `
        <div class="nc-toast-icon"><i class="fas fa-bell"></i></div>
        <div class="nc-toast-body">
          <p class="nc-toast-title">${notification.title || 'إشعار جديد'}</p>
          <p class="nc-toast-message">${notification.message || ''}</p>
        </div>
        <button class="btn-icon nc-toast-close" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      `;
      toast.querySelector('.nc-toast-close').addEventListener('click', () => toast.remove());
      toast.addEventListener('click', () => {
        toast.remove();
        showNotificationModal(notification);
      });
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 7000);
    }

    notificationFilters.forEach((btn) => {
      btn.addEventListener('click', () => {
        notificationFilters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        notificationFilter = btn.dataset.filter;
        showAllNotifications = false;
        renderNotifications(false);
      });
    });

    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        markAllAsRead();
      });
    }

    const positionNotificationPanel = () => {
      const panel = notificationsModal?.querySelector('.nc-panel');
      if (!panel || !notificationsBtn) return;
      const rect = notificationsBtn.getBoundingClientRect();
      const top = rect.bottom + 12; // ثابت بالنسبة للواجهة
      const left = rect.left; // افتح من نفس جهة الزر
      notificationsModal.style.setProperty('--nc-top', `${top}px`);
      notificationsModal.style.setProperty('--nc-left', `${left}px`);
    };

    const openNotificationCenter = () => {
      console.log("notificationsBtn clicked...");
      loadNotificationsCss();
      positionNotificationPanel();
      notificationsModal.style.display = 'block';
      requestAnimationFrame(() => notificationsModal.classList.add('open'));
      showAllNotifications = false;
      fetchNotifications(false);
    };

    const closeNotificationCenter = () => {
      notificationsModal.classList.remove('open');
      setTimeout(() => {
        notificationsModal.style.display = 'none';
      }, 200);
    };

    notificationsBtn.addEventListener("click", () => {
      if (notificationsModal.style.display === 'block') {
        closeNotificationCenter();
      } else {
        openNotificationCenter();
      }
    });

    closeNotificationsBtn.addEventListener("click", () => {
      console.log("closeNotificationsBtn clicked...");
      closeNotificationCenter();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && notificationsModal.style.display === 'block') {
        closeNotificationCenter();
      }
    });

    window.addEventListener('resize', () => {
      if (notificationsModal.style.display === 'block') {
        positionNotificationPanel();
      }
    });

    // لا نعيد التموضع أثناء التمرير لتجنب انزلاق الدرج مع النافبار

    // Assistant Bot
    const assistantButton = document.getElementById("assistantButton");
    if (assistantButton) {
      assistantButton.addEventListener("click", loadAssistantCss);
      console.log("Assistant button found.");
    } else {
      console.warn("Assistant button element not found.");
    }

    // اختيار البوت
    async function populateBotSelect() {
      console.log("populateBotSelect called...");
      try {
        content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
        const bots = await handleApiRequest("/api/bots", {
          headers: { Authorization: `Bearer ${token}` },
        }, content, "فشل في جلب البوتات");

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
          dashboardCtx.setAvailableBots([]);
          await loadWelcomeBar();
          return;
        }

        availableBots = userBots;
        dashboardCtx.setAvailableBots(userBots);
        userBots.forEach((bot) => {
          botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
        });

        const selectedBotId = localStorage.getItem("selectedBotId");
        if (selectedBotId && userBots.some(bot => String(bot._id) === String(selectedBotId))) {
          botSelect.value = selectedBotId;
        } else {
          localStorage.removeItem("selectedBotId");
          botSelect.value = userBots[0]._id;
          localStorage.setItem("selectedBotId", userBots[0]._id);
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
        dashboardCtx.setAvailableBots([]);
        await loadWelcomeBar();
        isInitialLoad = false;
      }
    }

    botSelect.addEventListener("change", async () => {
      console.log("botSelect change event triggered...");
      const selectedBotId = botSelect.value;
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

    // بدء التشغيل
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
