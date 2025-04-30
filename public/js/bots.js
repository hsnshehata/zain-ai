// public/js/bots.js (Updated for new dashboard design)

async function loadBotsPage() {
  const content = document.getElementById("content");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (role !== "superadmin") {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> وصول غير مصرح به</h2>
        <p>غير مسموح لك بالوصول إلى هذه الصفحة.</p>
      </div>
    `;
    return;
  }

  // Main structure for the bots page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-robot"></i> إدارة البوتات والمستخدمين</h2>
      <div class="header-actions">
        <button id="showCreateUserBtn" class="btn btn-secondary"><i class="fas fa-user-plus"></i> إنشاء مستخدم</button>
        <button id="showCreateBotBtn" class="btn btn-primary"><i class="fas fa-plus-circle"></i> إنشاء بوت</button>
      </div>
    </div>
    <div id="formContainer" class="form-section" style="display: none;"></div>
    <div class="bots-users-container">
      <h3><i class="fas fa-users"></i> قائمة المستخدمين والبوتات</h3>
      <div class="filters-bar">
        <div class="form-group">
          <label for="botSearchInput"><i class="fas fa-search"></i> بحث</label>
          <input type="text" id="botSearchInput" placeholder="ابحث عن مستخدم أو بوت...">
        </div>
      </div>
      <div id="usersGrid" class="grid-container"></div>
      <div id="loadingSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>
    </div>
  `;

  const formContainer = document.getElementById("formContainer");
  const usersGrid = document.getElementById("usersGrid");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const showCreateUserBtn = document.getElementById("showCreateUserBtn");
  const showCreateBotBtn = document.getElementById("showCreateBotBtn");
  const botSearchInput = document.getElementById("botSearchInput"); // Added search input reference

  let allUsers = []; // Store all fetched users for local filtering

  showCreateUserBtn.addEventListener("click", () => showCreateUserForm(formContainer));
  showCreateBotBtn.addEventListener("click", () => showCreateBotForm(formContainer));

  // Search functionality
  botSearchInput.addEventListener("input", () => {
    const searchTerm = botSearchInput.value.toLowerCase().trim();
    const filteredUsers = allUsers.filter(user => {
      const usernameMatch = user.username.toLowerCase().includes(searchTerm);
      const botMatch = user.bots && user.bots.some(bot => bot.name.toLowerCase().includes(searchTerm));
      return usernameMatch || botMatch;
    });
    renderUsersGrid(filteredUsers, usersGrid); // Render filtered results
  });

  try {
    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";
    usersGrid.innerHTML = ""; // Clear previous content
    await fetchUsersAndBots(usersGrid, loadingSpinner, errorMessage);
  } catch (err) {
    console.error("خطأ في تحميل صفحة البوتات:", err);
    errorMessage.textContent = "تعذر تحميل البيانات. حاول تحديث الصفحة.";
    errorMessage.style.display = "block";
    loadingSpinner.style.display = "none";
  }
}

// Function to render the user grid
function renderUsersGrid(usersToRender, gridElement) {
    gridElement.innerHTML = ""; // Clear grid before adding new cards

    if (usersToRender.length === 0) {
      gridElement.innerHTML = 
        '<div class="card placeholder-card"><p>لا يوجد مستخدمين أو بوتات تطابق البحث.</p></div>';
      return;
    }

    usersToRender.forEach((user) => {
      const botsHtml = user.bots && user.bots.length > 0
        ? user.bots.map(bot => `
            <div class="bot-entry">
              <span><i class="fas fa-robot"></i> ${bot.name} ${bot.facebookPageId ? 
                `<a href="https://facebook.com/${bot.facebookPageId}" target="_blank" title="صفحة فيسبوك"><i class="fab fa-facebook-square"></i></a>` : ''}</span>
              <div class="bot-actions">
                <button class="btn-icon btn-edit" onclick="showEditBotForm(document.getElementById('formContainer'), '${bot._id}', '${bot.name}', '${bot.facebookApiKey || ''}', '${bot.facebookPageId || ''}', '${user._id}')" title="تعديل البوت"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteBot('${bot._id}')" title="حذف البوت"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          `).join("")
        : '<p class="no-bots">لا توجد بوتات لهذا المستخدم.</p>';

      const card = document.createElement("div");
      card.className = "card user-bot-card"; // Use a more specific class
      card.innerHTML = `
        <div class="card-header">
          <h4><i class="fas fa-user-circle"></i> ${user.username}</h4>
          <span class="user-role ${user.role}">${user.role === 'superadmin' ? 'مدير عام' : 'مستخدم'}</span>
        </div>
        <div class="card-body">
          <h5>البوتات:</h5>
          <div class="bots-list">${botsHtml}</div>
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-outline-secondary" onclick="showEditUserForm(document.getElementById('formContainer'), '${user._id}', '${user.username}', '${user.role}')"><i class="fas fa-user-edit"></i> تعديل المستخدم</button>
          ${user.role !== 'superadmin' ? 
          `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')"><i class="fas fa-user-times"></i> حذف المستخدم</button>` : ''}
        </div>
      `;
      gridElement.appendChild(card);
    });
}

async function fetchUsersAndBots(gridElement, spinner, errorElement) {
  const token = localStorage.getItem("token");
  try {
    spinner.style.display = "flex";
    errorElement.style.display = "none";

    const res = await fetch("/api/users?populate=bots", { // Ensure bots are populated
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        if (res.status === 401) {
            alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
            logoutUser(); // Assumes logoutUser is globally available from dashboard_new.js
            return;
        }
      throw new Error(`فشل في جلب المستخدمين: ${res.statusText}`);
    }
    allUsers = await res.json(); // Store fetched users globally within the scope

    renderUsersGrid(allUsers, gridElement); // Initial render with all users

    spinner.style.display = "none";
  } catch (err) {
    console.error("خطأ في جلب المستخدمين والبوتات:", err);
    errorElement.textContent = err.message || "خطأ في جلب المستخدمين.";
    errorElement.style.display = "block";
    spinner.style.display = "none";
  }
}

// --- Form Functions (Create/Edit User/Bot) ---

function showCreateUserForm(container) {
  container.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-user-plus"></i> إنشاء مستخدم جديد</h3>
      <form id="createUserForm">
        <div class="form-group">
          <label for="newUsername">اسم المستخدم</label>
          <input type="text" id="newUsername" required>
        </div>
        <div class="form-group">
          <label for="newPassword">كلمة المرور</label>
          <input type="password" id="newPassword" required>
        </div>
        <div class="form-group">
          <label for="newUserRole">الدور</label>
          <select id="newUserRole">
            <option value="user">مستخدم</option>
            <option value="superadmin">مدير عام</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">إنشاء</button>
          <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('formContainer'))">إلغاء</button>
        </div>
        <p id="userFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  container.style.display = "block";

  document.getElementById("createUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newUserRole").value;
    const errorEl = document.getElementById("userFormError");
    errorEl.style.display = "none";

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم إنشاء المستخدم بنجاح!");
        hideForm(container);
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      } else {
        errorEl.textContent = data.message || "فشل في إنشاء المستخدم";
        errorEl.style.display = "block";
      }
    } catch (err) {
      console.error("خطأ في إنشاء المستخدم:", err);
      errorEl.textContent = "خطأ في الاتصال بالخادم";
      errorEl.style.display = "block";
    }
  });
}

function showEditUserForm(container, userId, currentUsername, currentRole) {
  container.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-user-edit"></i> تعديل المستخدم: ${currentUsername}</h3>
      <form id="editUserForm">
        <div class="form-group">
          <label for="editUsername">اسم المستخدم</label>
          <input type="text" id="editUsername" value="${currentUsername}" required>
        </div>
        <div class="form-group">
          <label for="editPassword">كلمة المرور الجديدة (اتركه فارغًا لعدم التغيير)</label>
          <input type="password" id="editPassword">
        </div>
        <div class="form-group">
          <label for="editUserRole">الدور</label>
          <select id="editUserRole">
            <option value="user" ${currentRole === 'user' ? 'selected' : ''}>مستخدم</option>
            <option value="superadmin" ${currentRole === 'superadmin' ? 'selected' : ''}>مدير عام</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
          <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('formContainer'))">إلغاء</button>
        </div>
        <p id="editUserFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  container.style.display = "block";

  document.getElementById("editUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("editUsername").value;
    const password = document.getElementById("editPassword").value;
    const role = document.getElementById("editUserRole").value;
    const errorEl = document.getElementById("editUserFormError");
    errorEl.style.display = "none";

    const updateData = { username, role };
    if (password) {
      updateData.password = password;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم تعديل المستخدم بنجاح!");
        hideForm(container);
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      } else {
        errorEl.textContent = data.message || "فشل في تعديل المستخدم";
        errorEl.style.display = "block";
      }
    } catch (err) {
      console.error("خطأ في تعديل المستخدم:", err);
      errorEl.textContent = "خطأ في الاتصال بالخادم";
      errorEl.style.display = "block";
    }
  });
}

async function deleteUser(userId) {
  if (confirm("هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع البوتات المرتبطة به.")) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم حذف المستخدم بنجاح");
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      } else {
        alert(data.message || "فشل في حذف المستخدم");
      }
    } catch (err) {
      console.error("خطأ في حذف المستخدم:", err);
      alert("خطأ في الاتصال بالخادم");
    }
  }
}

function showCreateBotForm(container) {
  container.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-plus-circle"></i> إنشاء بوت جديد</h3>
      <form id="createBotForm">
        <div class="form-group">
          <label for="botName">اسم البوت</label>
          <input type="text" id="botName" required>
        </div>
        <div class="form-group">
          <label for="botUserId">المستخدم المالك</label>
          <select id="botUserId" required>
            <option value="">جار التحميل...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="facebookApiKey">مفتاح API لفيسبوك (اختياري)</label>
          <input type="text" id="facebookApiKey">
        </div>
        <div class="form-group" id="facebookPageIdContainer" style="display: none;">
          <label for="facebookPageId">معرف صفحة فيسبوك (مطلوب إذا تم إدخال API)</label>
          <input type="text" id="facebookPageId">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">إنشاء البوت</button>
          <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('formContainer'))">إلغاء</button>
        </div>
        <p id="botFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  container.style.display = "block";

  const facebookApiKeyInput = document.getElementById("facebookApiKey");
  const facebookPageIdContainer = document.getElementById("facebookPageIdContainer");
  const facebookPageIdInput = document.getElementById("facebookPageId");

  facebookApiKeyInput.addEventListener("input", () => {
    const hasApiKey = facebookApiKeyInput.value.trim() !== "";
    facebookPageIdContainer.style.display = hasApiKey ? "block" : "none";
    facebookPageIdInput.required = hasApiKey;
  });

  // Populate user select
  const userSelect = document.getElementById("botUserId");
  fetch("/api/users", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  })
    .then((res) => {
        if (!res.ok) throw new Error("فشل جلب المستخدمين");
        return res.json();
    })
    .then((users) => {
      userSelect.innerHTML = "<option value=\"\">اختر مستخدم</option>"; // Clear loading/error message
      users.forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
      });
    })
    .catch((err) => {
      console.error("خطأ في جلب المستخدمين للنموذج:", err);
      userSelect.innerHTML = "<option value=\"\">خطأ في تحميل المستخدمين</option>";
      document.getElementById("botFormError").textContent = "خطأ في جلب قائمة المستخدمين.";
      document.getElementById("botFormError").style.display = "block";
    });

  document.getElementById("createBotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("botName").value;
    const userId = document.getElementById("botUserId").value;
    const facebookApiKey = document.getElementById("facebookApiKey").value.trim();
    const facebookPageId = document.getElementById("facebookPageId").value.trim();
    const errorEl = document.getElementById("botFormError");
    errorEl.style.display = "none";

    if (!userId) {
        errorEl.textContent = "يرجى اختيار المستخدم المالك للبوت.";
        errorEl.style.display = "block";
        return;
    }
    if (facebookApiKey && !facebookPageId) {
        errorEl.textContent = "يرجى إدخال معرف صفحة فيسبوك طالما تم إدخال مفتاح API.";
        errorEl.style.display = "block";
        return;
    }

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, userId, facebookApiKey, facebookPageId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم إنشاء البوت بنجاح!");
        hideForm(container);
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      } else {
        errorEl.textContent = data.message || "فشل في إنشاء البوت";
        errorEl.style.display = "block";
      }
    } catch (err) {
      console.error("خطأ في إنشاء البوت:", err);
      errorEl.textContent = "خطأ في الاتصال بالخادم";
      errorEl.style.display = "block";
    }
  });
}

function showEditBotForm(container, botId, currentName, currentApiKey, currentPageId, ownerUserId) {
  container.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-edit"></i> تعديل البوت: ${currentName}</h3>
      <form id="editBotForm">
        <div class="form-group">
          <label for="editBotName">اسم البوت</label>
          <input type="text" id="editBotName" value="${currentName}" required>
        </div>
        <div class="form-group">
          <label for="editBotUserId">المستخدم المالك</label>
          <select id="editBotUserId" required>
            <option value="">جار التحميل...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editFacebookApiKey">مفتاح API لفيسبوك (اختياري)</label>
          <input type="text" id="editFacebookApiKey" value="${currentApiKey || ''}">
        </div>
        <div class="form-group" id="editFacebookPageIdContainer" style="display: ${currentApiKey ? 'block' : 'none'}">
          <label for="editFacebookPageId">معرف صفحة فيسبوك (مطلوب إذا تم إدخال API)</label>
          <input type="text" id="editFacebookPageId" value="${currentPageId || ''}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
          <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('formContainer'))">إلغاء</button>
        </div>
        <p id="editBotFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  container.style.display = "block";

  const facebookApiKeyInput = document.getElementById("editFacebookApiKey");
  const facebookPageIdContainer = document.getElementById("editFacebookPageIdContainer");
  const facebookPageIdInput = document.getElementById("editFacebookPageId");

  facebookApiKeyInput.addEventListener("input", () => {
    const hasApiKey = facebookApiKeyInput.value.trim() !== "";
    facebookPageIdContainer.style.display = hasApiKey ? "block" : "none";
    facebookPageIdInput.required = hasApiKey;
  });

  // Populate user select
  const userSelect = document.getElementById("editBotUserId");
  fetch("/api/users", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  })
    .then((res) => {
        if (!res.ok) throw new Error("فشل جلب المستخدمين");
        return res.json();
    })
    .then((users) => {
      userSelect.innerHTML = "<option value=\"\">اختر مستخدم</option>";
      users.forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}" ${user._id === ownerUserId ? 'selected' : ''}>${user.username}</option>`;
      });
    })
    .catch((err) => {
      console.error("خطأ في جلب المستخدمين للنموذج:", err);
      userSelect.innerHTML = "<option value=\"\">خطأ في تحميل المستخدمين</option>";
      document.getElementById("editBotFormError").textContent = "خطأ في جلب قائمة المستخدمين.";
      document.getElementById("editBotFormError").style.display = "block";
    });

  document.getElementById("editBotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("editBotName").value;
    const userId = document.getElementById("editBotUserId").value;
    const facebookApiKey = document.getElementById("editFacebookApiKey").value.trim();
    const facebookPageId = document.getElementById("editFacebookPageId").value.trim();
    const errorEl = document.getElementById("editBotFormError");
    errorEl.style.display = "none";

    if (!userId) {
        errorEl.textContent = "يرجى اختيار المستخدم المالك للبوت.";
        errorEl.style.display = "block";
        return;
    }
    if (facebookApiKey && !facebookPageId) {
        errorEl.textContent = "يرجى إدخال معرف صفحة فيسبوك طالما تم إدخال مفتاح API.";
        errorEl.style.display = "block";
        return;
    }

    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, userId, facebookApiKey, facebookPageId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم تعديل البوت بنجاح!");
        hideForm(container);
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
        // Update bot selector in header if the edited bot was selected
        const botSelectDashboard = document.getElementById('botSelectDashboard');
        if (botSelectDashboard && botSelectDashboard.value === botId) {
            const option = botSelectDashboard.querySelector(`option[value="${botId}"]`);
            if (option) option.textContent = name; // Update name in dropdown
        }
      } else {
        errorEl.textContent = data.message || "فشل في تعديل البوت";
        errorEl.style.display = "block";
      }
    } catch (err) {
      console.error("خطأ في تعديل البوت:", err);
      errorEl.textContent = "خطأ في الاتصال بالخادم";
      errorEl.style.display = "block";
    }
  });
}

