document.addEventListener("DOMContentLoaded", async () => {
  // Global variable to store available bots
  let availableBots = [];
  let isInitialLoad = true; // Flag to control initial page load

  // Valid pages to prevent unexpected page loads
  const validPages = ['bots', 'rules', 'chat-page', 'analytics', 'messages', 'feedback', 'facebook', 'instagram', 'settings'];

  // ... الكود الأصلي بدون تغيير حتى الـ Theme Handling ...

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

  // ... الكود الأصلي بدون تغيير حتى loadPageContent ...

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

  // ... باقي الكود الأصلي بدون تغيير ...
});
