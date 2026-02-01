// public/js/bots.js (Updated for new dashboard design and unified error handling)

const botsState = {
  users: [],
};

// مفتاح تخزين الكاش للصفحة لضمان إتاحته لكل الدوال
const botsCacheKey = 'bots-page-cache';

function openPlatformModal(innerHtml) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content">${innerHtml}</div>`;
  document.body.appendChild(modal);
  const closeModal = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', closeModal));
  return { modal, closeModal };
}

async function loadBotsPage() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/bots.css";
  document.head.appendChild(link);
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
    <div class="page-hero platform-hero">
      <div>
        <p class="eyebrow">إدارة المنصة</p>
        <h2><i class="fas fa-sitemap"></i> تحكم شامل في البوتات والمستخدمين</h2>
        <p class="subhead">سيطر على كل البوتات والمستخدمين من مكان واحد: إنشاء، تشغيل/إيقاف، إرسال تنبيهات، ومراجعة الاشتراكات والربط.</p>
        <div class="hero-actions">
          <button id="showCreateUserBtn" class="btn btn-secondary"><i class="fas fa-user-plus"></i> إنشاء مستخدم</button>
          <button id="showCreateBotBtn" class="btn btn-primary"><i class="fas fa-plus-circle"></i> إنشاء بوت</button>
          <button id="showQuickControlBtn" class="btn btn-ghost"><i class="fas fa-tachometer-alt"></i> لوحة تحكم سريعة</button>
          <button id="sendNotificationBtn" class="btn btn-ghost"><i class="fas fa-bell"></i> إشعارات وترحيب</button>
        </div>
      </div>
      <div class="hero-kpi">
        <div class="kpi-pill" id="kpiTotalBots">-- بوت</div>
        <div class="kpi-pill success" id="kpiActiveBots">-- نشط</div>
        <div class="kpi-pill warn" id="kpiPausedBots">-- متوقف</div>
        <div class="kpi-pill muted" id="kpiUsers">-- مستخدم</div>
      </div>
    </div>

    <div id="formContainer" class="form-section" style="display: none;"></div>

    <div class="platform-stats" id="platformStats"></div>

    <div class="platform-filters">
      <div class="form-group inline">
        <label for="botSearchInput"><i class="fas fa-search"></i> بحث</label>
        <input type="text" id="botSearchInput" placeholder="ابحث عن مستخدم، بوت، أو صفحة...">
      </div>
      <div class="filter-row">
        <div class="form-group inline">
          <label for="statusFilter">الحالة</label>
          <select id="statusFilter">
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">متوقف</option>
          </select>
        </div>
        <div class="form-group inline">
          <label for="subscriptionFilter">الاشتراك</label>
          <select id="subscriptionFilter">
            <option value="all">الكل</option>
            <option value="free">مجاني</option>
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
        <div class="form-group inline">
          <label for="ownerFilter">المستخدم</label>
          <select id="ownerFilter">
            <option value="all">جميع المستخدمين</option>
            <option value="withBots">مع بوتات</option>
            <option value="withoutBots">بدون بوتات</option>
          </select>
        </div>
      </div>
    </div>

    <div class="bots-users-container">
      <div class="section-head">
        <div>
          <h3><i class="fas fa-layer-group"></i> قائمة المنصة</h3>
          <p class="muted">عرض مجمّع للمستخدمين والبوتات بحسب الفلاتر الحالية.</p>
        </div>
        <div class="chip-group" id="filtersChips"></div>
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
  const showQuickControlBtn = document.getElementById("showQuickControlBtn");
  const sendNotificationBtn = document.getElementById("sendNotificationBtn");
  const botSearchInput = document.getElementById("botSearchInput");
  const statusFilter = document.getElementById("statusFilter");
  const subscriptionFilter = document.getElementById("subscriptionFilter");
  const ownerFilter = document.getElementById("ownerFilter");
  const filtersChips = document.getElementById("filtersChips");
  const statsContainer = document.getElementById("platformStats");
  const kpiTotalBots = document.getElementById("kpiTotalBots");
  const kpiActiveBots = document.getElementById("kpiActiveBots");
  const kpiPausedBots = document.getElementById("kpiPausedBots");
  const kpiUsers = document.getElementById("kpiUsers");

  const currentFilters = { status: 'all', subscription: 'all', owner: 'all' };

  showCreateUserBtn.addEventListener("click", () => showCreateUserForm(formContainer));
  showCreateBotBtn.addEventListener("click", () => showCreateBotForm(formContainer));
  showQuickControlBtn.addEventListener("click", () => showQuickControlPanel(formContainer));
  sendNotificationBtn.addEventListener("click", () => showSendNotificationForm());

  // Search functionality
  const applyFilters = () => {
    const searchTerm = botSearchInput.value.toLowerCase().trim();
    currentFilters.status = statusFilter.value;
    currentFilters.subscription = subscriptionFilter.value;
    currentFilters.owner = ownerFilter.value;

    const matchesBotFilters = (bot) => {
      if (currentFilters.status === 'active' && !bot.isActive) return false;
      if (currentFilters.status === 'inactive' && bot.isActive) return false;
      if (currentFilters.subscription !== 'all' && (bot.subscriptionType || 'free') !== currentFilters.subscription) return false;
      return true;
    };

    const filteredUsers = botsState.users.filter(user => {
      const bots = Array.isArray(user.bots) ? user.bots : [];
      const filteredBots = bots.filter(matchesBotFilters);

      if (currentFilters.owner === 'withBots' && filteredBots.length === 0) return false;
      if (currentFilters.owner === 'withoutBots' && bots.length > 0) return false;

      const usernameMatch = (user.username || '').toLowerCase().includes(searchTerm);
      const emailMatch = (user.email || '').toLowerCase().includes(searchTerm);
      const whatsappMatch = (user.whatsapp || '').toLowerCase().includes(searchTerm);
      const botMatch = filteredBots.some(bot => (bot.name || '').toLowerCase().includes(searchTerm) || (bot.facebookPageId || '').toLowerCase().includes(searchTerm));

      const textMatch = !searchTerm || usernameMatch || emailMatch || whatsappMatch || botMatch;
      if (!textMatch) return false;

      // احتفظ بالمستخدم فقط لو لديه بوت مطابق للفلاتر الحالية أو لا توجد بوتات والفلاتر لا تشترط حالة معينة
      if (filteredBots.length > 0) return true;
      return currentFilters.status === 'all' && bots.length === 0;
    }).map(user => ({ ...user }));

    renderUsersGrid(filteredUsers, usersGrid, currentFilters);
    renderPlatformStats(filteredUsers, statsContainer, { kpiTotalBots, kpiActiveBots, kpiPausedBots, kpiUsers });
    renderFilterChips(currentFilters, filtersChips);
  };

  botSearchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  subscriptionFilter.addEventListener("change", applyFilters);
  ownerFilter.addEventListener("change", applyFilters);
  window._botsPageApplyFilters = applyFilters;

  // Apply cached list instantly if available
  const cached = window.readPageCache ? window.readPageCache(botsCacheKey, 'global', 3 * 60 * 1000) : null;
  if (cached?.users) {
    botsState.users = cached.users;
    applyFilters();
  }

  try {
    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";
    usersGrid.innerHTML = "";
    await fetchUsersAndBots(usersGrid, loadingSpinner, errorMessage, applyFilters);
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

// Function to render the user grid
function renderUsersGrid(usersToRender, gridElement, filters = null) {
  gridElement.innerHTML = ""; // Clear grid before adding new cards

  if (usersToRender.length === 0) {
    gridElement.innerHTML = 
      '<div class="card placeholder-card"><p>لا يوجد مستخدمين أو بوتات تطابق البحث.</p></div>';
    return;
  }

  const matchesBotFilters = (bot) => {
    if (!filters) return true;
    if (filters.status === 'active' && !bot.isActive) return false;
    if (filters.status === 'inactive' && bot.isActive) return false;
    if (filters.subscription !== 'all' && (bot.subscriptionType || 'free') !== filters.subscription) return false;
    return true;
  };

  usersToRender.forEach((user) => {
    const bots = Array.isArray(user.bots) ? user.bots : [];
    const filteredBots = bots.filter(matchesBotFilters);

    const activeCount = filteredBots.filter(b => b.isActive).length;
    const pausedCount = filteredBots.length - activeCount;

    const botsHtml = filteredBots.length > 0
      ? filteredBots.map(bot => {
          const subLabel = bot.subscriptionType === 'yearly' ? 'سنوي' : bot.subscriptionType === 'monthly' ? 'شهري' : 'مجاني';
          const autoStop = bot.autoStopDate ? new Date(bot.autoStopDate).toLocaleDateString('ar-EG') : '—';
          return `
          <div class="bot-entry">
            <div class="bot-main">
              <div class="bot-name"><i class="fas fa-robot"></i> ${bot.name}</div>
              ${bot.facebookPageId ? `<a class="bot-link" href="https://facebook.com/${bot.facebookPageId}" target="_blank" title="صفحة فيسبوك"><i class="fab fa-facebook-square"></i></a>` : ''}
            </div>
            <div class="bot-meta">
              <span class="chip ${bot.isActive ? 'chip-success' : 'chip-danger'}">${bot.isActive ? 'نشط' : 'متوقف'}</span>
              <span class="chip chip-muted">${subLabel}</span>
              <span class="chip chip-soft">إيقاف تلقائي: ${autoStop}</span>
            </div>
            <div class="bot-actions">
              <button class="btn-icon btn-edit" onclick="showEditBotModal('${bot._id}', '${bot.name}', '${bot.facebookApiKey || ''}', '${bot.facebookPageId || ''}', '${user._id}', ${bot.isActive}, '${bot.autoStopDate || ''}', '${bot.subscriptionType}', '${bot.welcomeMessage || ''}')" title="تعديل البوت"><i class="fas fa-edit"></i></button>
              <button class="btn-icon btn-toggle" onclick="toggleBotStatus('${bot._id}', ${bot.isActive})" title="${bot.isActive ? 'إيقاف البوت' : 'تشغيل البوت'}"><i class="fas ${bot.isActive ? 'fa-pause' : 'fa-play'}"></i></button>
              <button class="btn-icon btn-delete" onclick="deleteBot('${bot._id}')" title="حذف البوت"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
        `;}).join("")
      : '<p class="no-bots">لا توجد بوتات تطابق الفلاتر الحالية لهذا المستخدم.</p>';

    const card = document.createElement("div");
    card.className = "card user-bot-card";
    const userRoleLabel = user.role === 'superadmin' ? 'مدير عام' : 'مستخدم';
    const subscriptionText = user.subscriptionType === 'yearly' ? 'اشتراك سنوي' : user.subscriptionType === 'monthly' ? 'اشتراك شهري' : 'باقة مجانية';
    card.innerHTML = `
      <div class="card-header">
        <div class="user-info">
          <h4><i class="fas fa-user-circle"></i> ${user.username}</h4>
          <p class="user-meta">${user.email || '—'} · ${user.whatsapp || 'بدون واتساب'} · ${subscriptionText}</p>
        </div>
        <div class="user-pills">
          <span class="user-role ${user.role}">${userRoleLabel}</span>
          <span class="chip chip-soft">${filteredBots.length} بوت</span>
          <span class="chip chip-success">${activeCount} نشط</span>
          <span class="chip chip-muted">${pausedCount} متوقف</span>
        </div>
      </div>
      <div class="card-body">
        <div class="bots-list">${botsHtml}</div>
      </div>
      <div class="card-footer">
        <button class="btn btn-sm btn-outline-secondary" onclick="showEditUserForm(document.getElementById('formContainer'), '${user._id}', '${user.username}', '${user.role}', '${user.email}', '${user.whatsapp || ''}', '${user.subscriptionType}', '${user.subscriptionEndDate || ''}')"><i class="fas fa-user-edit"></i> تعديل المستخدم</button>
        ${user.role !== 'superadmin' ? 
        `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')"><i class="fas fa-user-times"></i> حذف المستخدم</button>` : ''}
      </div>
    `;
    gridElement.appendChild(card);
  });
}

function computePlatformMetrics(users) {
  const bots = [];
  users.forEach((u) => {
    const list = Array.isArray(u.bots) ? u.bots : [];
    list.forEach((b) => bots.push(b));
  });

  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const pausedBots = totalBots - activeBots;
  const freeBots = bots.filter((b) => (b.subscriptionType || 'free') === 'free').length;
  const monthlyBots = bots.filter((b) => b.subscriptionType === 'monthly').length;
  const yearlyBots = bots.filter((b) => b.subscriptionType === 'yearly').length;
  const usersCount = users.length;
  const ownersWithBots = users.filter((u) => Array.isArray(u.bots) && u.bots.length > 0).length;

  return { totalBots, activeBots, pausedBots, freeBots, monthlyBots, yearlyBots, usersCount, ownersWithBots };
}

function renderPlatformStats(users, container, kpisRefs = {}) {
  if (!container) return;
  const m = computePlatformMetrics(users);

  const cards = [
    { label: 'إجمالي البوتات', value: m.totalBots, icon: 'fa-robot' },
    { label: 'البوتات النشطة', value: m.activeBots, icon: 'fa-bolt' },
    { label: 'البوتات المتوقفة', value: m.pausedBots, icon: 'fa-pause' },
    { label: 'المستخدمون', value: m.usersCount, icon: 'fa-users' },
    { label: 'اشتراك مجاني', value: m.freeBots, icon: 'fa-leaf' },
    { label: 'اشتراك شهري', value: m.monthlyBots, icon: 'fa-calendar-alt' },
    { label: 'اشتراك سنوي', value: m.yearlyBots, icon: 'fa-infinity' },
    { label: 'مستخدمون لديهم بوتات', value: m.ownersWithBots, icon: 'fa-user-check' },
  ];

  container.innerHTML = `
    <div class="stats-grid compact">
      ${cards.map(c => `
        <div class="stat-card">
          <div class="stat-label"><i class="fas ${c.icon}"></i> ${c.label}</div>
          <div class="stat-value">${c.value}</div>
        </div>
      `).join('')}
    </div>
  `;

  const { kpiTotalBots, kpiActiveBots, kpiPausedBots, kpiUsers } = kpisRefs;
  if (kpiTotalBots) kpiTotalBots.textContent = `${m.totalBots} بوت`;
  if (kpiActiveBots) kpiActiveBots.textContent = `${m.activeBots} نشط`;
  if (kpiPausedBots) kpiPausedBots.textContent = `${m.pausedBots} متوقف`;
  if (kpiUsers) kpiUsers.textContent = `${m.usersCount} مستخدم`;
}

function renderFilterChips(filters, container) {
  if (!container) return;
  const chips = [];
  if (filters.status !== 'all') chips.push(filters.status === 'active' ? 'فقط النشطة' : 'فقط المتوقفة');
  if (filters.subscription !== 'all') chips.push(`اشتراك: ${filters.subscription === 'monthly' ? 'شهري' : filters.subscription === 'yearly' ? 'سنوي' : 'مجاني'}`);
  if (filters.owner === 'withBots') chips.push('مستخدمون لديهم بوتات');
  if (filters.owner === 'withoutBots') chips.push('مستخدمون بدون بوتات');

  container.innerHTML = chips.length
    ? chips.map(c => `<span class="chip chip-soft">${c}</span>`).join('')
    : '<span class="muted">لا توجد فلاتر مفعّلة</span>';
}

async function fetchUsersAndBots(gridElement, spinner, errorElement, onData) {
  const token = localStorage.getItem("token");
  try {
    spinner.style.display = "flex";
    errorElement.style.display = "none";
    const fetchedUsers = await handleApiRequest("/api/users?populate=bots", {
      headers: { Authorization: `Bearer ${token}` },
    }, errorElement, "فشل في جلب المستخدمين");
    botsState.users = fetchedUsers || [];
    window.writePageCache && window.writePageCache(botsCacheKey, 'global', { users: botsState.users });
    const renderCb = onData || window._botsPageApplyFilters;
    if (renderCb) {
      renderCb();
    } else if (gridElement) {
      renderUsersGrid(botsState.users, gridElement);
    }
    spinner.style.display = "none";
  } catch (err) {
    spinner.style.display = "none";
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

// Function to show quick control panel
async function showQuickControlPanel() {
  const token = localStorage.getItem("token");
  const { modal, closeModal } = openPlatformModal(`
    <div class="form-card">
      <div class="modal-header">
        <h3><i class="fas fa-tachometer-alt"></i> لوحة التحكم السريع</h3>
        <button class="modal-close-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
      <div id="botsTable" class="table-container"></div>
      <div id="quickControlError" class="error-message" style="display: none;"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">إغلاق</button>
      </div>
    </div>
  `);

  const botsTable = modal.querySelector("#botsTable");
  const errorEl = modal.querySelector("#quickControlError");

  try {
    const bots = await handleApiRequest("/api/bots", {
      headers: { Authorization: `Bearer ${token}` },
    }, errorEl, "فشل في جلب البوتات");

    if (bots.length === 0) {
      botsTable.innerHTML = '<p>لا توجد بوتات متاحة.</p>';
      return;
    }

    botsTable.innerHTML = `
      <table class="bots-table">
        <thead>
          <tr>
            <th>اسم البوت</th>
            <th>المستخدم المالك</th>
            <th>الحالة</th>
            <th>نوع الاشتراك</th>
            <th>تاريخ الإيقاف</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${bots.map(bot => `
            <tr>
              <td>${bot.name}</td>
              <td>${bot.userId?.username || 'غير معروف'}</td>
              <td><span class="bot-status ${bot.isActive ? 'active' : 'inactive'}">${bot.isActive ? 'يعمل' : 'متوقف'}</span></td>
              <td>${bot.subscriptionType === 'free' ? 'مجاني' : bot.subscriptionType === 'monthly' ? 'شهري' : 'سنوي'}</td>
              <td>${bot.autoStopDate ? new Date(bot.autoStopDate).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
              <td>
                <button class="btn-icon btn-toggle" onclick="toggleBotStatus('${bot._id}', ${bot.isActive})" title="${bot.isActive ? 'إيقاف البوت' : 'تشغيل البوت'}"><i class="fas ${bot.isActive ? 'fa-pause' : 'fa-play'}"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

// Function to toggle bot status
async function toggleBotStatus(botId, isActive) {
  const errorEl = document.getElementById("errorMessage") || document.getElementById("quickControlError");
  errorEl.style.display = "none";
  try {
    await handleApiRequest(`/api/bots/${botId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ isActive: !isActive }),
    }, errorEl, "فشل في تغيير حالة البوت");
    alert(`تم ${isActive ? 'إيقاف' : 'تشغيل'} البوت بنجاح!`);
    const formContainer = document.getElementById("formContainer");
    if (formContainer.style.display === "block" && formContainer.innerHTML.includes("لوحة التحكم السريع")) {
      showQuickControlPanel(formContainer);
    } else {
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
    }
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

// Function to show the send notification form
function showSendNotificationForm() {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>إرسال إشعار أو تعديل رسائل الترحيب</h3>
        <button class="modal-close-btn"><i class="fas fa-times"></i></button>
      </div>
      <form id="sendNotificationForm">
        <div class="form-group">
          <label for="notificationTitle">عنوان الإشعار</label>
          <input type="text" id="notificationTitle" placeholder="أدخل عنوان الإشعار" required>
        </div>
        <div class="form-group">
          <label for="notificationMessage">الرسالة</label>
          <textarea id="notificationMessage" placeholder="أدخل نص الإشعار" required></textarea>
        </div>
        <div class="form-group">
          <label for="botSelectNotification">البوت (لرسائل الترحيب)</label>
          <select id="botSelectNotification">
            <option value="">اختر بوت (اختياري)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="welcomeMessage">رسالة الترحيب (إذا تم اختيار بوت)</label>
          <textarea id="welcomeMessage" placeholder="أدخل رسالة الترحيب"></textarea>
        </div>
        <button type="submit">إرسال / حفظ</button>
      </form>
      <p id="notificationFormError" class="error-message" style="display: none;"></p>
    </div>
  `;
  document.body.appendChild(modal);

  const botSelect = modal.querySelector("#botSelectNotification");
  const welcomeMessageInput = modal.querySelector("#welcomeMessage");
  const errorEl = modal.querySelector("#notificationFormError");

  // Populate bot select
  try {
    handleApiRequest("/api/bots", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }, errorEl, "فشل في جلب البوتات").then(bots => {
      botSelect.innerHTML = "<option value=\"\">اختر بوت (اختياري)</option>";
      bots.forEach(bot => {
        botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
      });
    }).catch(() => {
      botSelect.innerHTML = "<option value=\"\">خطأ في تحميل البوتات</option>";
    });
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }

  modal.querySelector(".modal-close-btn").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#sendNotificationForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = modal.querySelector("#notificationTitle").value;
    const message = modal.querySelector("#notificationMessage").value;
    const botId = modal.querySelector("#botSelectNotification").value;
    const welcomeMessage = modal.querySelector("#welcomeMessage").value;
    errorEl.style.display = "none";

    try {
      if (botId && welcomeMessage) {
        // تحديث رسالة الترحيب للبوت
        await handleApiRequest(`/api/bots/${botId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ welcomeMessage }),
        }, errorEl, "فشل في تحديث رسالة الترحيب");
      }

      if (title && message) {
        // إرسال إشعار عام
        const response = await fetch("/api/notifications/global", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ title, message }),
        });
        const data = await response.json();
        if (!response.ok) {
          errorEl.textContent = data.message;
          errorEl.style.display = "block";
          return;
        }
      }

      alert("تم إرسال الإشعار أو حفظ رسالة الترحيب بنجاح");
      modal.remove();
    } catch (error) {
      errorEl.textContent = "خطأ في السيرفر";
      errorEl.style.display = "block";
    }
  });
}

