document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  // Redirect to login if no token
  if (!token) {
    // Check if on landing page, if so, stay there
    if (window.location.pathname !== "/index.html") { // Corrected path
        window.location.href = "/index.html"; // Redirect to landing page first
    }
    return;
  }

  const content = document.getElementById("content");
  const botSelect = document.getElementById("botSelectDashboard");
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  const logoutBtn = document.querySelector(".sidebar-footer .logout-btn");
  const themeToggleButton = document.getElementById("theme-toggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");
  const mainContent = document.querySelector(".main-content");

  // --- Theme Handling ---
  const currentTheme = localStorage.getItem("theme") || "dark"; // Default to dark
  if (currentTheme === "light") {
    document.body.classList.replace("dark-mode", "light-mode");
  } else {
    document.body.classList.add("dark-mode"); // Ensure dark-mode is present
  }

  themeToggleButton.addEventListener("click", () => {
    if (document.body.classList.contains("dark-mode")) {
      document.body.classList.replace("dark-mode", "light-mode");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.replace("light-mode", "dark-mode");
      localStorage.setItem("theme", "dark");
    }
  });

  // --- Sidebar Toggle --- (for responsive)
  sidebarToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open"); // For mobile view
    sidebar.classList.toggle("collapsed"); // For desktop view collapse
  });

  // Close sidebar when clicking outside on mobile
  mainContent.addEventListener("click", () => {
    if (window.innerWidth <= 992 && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }
  });

  // --- Bot Selector --- 
  async function populateBotSelect() {
    try {
      const res = await fetch("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
            alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
            logoutUser();
            return;
        }
        throw new Error("فشل في جلب البوتات");
      }
      const bots = await res.json();
      botSelect.innerHTML = "<option value=\"\">اختر بوت</option>";
      const userBots = role === "superadmin" ? bots : bots.filter((bot) => bot.userId._id === userId);
      
      if (userBots.length === 0 && role !== 'superadmin') {
          content.innerHTML = `<div class="placeholder"><h2>لا يوجد بوتات متاحة</h2><p>يرجى التواصل مع المسؤول لإضافة بوت لحسابك.</p></div>`;
          // Optionally disable sidebar items if no bot is available
          navItems.forEach(item => {
              if (item.dataset.page !== 'bots') { // Allow superadmin to access bots page
                  item.disabled = true;
                  item.style.opacity = '0.5';
                  item.style.cursor = 'not-allowed';
              }
          });
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
      }

      // Trigger page load based on hash or default
      loadPageBasedOnHash(); 

    } catch (err) {
      console.error("خطأ في جلب البوتات:", err);
      content.innerHTML = `<div class="placeholder error"><p>خطأ في جلب البوتات. حاول تحديث الصفحة.</p></div>`;
    }
  }

  botSelect.addEventListener("change", () => {
    const selectedBotId = botSelect.value;
    if (selectedBotId) {
        localStorage.setItem("selectedBotId", selectedBotId);
        // Reload the current page content for the new bot
        loadPageBasedOnHash(); 
    } else {
        localStorage.removeItem("selectedBotId");
        content.innerHTML = `<div class="placeholder"><h2>يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض المحتوى.</p></div>`;
        // Optionally disable sidebar items
         navItems.forEach(item => {
              if (item.dataset.page !== 'bots') { 
                  item.disabled = true;
                  item.style.opacity = '0.5';
                  item.style.cursor = 'not-allowed';
              }
          });
    }
  });

  // --- Page Loading Logic --- 
  const setActiveButton = (page) => {
    navItems.forEach(item => {
      item.classList.remove("active");
      if (item.dataset.page === page) {
        item.classList.add("active");
      }
    });
  };

  const loadPageContent = (page) => {
    content.innerHTML = '<div class="spinner"><div class="loader"></div></div>'; // Show spinner
    const selectedBotId = localStorage.getItem("selectedBotId");

    // Enable all nav items initially, disable if no bot selected later
    navItems.forEach(item => {
        item.disabled = false;
        item.style.opacity = '1';
        item.style.cursor = 'pointer';
    });

    if (!selectedBotId && page !== 'bots') { // Allow superadmin to access bots page even without selection
        if (role === 'superadmin' && page === 'bots') {
            // Allow superadmin to load bots page
        } else {
            content.innerHTML = `<div class="placeholder"><h2>يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
            // Disable nav items except bots for superadmin
            navItems.forEach(item => {
                if (item.dataset.page !== 'bots') { 
                    item.disabled = true;
                    item.style.opacity = '0.5';
                    item.style.cursor = 'not-allowed';
                }
            });
            return; 
        }
    }

    setActiveButton(page);
    window.location.hash = page; // Update hash

    // Load the corresponding JS function
    try {
        switch (page) {
            case "bots":
                if (role === "superadmin") {
                    if (typeof loadBotsPage === "function") loadBotsPage(); else console.error("loadBotsPage function not found");
                } else {
                    content.innerHTML = `<div class="placeholder error"><p>غير مصرح لك بالوصول لهذه الصفحة.</p></div>`;
                }
                break;
            case "rules":
                if (typeof loadRulesPage === "function") loadRulesPage(); else console.error("loadRulesPage function not found");
                break;
            case "chat-page":
                if (typeof loadChatPage === "function") loadChatPage(); else console.error("loadChatPage function not found");
                break;
            case "analytics":
                if (typeof loadAnalyticsPage === "function") loadAnalyticsPage(); else console.error("loadAnalyticsPage function not found");
                break;
            case "messages":
                if (typeof loadMessagesPage === "function") loadMessagesPage(); else console.error("loadMessagesPage function not found");
                break;
            case "feedback":
                if (typeof loadFeedbackPage === "function") loadFeedbackPage(); else console.error("loadFeedbackPage function not found");
                break;
            case "facebook":
                if (typeof loadFacebookPage === "function") loadFacebookPage(); else console.error("loadFacebookPage function not found");
                break;
            default:
                content.innerHTML = `<div class="placeholder"><h2>صفحة غير موجودة</h2><p>الصفحة المطلوبة غير متوفرة.</p></div>`;
        }
    } catch (error) {
        console.error(`Error loading page ${page}:`, error);
        content.innerHTML = `<div class="placeholder error"><p>حدث خطأ أثناء تحميل محتوى الصفحة.</p></div>`;
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 992 && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
    }
  };

  navItems.forEach(item => {
    // Hide bots management for non-superadmin
    if (item.dataset.page === 'bots' && role !== 'superadmin') {
        item.style.display = 'none';
    }
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      loadPageContent(page);
    });
  });

  // --- Initial Page Load --- 
  const loadPageBasedOnHash = () => {
    const hash = window.location.hash.substring(1);
    const validPages = Array.from(navItems).map(item => item.dataset.page);
    
    if (hash && validPages.includes(hash)) {
        // Special check for bots page access
        if (hash === 'bots' && role !== 'superadmin') {
            loadPageContent('rules'); // Default for non-superadmin
        } else {
            loadPageContent(hash);
        }
    } else {
        // Default page logic
        if (role === 'superadmin') {
            loadPageContent('bots'); // Default for superadmin
        } else {
            loadPageContent('rules'); // Default for user
        }
    }
  };

  // --- Logout --- 
  async function logoutUser() {
      const username = localStorage.getItem("username");
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await response.json();
        // Clear local storage regardless of server response for logout
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        localStorage.removeItem("selectedBotId");
        console.log("Logout initiated, localStorage cleared");
        window.location.href = "/index.html"; // Corrected path: Redirect to landing page after logout
      } catch (err) {
        console.error("Error during logout:", err);
        // Clear local storage even if server fails
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        localStorage.removeItem("selectedBotId");
        window.location.href = "/index.html"; // Corrected path: Redirect to landing page after logout
      }
  }

  logoutBtn.addEventListener("click", logoutUser);

  // --- Assistant Bot (Optional) ---
  const assistantButton = document.getElementById('assistantButton');
  const assistantChatModal = document.getElementById('assistantChatModal');
  const closeAssistantChatBtn = document.getElementById('closeAssistantChatBtn');

  if (assistantButton && assistantChatModal && closeAssistantChatBtn) {
      assistantButton.addEventListener('click', () => {
          assistantChatModal.style.display = 'flex';
      });
      closeAssistantChatBtn.addEventListener('click', () => {
          assistantChatModal.style.display = 'none';
      });
      // Add assistant bot message sending logic if assistantBot.js is present and needed
      if (typeof initializeAssistantBot === 'function') {
          initializeAssistantBot(); // Assuming assistantBot.js has this function
      } else {
          console.warn("Assistant bot JS not fully integrated or function missing.");
      }
  } else {
      console.warn("Assistant bot elements not found in the new dashboard HTML.");
  }

  // --- Initialize --- 
  populateBotSelect(); // Load bots first, then load page based on hash/default

});


