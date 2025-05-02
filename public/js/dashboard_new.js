// public/js/dashboard_new.js

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  // Redirect to login if no token
  if (!token) {
    if (window.location.pathname !== "/login.html") {
      window.location.href = "/login.html";
    }
    return;
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

  // Map of pages to their respective CSS files
  const pageCssMap = {
    bots: "/css/bots.css",
    rules: "/css/rules.css",
    "chat-page": "/css/chatPage.css",
    analytics: "/css/analytics.css",
    messages: "/css/messages.css",
    feedback: "/css/feedback.css",
    facebook: "/css/facebook.css",
  };

  // Function to load CSS dynamically
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

  // Load assistantBot.css when assistant modal is shown
  function loadAssistantCss() {
    if (!document.querySelector('link[href="/css/assistantBot.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/css/assistantBot.css";
      document.head.appendChild(link);
    }
  }

  // --- Theme Handling ---
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

  // --- Sidebar Toggle for Desktop ---
  sidebarToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("collapsed");
  });

  // --- Mobile Navigation Toggle ---
  if (mobileNavToggle) {
    mobileNavToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("collapsed");
    });
  }

  // --- Bot Selector ---
  async function populateBotSelect() {
    try {
      const bots = await handleApiRequest("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      }, content, "فشل في جلب البوتات");

      botSelect.innerHTML = "<option value=\"\">اختر بوت</option>";
      const userBots = role === "superadmin" ? bots : bots.filter((bot) => bot.userId?._id === userId || bot.userId === userId);

      if (userBots.length === 0 && role !== "superadmin") {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-robot"></i> لا يوجد بوتات متاحة</h2><p>يرجى التواصل مع المسؤول لإضافة بوت لحسابك.</p></div>`;
        disableNavItems();
        return;
      }

      userBots.forEach((bot) => {
        botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
      });

      const selectedBotId = localStorage.getItem("selectedBotId");
      if (selectedBotId && userBots.some(bot => bot._id === selectedBotId)) {
        botSelect.value = selectedBotId;
      } else if (userBots.length > 0) {
        botSelect.value = userBots[0]._id;
        localStorage.setItem("selectedBotId", userBots[0]._id);
      } else {
        disableNavItems();
      }

      loadInitialPage();
    } catch (err) {
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>خطأ في جلب البوتات. حاول تحديث الصفحة.</p></div>`;
      disableNavItems();
    }
  }

  botSelect.addEventListener("change", () => {
    const selectedBotId = botSelect.value;
    if (selectedBotId) {
      localStorage.setItem("selectedBotId", selectedBotId);
      enableNavItems();
      loadInitialPage();
    } else {
      localStorage.removeItem("selectedBotId");
      content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض المحتوى.</p></div>`;
      disableNavItems();
    }
  });

  // --- Navigation Helpers ---
  const disableNavItems = () => {
    navItems.forEach(item => {
      if (item.dataset.page === "bots" && role === "superadmin") return;
      item.disabled = true;
      item.style.display = "none"; // Hide disabled items
    });
    mobileNavItems.forEach(item => {
      if (item.dataset.page === "bots" && role === "superadmin") return;
      item.disabled = true;
      item.style.display = "none"; // Hide disabled items on mobile
    });
  };

  const enableNavItems = () => {
    navItems.forEach(item => {
      item.disabled = false;
      item.style.display = "flex"; // Show enabled items
    });
    mobileNavItems.forEach(item => {
      item.disabled = false;
      item.style.display = "flex"; // Show enabled items on mobile
      if (item.dataset.page === "bots" && role !== "superadmin") {
        item.style.display = "none"; // Hide bots page for non-superadmin
      }
    });
  };

  // --- Page Loading Logic ---
  const setActiveButton = (page) => {
    navItems.forEach(item => {
      item.classList.remove("active");
      if (item.dataset.page === page) {
        item.classList.add("active");
      }
    });
    mobileNavItems.forEach(item => {
      item.classList.remove("active");
      if (item.dataset.page === page) {
        item.classList.add("active");
      }
    });
  };

  const loadPageContent = async (page) => {
    content.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
    const selectedBotId = localStorage.getItem("selectedBotId");

    enableNavItems();

    // Load page-specific CSS
    loadPageCss(page);

    if (!selectedBotId && !(role === "superadmin" && page === "bots")) {
      content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
      disableNavItems();
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
            if (typeof loadBotsPage === "function") await loadBotsPage();
            else throw new Error("loadBotsPage function not found");
          } else {
            throw new Error("غير مصرح لك بالوصول لهذه الصفحة.");
          }
          break;
        case "rules":
          if (typeof loadRulesPage === "function") await loadRulesPage();
          else throw new Error("loadRulesPage function not found");
          break;
        case "chat-page":
          if (typeof loadChatPage === "function") await loadChatPage();
          else throw new Error("loadChatPage function not found");
          break;
        case "analytics":
          if (typeof loadAnalyticsPage === "function") await loadAnalyticsPage();
          else throw new Error("loadAnalyticsPage function not found");
          break;
        case "messages":
          if (typeof loadMessagesPage === "function") await loadMessagesPage();
          else throw new Error("loadMessagesPage function not found");
          break;
        case "feedback":
          if (typeof loadFeedbackPage === "function") await loadFeedbackPage();
          else throw new Error("loadFeedbackPage function not found");
          break;
        case "facebook":
          if (typeof loadFacebookPage === "function") await loadFacebookPage();
          else throw new Error("loadFacebookPage function not found");
          break;
        default:
          throw new Error("الصفحة المطلوبة غير متوفرة.");
      }
    } catch (error) {
      console.error(`Error loading page ${page}:`, error);
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
    }
  };

  // --- Navigation Events ---
  navItems.forEach(item => {
    if (item.dataset.page === "bots" && role !== "superadmin") {
      item.style.display = "none";
    }
    item.addEventListener("click", (e) => {
      if (e.currentTarget.disabled) return;
      const page = item.dataset.page;
      loadPageContent(page);
    });
  });

  mobileNavItems.forEach(item => {
    if (item.dataset.page === "bots" && role !== "superadmin") {
      item.style.display = "none";
    }
    item.addEventListener("click", (e) => {
      if (e.currentTarget.disabled) return;
      const page = item.dataset.page;
      loadPageContent(page);
    });
  });

  // --- Initial Page Load ---
  const loadInitialPage = () => {
    const validPages = Array.from(navItems)
      .filter(item => item.style.display !== "none")
      .map(item => item.dataset.page);

    let pageToLoad = null;

    // Set initial page based on user role
    if (role === "superadmin") {
      pageToLoad = "bots";
    } else {
      pageToLoad = "rules";
    }

    // Clear any existing hash to prevent loading wrong page
    window.location.hash = pageToLoad;

    if (validPages.includes(pageToLoad)) {
      loadPageContent(pageToLoad);
    } else if (validPages.length > 0) {
      loadPageContent(validPages[0]);
    } else {
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-ban"></i> لا توجد صفحات متاحة</h2><p>لا يمكنك الوصول إلى أي أقسام حاليًا.</p></div>`;
      disableNavItems();
    }
  };

  // --- Load page based on hash only after initial load ---
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    const validPages = Array.from(navItems)
      .filter(item => item.style.display !== "none")
      .map(item => item.dataset.page);

    if (hash && validPages.includes(hash)) {
      loadPageContent(hash);
    }
  });

  // --- Logout ---
  async function logoutUser() {
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
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", logoutUser);
  }

  // --- Assistant Bot ---
  const assistantButton = document.getElementById("assistantButton");
  if (assistantButton) {
    assistantButton.addEventListener("click", loadAssistantCss);
    console.log("Assistant button found.");
  } else {
    console.warn("Assistant button element not found.");
  }

  // --- Initialize ---
  populateBotSelect();
});