// --- Form Functions (Create/Edit User/Bot) ---

function showCreateUserForm() {
  const { modal, closeModal } = openPlatformModal(`
    <div class="form-card">
      <div class="modal-header">
        <h3><i class="fas fa-user-plus"></i> إنشاء مستخدم جديد</h3>
        <button class="modal-close-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
      <form id="createUserForm">
        <div class="form-group">
          <label for="newUsername">اسم المستخدم</label>
          <input type="text" id="newUsername" required>
          <small class="form-text">سيتم تخزين اسم المستخدم بحروف صغيرة (مثال: "TestUser" يصبح "testuser")</small>
        </div>
        <div class="form-group">
          <label for="newEmail">البريد الإلكتروني</label>
          <input type="email" id="newEmail" required>
        </div>
        <div class="form-group">
          <label for="newWhatsapp">رقم الواتساب</label>
          <input type="text" id="newWhatsapp" required>
        </div>
        <div class="form-group">
          <label for="newPassword">كلمة المرور</label>
          <input type="password" id="newPassword" required>
        </div>
        <div class="form-group">
          <label for="confirmPassword">تأكيد كلمة المرور</label>
          <input type="password" id="confirmPassword" required>
        </div>
        <div class="form-group">
          <label for="newUserRole">الدور</label>
          <select id="newUserRole">
            <option value="user">مستخدم</option>
            <option value="superadmin">مدير عام</option>
          </select>
        </div>
        <div class="form-group">
          <label for="newSubscriptionType">نوع الاشتراك</label>
          <select id="newSubscriptionType">
            <option value="free">مجاني</option>
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
        <div class="form-group">
          <label for="newSubscriptionEndDate">تاريخ انتهاء الاشتراك (اختياري)</label>
          <input type="date" id="newSubscriptionEndDate">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">إنشاء</button>
          <button type="button" class="btn btn-secondary modal-close-btn">إلغاء</button>
        </div>
        <p id="userFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `);

  modal.querySelector("#createUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let username = modal.querySelector("#newUsername").value.trim();
    const email = modal.querySelector("#newEmail").value.trim();
    const whatsapp = modal.querySelector("#newWhatsapp").value.trim();
    const password = modal.querySelector("#newPassword").value;
    const confirmPassword = modal.querySelector("#confirmPassword").value;
    const role = modal.querySelector("#newUserRole").value;
    const subscriptionType = modal.querySelector("#newSubscriptionType").value;
    const subscriptionEndDate = modal.querySelector("#newSubscriptionEndDate").value || null;
    const errorEl = modal.querySelector("#userFormError");
    errorEl.style.display = "none";

    // تحويل الـ username للحروف الصغيرة في الـ frontend
    username = username.toLowerCase();

    // تحقق محلي لتطابق كلمة السر
    if (password !== confirmPassword) {
      errorEl.textContent = "كلمات المرور غير متطابقة";
      errorEl.style.display = "block";
      return;
    }

    try {
      await handleApiRequest("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ username, email, whatsapp, password, confirmPassword, role, subscriptionType, subscriptionEndDate }),
      }, errorEl, "فشل في إنشاء المستخدم");
      alert("تم إنشاء المستخدم بنجاح!");
      closeModal();
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  });
}

