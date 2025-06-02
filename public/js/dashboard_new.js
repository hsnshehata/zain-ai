// public/js/dashboard_new.js

try {
  console.log("dashboard_new.js started loading at", new Date().toISOString());

  document.addEventListener("DOMContentLoaded", async () => {
    // Global variable to store available bots
    let availableBots = [];
    let isInitialLoad = true; // Flag to control initial load

    // Valid pages to prevent unexpected page loads
    const validPages = ['bots', 'rules', 'chat-page', 'analytics', 'messages', 'feedback', 'facebook', 'instagram', 'whatsapp', 'settings'];

    // Pages configuration for dashboard cards
    const pages = [
      { id: 'bots', name: 'إدارة البوتات', icon: 'fas fa-robot', description: 'تحكم في إنشاء وتعديل البوتات الخاصة بك', role: 'superadmin' },
      { id: 'rules', name: 'القواعد', icon: 'fas fa-book', description: 'إضافة وتعديل قواعد الردود التلقائية' },
      { id: 'chat-page', name: 'صفحة الدردشة', icon: 'fas fa-comment-alt', description: 'تخصيص واجهة الدردشة' },
      { id: 'facebook', name: 'فيسبوك', icon: 'fab fa-facebook', description: 'ربط وإدارة حساب فيسبوك' },
      { id: 'instagram', name: 'إنستجرام', icon: 'fab fa-instagram', description: 'ربط وإدارة حساب إنستجرام' },
      { id: 'whatsapp', name: 'واتساب', icon: 'fab fa-whatsapp', description: 'ربط وإدارة حساب واتساب' },
      { id: 'messages', name: 'الرسائل', icon: 'fas fa-envelope', description: 'مراجعة محادثات المستخدمين' },
      { id: 'feedback', name: 'التقييمات', icon: 'fas fa-comments', description: 'رؤية تقييمات المستخدمين' },
      { id: 'settings', name: 'الإعدادات', icon: 'fas fa-cog', description: 'إدارة إعدادات الحساب' },
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
    const homeBtn = document.getElementById("home-btn");

    // Map of pages to their respective CSS files
    const pageCssMap = {
      bots: "/css/bots.css",
      rules: "/css/rules.css",
      "chat-page": "/css/chatPage.css",
      messages: "/css/messages.css",
      feedback: "/css/feedback.css",
      facebook: "/css/facebook.css",
      instagram: "/css/facebook.css",
      whatsapp: "/css/facebook.css",
      settings: "/css/settings.css",
    };

    // Map of pages to their respective JS files
    const pageJsMap = {
      bots: "/js/bots.js",
      rules: "/js/rules.js",
      "chat-page": "/js/chatPage.js",
      messages: "/js/messages.js",
      feedback: "/js/feedback.js",
      facebook: "/js/facebook.js",
      instagram: "/js/instagram.js",
      whatsapp: "/js/whatsapp.js",
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
      let funcName = page === 'chat-page' ? 'loadChatPage' : `load${page.charAt(0).toUpperCase() + page.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Page`;
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

    // Render Dashboard Cards
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
        card.innerHTML = `
          <i class="${page.icon}"></i>
          <h3>${page.name}</h3>
          <p>${page.description}</p>
          <button class="btn btn-primary" onclick="window.location.hash='${page.id}'">الذهاب إلى الصفحة</button>
        `;
        container.appendChild(card);
      });
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

      if (isInitialLoad && page !== (role === "superadmin" ? "bots" : "rules")) {
        console.warn(`⚠️ Attempted to load ${page} during initial load, ignoring`);
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
          case "analytics":
            const loadAnalyticsPage = await waitForFunction("loadAnalyticsPage");
            console.log(`Loading analytics page`);
            try {
              await loadAnalyticsPage();
            } catch (analyticsErr) {
              console.error('Error executing loadAnalyticsPage:', analyticsErr);
              throw new Error(`Failed to load analytics page: ${analyticsErr.message}`);
            }
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
          case "settings":
            const loadSettingsPage = await waitForFunction("loadSettingsPage");
            console.log(`Loading settings page`);
            await loadSettingsPage();
            break;
          default:
            throw new Error("الصفحة المطلوبة غير متوفرة.");
        }
      } catch (error) {
        console.error(`Error loading page ${page}:`, error.message);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
      }
    };

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
      let pageToLoad = initialHash || '';
      if (!validPages.includes(pageToLoad)) {
        console.log(`Loading dashboard cards as default view`);
        renderDashboardCards();
        window.location.hash = '';
      } else {
        console.log(`Loading page: ${pageToLoad}`);
        await loadPageContent(pageToLoad);
      }
    };

    // Handle hash change with debounce
    const debouncedHashChange = debounce(async () => {
      const hash = window.location.hash.substring(1);
      if (hash && validPages.includes(hash)) {
        console.log(`Hash changed, loading page: ${hash}`);
        await loadPageContent(hash);
      } else {
        console.log(`Hash empty or invalid, loading dashboard cards`);
        renderDashboardCards();
        window.location.hash = '';
      }
    }, 100);

    window.addEventListener('hashchange', debouncedHashChange);

    // Home Button Event
    homeBtn.addEventListener("click", () => {
      console.log("Home button clicked...");
      window.location.hash = '';
      renderDashboardCards();
    });

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
