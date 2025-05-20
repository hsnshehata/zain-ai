// public/js/dashboard_new.js

document.addEventListener("DOMContentLoaded", async () => {
  // Global variable to store available bots
  let availableBots = [];
  let isInitialLoad = true; // Flag to control initial page load

  // Valid pages to prevent unexpected page loads
  const validPages = ['bots', 'rules', 'chat-page', 'analytics', 'messages', 'feedback', 'facebook', 'instagram', 'settings'];

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
    await loadUsername();
    await loadBotInfo();
  }

  const content = document.getElementById("content");
  const botSelect = document.getElementById("botSelectDashboard");
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const mobileNavItems = document.querySelectorAll(".mobile-nav-bottom .nav-item-mobile");
  const logoutBtn = document.querySelector(".sidebar-footer .logout-btn");
  const mobileLogoutBtn = document.querySelector(".mobile-nav-bottom .logout-btn");
  const themeToggleButton = document.getElementById("theme-toggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");
  const mobileNav = document.querySelector(".mobile-nav-bottom");
  const mobileNavToggle = document.getElementById("mobile-nav-toggle");
  const mainContent = document.querySelector(".main-content");
  const notificationsBtn = document.getElementById("notifications-btn");
  const notificationsModal = document.getElementById("notifications-modal");
  const notificationsList = document.getElementById("notifications-list");
  const notificationsCount = document.getElementById("notifications-count");
  const closeNotificationsBtn = document.getElementById("close-notifications-btn");
  const settingsBtn = document.getElementById("settings-btn");

  // Map of pages to their respective CSS files
  const pageCssMap = {
    bots: "/css/bots.css",
    rules: "/css/rules.css",
    "chat-page": "/css/chatPage.css",
    analytics: "/css/analytics.css",
    messages: "/css/messages.css",
    feedback: "/css/feedback.css",
    facebook: "/css/facebook.css",
    instagram: "/css/facebook.css", // نستخدم نفس ستايل facebook.css
    settings: "/css/settings.css",
  };

  // Map of pages to their respective JS files
  const pageJsMap = {
    bots: "/js/bots.js",
    rules: "/js/rules.js",
    "chat-page": "/js/chatPage.js",
    analytics: "/js/analytics.js",
    messages: "/js/messages.js",
    feedback: "/js/feedback.js",
    facebook: "/js/facebook.js",
    instagram: "/js/instagram.js",
    settings: "/js/settings.js",
  };

  // Load CSS dynamically
  function loadPageCss(page) {
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
    if (!pageJsMap[page]) return;

    // Check if the script is already loaded
    let script = document.querySelector(`script[src="${pageJsMap[page]}"]`);
    if (!script) {
      console.log(`Loading script for page ${page}: ${pageJsMap[page]}`);
      script = document.createElement("script");
      script.src = pageJsMap[page];
      script.async = true;
      document.body.appendChild(script);

      // Wait for the script to load
      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log(`${pageJsMap[page]} loaded successfully`);
          resolve();
        };
        script.onerror = () => {
          console.error(`Failed to load script ${pageJsMap[page]}`);
          reject(new Error(`Failed to load script ${pageJsMap[page]}`));
        };
      });
    } else {
      console.log(`${pageJsMap[page]} already loaded`);
    }

    // Additional check to see if the function is defined after loading
    const funcName = `load${page.charAt(0).toUpperCase() + page.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Page`;
    if (typeof window[funcName] !== "function") {
      console.error(`${funcName} still not defined after loading ${pageJsMap[page]}`);
    } else {
      console.log(`${funcName} is now available after loading ${pageJsMap[page]}`);
    }
  }

  // Load assistantBot.css when assistant modal is shown
  function loadAssistantCss() {
    if (!document.querySelector('link[href="/css/assistantBot.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/css/assistantBot.css";
      document.head.appendChild(link);
    }
  }

  // Load notifications.css
  function loadNotificationsCss() {
    if (!document.querySelector('link[href="/css/notifications.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/css/notifications.css";
      document.head.appendChild(link);
    }
  }

  // Theme Handling
  const applyTheme = (theme) => {
    if (theme === "light") {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
    }
    localStorage.setItem("theme", theme);
  };

  const currentTheme = localStorage.getItem("theme") || "dark";
  applyTheme(currentTheme);

  themeToggleButton.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(newTheme);
  });

  // Sidebar Toggle for Desktop
  sidebarToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("collapsed");
  });

  // Mobile Navigation Toggle
  if (mobileNavToggle) {
    mobileNavToggle.addEventListener("click", () => {
      mobileNav.classList