function showEditUserForm(container, userId, currentUsername, currentRole, currentEmail, currentWhatsapp, currentSubscriptionType, currentSubscriptionEndDate) {
  container.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-user-edit"></i> تعديل المستخدم: ${currentUsername}</h3>
      <form id="editUserForm">
        <div class="form-group">
          <label for="editUsername">اسم المستخدم</label>
          <input type="text" id="editUsername" value="${currentUsername}" required>
          <small class="form-text">سيتم تخزين اسم المستخدم بحروف صغيرة (مثال: "TestUser" يصبح "testuser")</small>
        </div>
        <div class="form-group">
          <label for="editEmail">البريد الإلكتروني</label>
          <input type="email" id="editEmail" value="${currentEmail}" required>
        </div>
        <div class="form-group">
          <label for="editWhatsapp">رقم الواتساب</label>
          <input type="text" id="editWhatsapp" value="${currentWhatsapp}">
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
        <div class="form-group">
          <label for="editSubscriptionType">نوع الاشتراك</label>
          <select id="editSubscriptionType">
            <option value="free" ${currentSubscriptionType === 'free' ? 'selected' : ''}>مجاني</option>
            <option value="monthly" ${currentSubscriptionType === 'monthly' ? 'selected' : ''}>شهري</option>
            <option value="yearly" ${currentSubscriptionType === 'yearly' ? 'selected' : ''}>سنوي</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editSubscriptionEndDate">تاريخ انتهاء الاشتراك (اختياري)</label>
          <input type="date" id="editSubscriptionEndDate" value="${currentSubscriptionEndDate ? new Date(currentSubscriptionEndDate).toISOString().split('T')[0] : ''}">
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
    let username = document.getElementById("editUsername").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const whatsapp = document.getElementById("editWhatsapp").value.trim();
    const password = document.getElementById("editPassword").value;
    const role = document.getElementById("editUserRole").value;
    const subscriptionType = document.getElementById("editSubscriptionType").value;
    const subscriptionEndDate = document.getElementById("editSubscriptionEndDate").value || null;
    const errorEl = document.getElementById("editUserFormError");
    errorEl.style.display = "none";

    // تحويل الـ username للحروف الصغيرة في الـ frontend
    username = username.toLowerCase();

    const updateData = { username, email, whatsapp, role, subscriptionType, subscriptionEndDate };
    if (password) {
      updateData.password = password;
    }

    try {
      await handleApiRequest(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      }, errorEl, "فشل في تعديل المستخدم");
      alert("تم تعديل المستخدم بنجاح!");
      hideForm(container);
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  });
}