async function deleteBot(botId) {
  if (confirm("هل أنت متأكد من حذف هذا البوت؟ سيتم حذف جميع قواعده ورسائله.")) {
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم حذف البوت بنجاح");
        await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
        // Remove bot from header selector if it was deleted
        const botSelectDashboard = document.getElementById('botSelectDashboard');
        if (botSelectDashboard && botSelectDashboard.value === botId) {
            localStorage.removeItem('selectedBotId');
            botSelectDashboard.value = ''; // Reset selection
            // Optionally reload the current page or show placeholder
            const currentHash = window.location.hash.substring(1);
            if (currentHash && currentHash !== 'bots') {
                loadPageContent('bots'); // Go back to bots page or another default
            } else {
                 document.getElementById('content').innerHTML = `<div class="placeholder"><h2>تم حذف البوت المحدد</h2><p>يرجى اختيار بوت آخر أو إنشاء بوت جديد.</p></div>`;
            }
        }
        // Refresh bot list in header
        if (typeof populateBotSelect === 'function') { // Check if function exists from dashboard_new.js
            populateBotSelect();
        }

      } else {
        alert(data.message || "فشل في حذف البوت");
      }
    } catch (err) {
      console.error("خطأ في حذف البوت:", err);
      alert("خطأ في الاتصال بالخادم");
    }
  }
}

function hideForm(container) {
  container.innerHTML = "";
  container.style.display = "none";
}

// Make functions globally accessible if they are called via onclick
window.showCreateUserForm = showCreateUserForm;
window.showEditUserForm = showEditUserForm;
window.deleteUser = deleteUser;
window.showCreateBotForm = showCreateBotForm;
window.showEditBotForm = showEditBotForm;
window.deleteBot = deleteBot;
window.hideForm = hideForm;
window.loadBotsPage = loadBotsPage; // Ensure loadBotsPage is globally accessible for dashboard_new.js

