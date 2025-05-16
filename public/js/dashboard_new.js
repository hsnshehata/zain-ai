document.addEventListener("DOMContentLoaded", async () => {
  // Global variable to store available bots
  let availableBots = [];
  let isInitialLoad = true; // Flag to control initial page load

  // Valid pages to prevent unexpected page loads
  const validPages = ['bots', 'rules', 'chat-page', 'analytics', 'messages', 'feedback', 'facebook', 'instagram', 'settings'];

  const content = document.getElementById("content");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const themeToggle = document.getElementById("theme-toggle");
  const notificationsBtn = document.getElementById("notifications-btn");
  const notificationsModal = document.getElementById("notifications-modal");
  const closeNotifications = document.getElementById("close-notifications");
  const notificationsList = document.getElementById("notifications-list");
  const notificationsCount = document.getElementById("notifications-count");
  const botSelect = document.getElementById("botSelectDashboard");
  const welcomeUsername = document.getElementById("welcome-username");
  const subscriptionType = document.getElementById("subscription-type");
  const subscriptionEnd = document.getElementById("subscription-end");
  const remainingDays = document.getElementById("remaining-days");
  const logoutBtn = document.getElementById("logout-btn");
  const logoutBtnMobile = document.getElementById("logout-btn-mobile");
  const settingsBtn = document.getElementById("settings-btn");
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // Map of pages to their respective CSS files
  const pageCssMap = {
    bots: "/css/bots.css",
    rules: "/css/rules.css",
    "chat-page": "/css/chatPage.css",
    analytics: "/css/analytics.css",
    messages: "/css/messages.css",
    feedback: "/css/feedback.css",
    facebook: "/css/facebook.css",
    instagram: "/css/instagram.css",
    settings: "/css/settings.css",
  };

  // Theme Handling
  const applyTheme = () => {
    const isDarkMode = localStorage.getItem("theme") !== "light";
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("light-mode", !isDarkMode);
  };

  themeToggle.addEventListener("click", () => {
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "light" : "dark");
    applyTheme();
  });

  applyTheme();

  // Sidebar Toggle
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // Notifications Modal
  notificationsBtn.addEventListener("click", async () => {
    notificationsModal.style.display = "flex";
    await loadNotifications();
  });

  closeNotifications.addEventListener("click", () => {
    notificationsModal.style.display = "none";
  });

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("فشل في جلب الإشعارات");
      const notifications = await response.json();
      notificationsList.innerHTML = notifications.length
        ? notifications
            .map(
              (notification) => `
                <div class="notification-item ${notification.isRead ? "read" : "unread"}" data-id="${notification._id}">
                  <h4>${notification.title}</h4>
                  <p>${notification.message}</p>
                  <small>${new Date(notification.createdAt).toLocaleString("ar-EG")}</small>
                </div>
              `
            )
            .join("")
        : '<p>لا توجد إشعارات.</p>';

      const unreadCount = notifications.filter((n) => !n.isRead).length;
      notificationsCount.textContent = unreadCount;
      notificationsBtn.classList.toggle("has-unread", unreadCount > 0);

      notificationsList.querySelectorAll(".notification-item.unread").forEach((item) => {
        item.addEventListener("click", async () => {
          const notificationId = item.dataset.id;
          try {
            await fetch(`/api/notifications/${notificationId}/read`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${token}` },
            });
            item.classList.remove("unread");
            item.classList.add("read");
            const unreadCount = parseInt(notificationsCount.textContent) - 1;
            notificationsCount.textContent = unreadCount;
            notificationsBtn.classList.toggle("has-unread", unreadCount > 0);
          } catch (err) {
            console.error("Error marking notification as read:", err);
          }
        });
      });
    } catch (err) {
      notificationsList.innerHTML = `<p class="error-message">خطأ: ${err.message}</p>`;
    }
  }

  async function populateBotSelect() {
    try {
      const response = await fetch("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("فشل في جلب البوتات");
      availableBots = await response.json();
      botSelect.innerHTML = '<option value="">اختر بوت...</option>';
      availableBots.forEach((bot) => {
        botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
      });

      const selectedBotId = localStorage.getItem("selectedBotId");
      if (selectedBotId) {
        botSelect.value = selectedBotId;
      }
    } catch (err) {
      botSelect.innerHTML = '<option value="">خطأ في تحميل البوتات</option>';
      console.error("Error populating bot select:", err);
    }
  }

  async function loadUserInfo() {
    try {
      const response = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("فشل في جلب بيانات المستخدم");
      const user = await response.json();
      welcomeUsername.textContent = user.username;
      subscriptionType.textContent =
        user.subscriptionType === "free"
          ? "مجاني"
          : user.subscriptionType === "monthly"
          ? "شهري"
          : "سنوي";
      subscriptionEnd.textContent = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate).toLocaleDateString("ar-EG")
        : "غير محدد";
      const endDate = new Date(user.subscriptionEndDate);
      const today = new Date();
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      remainingDays.textContent = diffDays > 0 ? diffDays : "منتهي";
    } catch (err) {
      welcomeUsername.textContent = "خطأ";
      subscriptionType.textContent = "خطأ";
      subscriptionEnd.textContent = "خطأ";
      remainingDays.textContent = "خطأ";
      console.error("Error loading user info:", err);
    }
  }

  function setActiveButton(page) {
    document.querySelectorAll(".nav-item, .nav-item-mobile").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.page === page) {
        btn.classList.add("active");
      }
    });
  }

  function loadPageCss(page) {
    // فقط إزالة الـ links الديناميكية (مش الأساسية)
    const existingDynamicLink = document.querySelector(`link[data-dynamic="true"]`);
    if (existingDynamicLink) existingDynamicLink.remove();
    if (pageCssMap[page]) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = pageCssMap[page];
      link.setAttribute("data-dynamic", "true"); // نعلم الـ link إنه ديناميكي
      document.head.appendChild(link);
    }
  }

  const loadPageContent = async (page) => {
    if (!validPages.includes(page)) {
      console.warn(`⚠️ Attempted to load invalid page: ${page}, ignoring`);
      return;
    }

    // Prevent page load during initial load
    if (isInitialLoad && page !== (role === "superadmin" ? "bots" : "rules")) {
      console.warn(`⚠️ Attempted to load ${page} during initial load, ignoring`);
      return;
    }

    console.log(`Attempting to load page: ${page}`);
    content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
    const selectedBotId = localStorage.getItem("selectedBotId");

    loadPageCss(page);

    if (!selectedBotId && !(role === "superadmin" && page === "bots")) {
      content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
      setActiveButton(page);
      window.location.hash = page;
      return;
    }

    setActiveButton(page);
    window.location.hash = page;

    try {
      switch (page) {
        case "bots":
          if (role === "superadmin") {
            if (typeof window.loadBotsPage === "function") {
              console.log(`Loading bots page for superadmin`);
              await window.loadBotsPage();
            } else {
              throw new Error("loadBotsPage function not found. Ensure bots.js is loaded and the function is defined.");
            }
          } else {
            throw new Error("غير مصرح لك بالوصول لهذه الصفحة.");
          }
          break;
        case "rules":
          if (typeof window.loadRulesPage === "function") {
            console.log(`Loading rules page`);
            await window.loadRulesPage();
          } else {
            throw new Error("loadRulesPage function not found. Ensure rules.js is loaded and the function is defined.");
          }
          break;
        case "chat-page":
          if (typeof window.loadChatPage === "function") {
            console.log(`Loading chat-page`);
            await window.loadChatPage();
          } else {
            throw new Error("loadChatPage function not found. Ensure chatPage.js is loaded and the function is defined.");
          }
          break;
        case "analytics":
          if (typeof window.loadAnalyticsPage === "function") {
            console.log(`Loading analytics page`);
            try {
              await window.loadAnalyticsPage();
            } catch (analyticsErr) {
              console.error('Error executing loadAnalyticsPage:', analyticsErr);
              throw new Error(`Failed to load analytics page: ${analyticsErr.message}`);
            }
          } else {
            throw new Error("loadAnalyticsPage function not found. Ensure analytics.js is loaded and the function is defined.");
          }
          break;
        case "messages":
          if (typeof window.loadMessagesPage === "function") {
            console.log(`Loading messages page`);
            await window.loadMessagesPage();
          } else {
            throw new Error("loadMessagesPage function not found. Ensure messages.js is loaded and the function is defined.");
          }
          break;
        case "feedback":
          if (typeof window.loadFeedbackPage === "function") {
            console.log(`Loading feedback page`);
            await window.loadFeedbackPage();
          } else {
            throw new Error("loadFeedbackPage function not found. Ensure feedback.js is loaded and the function is defined.");
          }
          break;
        case "facebook":
          if (typeof window.loadFacebookPage === "function") {
            console.log(`Loading facebook page`);
            await window.loadFacebookPage();
          } else {
            throw new Error("loadFacebookPage function not found. Ensure facebook.js is loaded and the function is defined.");
          }
          break;
        case "instagram":
          if (typeof window.loadInstagramPage === "function") {
            console.log(`Loading instagram page`);
            await window.loadInstagramPage();
          } else {
            throw new Error("loadInstagramPage function not found. Ensure instagram.js is loaded and the function is defined.");
          }
          break;
        case "settings":
          if (typeof window.loadSettingsPage === "function") {
            console.log(`Loading settings page`);
            await window.loadSettingsPage();
          } else {
            throw new Error("loadSettingsPage function not found. Ensure settings.js is loaded and the function is defined.");
          }
          break;
        default:
          throw new Error("الصفحة المطلوبة غير متوفرة.");
      }
    } catch (error) {
      console.error(`Error loading page ${page}:`, error.message);
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
    }
  };

  botSelect.addEventListener("change", () => {
    const selectedBotId = botSelect.value;
    localStorage.setItem("selectedBotId", selectedBotId);
    const currentPage = window.location.hash.substring(1) || (role === "superadmin" ? "bots" : "rules");
    if (validPages.includes(currentPage)) {
      loadPageContent(currentPage);
    }
  });

  document.querySelectorAll(".nav-item, .nav-item-mobile").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page && validPages.includes(page)) {
        loadPageContent(page);
      }
    });
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedBotId");
    window.location.href = "/login";
  });

  logoutBtnMobile.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedBotId");
    window.location.href = "/login";
  });

  window.addEventListener("hashchange", () => {
    const page = window.location.hash.substring(1);
    if (page && validPages.includes(page)) {
      loadPageContent(page);
    }
  });

  // Initial Load
  try {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    await Promise.all([loadUserInfo(), populateBotSelect(), loadNotifications()]);
    const initialPage = window.location.hash.substring(1) || (role === "superadmin" ? "bots" : "rules");
    if (validPages.includes(initialPage)) {
      await loadPageContent(initialPage);
    } else {
      await loadPageContent(role === "superadmin" ? "bots" : "rules");
    }
  } catch (err) {
    content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>حدث خطأ أثناء تحميل الصفحة. حاول تسجيل الخروج وتسجيل الدخول مرة أخرى.</p></div>`;
    console.error("Error during initial load:", err);
  } finally {
    isInitialLoad = false;
  }
});