async function deleteUser(userId) {
  if (confirm("هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع البوتات المرتبطة به.")) {
    const errorEl = document.getElementById("errorMessage");
    errorEl.style.display = "none";
    try {
      await handleApiRequest(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }, errorEl, "فشل في حذف المستخدم");
      alert("تم حذف المستخدم بنجاح");
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  }
}

function showCreateBotForm() {
  const { modal, closeModal } = openPlatformModal(`
    <div class="form-card">
      <div class="modal-header">
        <h3><i class="fas fa-plus-circle"></i> إنشاء بوت جديد</h3>
        <button class="modal-close-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
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
        <div class="form-group">
          <label for="subscriptionType">نوع الاشتراك</label>
          <select id="subscriptionType">
            <option value="free">مجاني</option>
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
          </select>
        </div>
        <div class="form-group">
          <label for="welcomeMessage">رسالة الترحيب (اختياري)</label>
          <textarea id="welcomeMessage" placeholder="أدخل رسالة الترحيب"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">إنشاء البوت</button>
          <button type="button" class="btn btn-secondary modal-close-btn">إلغاء</button>
        </div>
        <p id="botFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `);

  const facebookApiKeyInput = modal.querySelector("#facebookApiKey");
  const facebookPageIdContainer = modal.querySelector("#facebookPageIdContainer");
  const facebookPageIdInput = modal.querySelector("#facebookPageId");

  facebookApiKeyInput.addEventListener("input", () => {
    const hasApiKey = facebookApiKeyInput.value.trim() !== "";
    facebookPageIdContainer.style.display = hasApiKey ? "block" : "none";
    facebookPageIdInput.required = hasApiKey;
  });

  // Populate user select
  const userSelect = modal.querySelector("#botUserId");
  try {
    handleApiRequest("/api/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }, modal.querySelector("#botFormError"), "فشل في جلب المستخدمين").then(users => {
      userSelect.innerHTML = "<option value=\"\">اختر مستخدم</option>";
      users.forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
      });
    }).catch(() => {
      userSelect.innerHTML = "<option value=\"\">خطأ في تحميل المستخدمين</option>";
    });
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }

  modal.querySelector("#createBotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#botName").value;
    const userId = modal.querySelector("#botUserId").value;
    const facebookApiKey = modal.querySelector("#facebookApiKey").value.trim();
    const facebookPageId = modal.querySelector("#facebookPageId").value.trim();
    const subscriptionType = modal.querySelector("#subscriptionType").value;
    const welcomeMessage = modal.querySelector("#welcomeMessage").value.trim();
    const errorEl = modal.querySelector("#botFormError");
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
      await handleApiRequest("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, userId, facebookApiKey, facebookPageId, subscriptionType, welcomeMessage }),
      }, errorEl, "فشل في إنشاء البوت");
      alert("تم إنشاء البوت بنجاح!");
      closeModal();
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  });
}

