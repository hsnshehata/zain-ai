// public/js/dashboard_new.js (Revised for button functionality and consistency)

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  // Redirect to login if no token
  if (!token) {
    // Check if on landing page, if so, stay there
    if (window.location.pathname !== "/index.html") {
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

  const currentTheme = localStorage.getItem("theme") || "dark"; // Default to dark
  applyTheme(currentTheme);

  themeToggleButton.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(newTheme);
  });

  // --- Sidebar Toggle --- 
  sidebarToggleBtn.addEventListener("click", () => {
    if (window.innerWidth <= 992) {
        sidebar.classList.toggle("open"); // For mobile view slide-in/out
    } else {
        sidebar.classList.toggle("collapsed"); // For desktop view collapse/expand
        mainContent.classList.toggle("collapsed"); // Adjust main content margin
    }
  });

  // Close sidebar when clicking outside on mobile
  mainContent.addEventListener("click", () => {
    if (window.innerWidth <= 992 && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }
  });

  // Adjust sidebar state on resize
  window.addEventListener("resize", () => {
      if (window.innerWidth > 992) {
          sidebar.classList.remove("open"); // Remove mobile open state
      } else {
          // Optional: Collapse sidebar by default on mobile if it was collapsed on desktop
          // if (sidebar.classList.contains("collapsed")) {
          //     sidebar.classList.remove("collapsed");
          // }
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
        throw new Error(`فشل في جلب البوتات: ${res.status}`);
      }
      const bots = await res.json();
      botSelect.innerHTML = "<option value=\"\">اختر بوت</option>";
      const userBots = role === "superadmin" ? bots : bots.filter((bot) => bot.userId?._id === userId || bot.userId === userId); // Handle populated and non-populated userId
      
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
        // Select the first bot if no valid selection is stored
        botSelect.value = userBots[0]._id;
        localStorage.setItem("selectedBotId", userBots[0]._id);
      } else {
          // No bots available for selection (might happen for superadmin if DB is empty)
          disableNavItems();
      }

      // Trigger page load based on hash or default
      loadPageBasedOnHash(); 

    } catch (err) {
      console.error("خطأ في جلب البوتات:", err);
      content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>خطأ في جلب البوتات. حاول تحديث الصفحة.</p></div>`;
      disableNavItems();
    }
  }

  botSelect.addEventListener("change", () => {
    const selectedBotId = botSelect.value;
    if (selectedBotId) {
        localStorage.setItem("selectedBotId", selectedBotId);
        enableNavItems();
        // Reload the current page content for the new bot
        loadPageBasedOnHash(); 
    } else {
        localStorage.removeItem("selectedBotId");
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض المحتوى.</p></div>`;
        disableNavItems();
    }
  });

  // --- Navigation Helpers ---
  const disableNavItems = () => {
      navItems.forEach(item => {
          // Allow superadmin to always access bots page
          if (item.dataset.page === "bots" && role === "superadmin") return;
          item.disabled = true;
      });
  };

  const enableNavItems = () => {
      navItems.forEach(item => {
          item.disabled = false;
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
  };

  const loadPageContent = async (page) => {
    content.innerHTML = "."; // Show spinner
    const selectedBotId = localStorage.getItem("selectedBotId");

    // Re-enable items, will be disabled again if needed
    enableNavItems(); 

    if (!selectedBotId && !(role === "superadmin" && page === "bots")) {
        content.innerHTML = `<div class="placeholder"><h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2><p>اختر بوتًا من القائمة أعلاه لعرض هذا القسم.</p></div>`;
        disableNavItems();
        setActiveButton(page); // Still highlight the attempted page
        window.location.hash = page; // Update hash
        return; 
    }

    setActiveButton(page);
    window.location.hash = page; // Update hash

    // Dynamically load JS module for the page if not already loaded
    // This assumes page-specific logic is in separate files/functions
    try {
        switch (page) {
            case "bots":
                if (role === "superadmin") {
                    if (typeof loadBotsPage === "function") await loadBotsPage(); else throw new Error("loadBotsPage function not found");
                } else {
                    throw new Error("غير مصرح لك بالوصول لهذه الصفحة.");
                }
                break;
            case "rules":
                if (typeof loadRulesPage === "function") await loadRulesPage(); else throw new Error("loadRulesPage function not found");
                break;
            case "chat-page":
                if (typeof loadChatPage === "function") await loadChatPage(); else throw new Error("loadChatPage function not found");
                break;
            case "analytics":
                if (typeof loadAnalyticsPage === "function") await loadAnalyticsPage(); else throw new Error("loadAnalyticsPage function not found");
                break;
            case "messages":
                if (typeof loadMessagesPage === "function") await loadMessagesPage(); else throw new Error("loadMessagesPage function not found");
                break;
            case "feedback":
                if (typeof loadFeedbackPage === "function") await loadFeedbackPage(); else throw new Error("loadFeedbackPage function not found");
                break;
            case "facebook":
                if (typeof loadFacebookPage === "function") await loadFacebookPage(); else throw new Error("loadFacebookPage function not found");
                break;
            default:
                throw new Error("الصفحة المطلوبة غير متوفرة.");
        }
    } catch (error) {
        console.error(`Error loading page ${page}:`, error);
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>${error.message || "حدث خطأ أثناء تحميل محتوى الصفحة."}</p></div>`;
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 992 && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
    }
  };

  navItems.forEach(item => {
    // Hide bots management for non-superadmin
    if (item.dataset.page === "bots" && role !== "superadmin") {
        item.style.display = "none";
    }
    item.addEventListener("click", (e) => {
      if (e.currentTarget.disabled) return; // Prevent action if disabled
      const page = item.dataset.page;
      loadPageContent(page);
    });
  });

  // --- Initial Page Load --- 
  const loadPageBasedOnHash = () => {
    const hash = window.location.hash.substring(1);
    const validPages = Array.from(navItems)
        .filter(item => item.style.display !== "none") // Consider only visible items
        .map(item => item.dataset.page);
    
    let pageToLoad = null;

    if (hash && validPages.includes(hash)) {
        // Special check for bots page access
        if (hash === "bots" && role !== "superadmin") {
            pageToLoad = "rules"; // Default for non-superadmin trying to access bots
        } else {
            pageToLoad = hash;
        }
    } else {
        // Default page logic
        pageToLoad = (role === "superadmin") ? "bots" : "rules";
    }
    
    // Ensure the default page is valid before loading
    if (validPages.includes(pageToLoad)) {
        loadPageContent(pageToLoad);
    } else if (validPages.length > 0) {
        // Fallback to the first available valid page
        loadPageContent(validPages[0]);
    } else {
        // No valid pages available (should only happen if all items are hidden/disabled)
        content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-ban"></i> لا توجد صفحات متاحة</h2><p>لا يمكنك الوصول إلى أي أقسام حاليًا.</p></div>`;
        disableNavItems();
    }
  };

  // --- Logout --- 
  async function logoutUser() {
      const username = localStorage.getItem("username");
      // Clear local storage immediately
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("selectedBotId");
      localStorage.removeItem("theme"); // Clear theme preference on logout
      console.log("Logout initiated, localStorage cleared");
      window.location.href = "/index.html"; // Redirect to landing page

      // Attempt to notify server in the background (optional)
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }), // Send username if available
        });
        console.log("Server logout notification sent.");
      } catch (err) {
        console.error("Error sending logout notification to server:", err);
      }
  }

  logoutBtn.addEventListener("click", logoutUser);

  // --- Assistant Bot (Placeholder/Optional) ---
  // Assuming assistant bot elements might be added later or are not essential
  const assistantButton = document.getElementById("assistantButton");
  if (assistantButton) {
      // Add logic if needed
      console.log("Assistant button found.");
  } else {
      console.warn("Assistant button element not found.");
  }

  // --- Initialize --- 
  populateBotSelect(); // Load bots first, then load page based on hash/default

});