function showEditBotModal(botId, currentName, currentApiKey, currentPageId, ownerUserId, isActive, autoStopDate, subscriptionType, welcomeMessage) {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-edit"></i> تعديل البوت: ${currentName}</h3>
        <button class="modal-close-btn"><i class="fas fa-times"></i></button>
      </div>
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
        <div class="form-group">
          <label for="editBotStatus">حالة البوت</label>
          <select id="editBotStatus">
            <option value="true" ${isActive ? 'selected' : ''}>يعمل</option>
            <option value="false" ${!isActive ? 'selected' : ''}>متوقف</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editAutoStopDate">تاريخ الإيقاف التلقائي (اختياري)</label>
          <input type="date" id="editAutoStopDate" value="${autoStopDate ? new Date(autoStopDate).toISOString().split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label for="editSubscriptionType">نوع الاشتراك</label>
          <select id="editSubscriptionType">
            <option value="free" ${subscriptionType === 'free' ? 'selected' : ''}>مجاني</option>
            <option value="monthly" ${subscriptionType === 'monthly' ? 'selected' : ''}>شهري</option>
            <option value="yearly" ${subscriptionType === 'yearly' ? 'selected' : ''}>سنوي</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editWelcomeMessage">رسالة الترحيب (اختياري)</label>
          <textarea id="editWelcomeMessage">${welcomeMessage || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
          <button type="button" class="btn btn-secondary modal-close-btn">إلغاء</button>
        </div>
        <p id="editBotFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const facebookApiKeyInput = modal.querySelector("#editFacebookApiKey");
  const facebookPageIdContainer = modal.querySelector("#editFacebookPageIdContainer");
  const facebookPageIdInput = modal.querySelector("#editFacebookPageId");

  facebookApiKeyInput.addEventListener("input", () => {
    const hasApiKey = facebookApiKeyInput.value.trim() !== "";
    facebookPageIdContainer.style.display = hasApiKey ? "block" : "none";
    facebookPageIdInput.required = hasApiKey;
  });

  // Populate user select
  const userSelect = modal.querySelector("#editBotUserId");
  try {
    handleApiRequest("/api/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }, modal.querySelector("#editBotFormError"), "فشل في جلب المستخدمين").then(users => {
      userSelect.innerHTML = "<option value=\"\">اختر مستخدم</option>";
      users.forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}" ${user._id === ownerUserId ? 'selected' : ''}>${user.username}</option>`;
      });
    }).catch(() => {
      userSelect.innerHTML = "<option value=\"\">خطأ في تحميل المستخدمين</option>";
    });
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }

  modal.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", () => modal.remove());
  });

  modal.querySelector("#editBotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = modal.querySelector("#editBotName").value;
    const userId = modal.querySelector("#editBotUserId").value;
    const facebookApiKey = modal.querySelector("#editFacebookApiKey").value.trim();
    const facebookPageId = modal.querySelector("#editFacebookPageId").value.trim();
    const isActive = modal.querySelector("#editBotStatus").value === "true";
    const autoStopDate = modal.querySelector("#editAutoStopDate").value || null;
    const subscriptionType = modal.querySelector("#editSubscriptionType").value;
    const welcomeMessage = modal.querySelector("#editWelcomeMessage").value.trim();
    const errorEl = modal.querySelector("#editBotFormError");
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
      await handleApiRequest(`/api/bots/${botId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, userId, facebookApiKey, facebookPageId, isActive, autoStopDate, subscriptionType, welcomeMessage }),
      }, errorEl, "فشل في تعديل البوت");
      alert("تم تعديل البوت بنجاح!");
      modal.remove();
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      // Update bot selector in header if the edited bot was selected
      const botSelectDashboard = document.getElementById('botSelectDashboard');
      if (botSelectDashboard && botSelectDashboard.value === botId) {
        const option = botSelectDashboard.querySelector(`option[value="${botId}"]`);
        if (option) option.textContent = name;
      }
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  });
}

async function deleteBot(botId) {
  if (confirm("هل أنت متأكد من حذف هذا البوت؟ سيتم حذف جميع قواعده ورسائله.")) {
    const errorEl = document.getElementById("errorMessage");
    errorEl.style.display = "none";
    try {
      await handleApiRequest(`/api/bots/${botId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }, errorEl, "فشل في حذف البوت");
      alert("تم حذف البوت بنجاح");
      await fetchUsersAndBots(document.getElementById("usersGrid"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      // Remove bot from header selector if it was deleted
      const botSelectDashboard = document.getElementById('botSelectDashboard');
      if (botSelectDashboard && botSelectDashboard.value === botId) {
        localStorage.removeItem('selectedBotId');
        botSelectDashboard.value = '';
        const currentHash = window.location.hash.substring(1);
        if (currentHash && currentHash !== 'bots') {
          loadPageContent('bots');
        } else {
          document.getElementById('content').innerHTML = `<div class="placeholder"><h2>تم حذف البوت المحدد</h2><p>يرجى اختيار بوت آخر أو إنشاء بوت جديد.</p></div>`;
        }
      }
      if (typeof populateBotSelect === 'function') {
        populateBotSelect();
      }
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  }
}

function hideForm(container) {
  container.innerHTML = "";
  container.style.display = "none";
}

// Make functions globally accessible
window.showCreateUserForm = showCreateUserForm;
window.showEditUserForm = showEditUserForm;
window.deleteUser = deleteUser;
window.showCreateBotForm = showCreateBotForm;
window.showEditBotModal = showEditBotModal;
window.toggleBotStatus = toggleBotStatus;
window.deleteBot = deleteBot;
window.hideForm = hideForm;
window.loadBotsPage = loadBotsPage;
window.showSendNotificationForm = showSendNotificationForm;
window.showQuickControlPanel = showQuickControlPanel;
