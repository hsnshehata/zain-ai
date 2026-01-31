document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  if (typeof window.logoutUser !== 'function') {
    window.logoutUser = () => {
      localStorage.clear();
      window.location.href = '/login.html';
    };
  }

  const statusEl = document.getElementById('link-status') || document.getElementById('hero-link-status');
  const statusSub = document.getElementById('status-subtext');
  const statusDot = document.getElementById('status-dot');
  const codeEl = document.getElementById('link-code');
  const expiryEl = document.getElementById('link-expiry');
  const webhookEl = document.getElementById('webhook-url');
  const botHint = document.getElementById('bot-hint');
  const openBotBtn = document.getElementById('open-bot');
  const botSelect = document.getElementById('botSelect');
  const heroGenerateBtn = document.getElementById('hero-generate');
  const heroOpenBtn = document.getElementById('hero-open');
  const heroStatus = document.getElementById('hero-status');
  const heroLinkStatus = document.getElementById('hero-link-status');
  const heroLinkSubtext = document.getElementById('hero-link-subtext');
  const heroCode = document.getElementById('link-code');
  const heroExpiry = document.getElementById('link-expiry');

  const prefNewOrder = document.getElementById('pref-new-order');
  const prefOrderStatus = document.getElementById('pref-order-status');
  const prefChatOrder = document.getElementById('pref-chat-order');
  const prefDailySummary = document.getElementById('pref-daily-summary');

  const copyBtn = document.getElementById('copy-code');
  const genBtn = document.getElementById('generate-code');
  const savePrefsBtn = document.getElementById('save-prefs');
  const unlinkBtn = document.getElementById('unlink');
  const logoutBtn = document.querySelector('.logout-btn');
  const notificationsBtn = document.getElementById('notifications-btn');

  const webhookUrl = `${window.location.origin}/api/telegram/webhook`;
  if (webhookEl) webhookEl.textContent = webhookUrl;

  if (heroGenerateBtn) heroGenerateBtn.addEventListener('click', () => genBtn?.click());
  if (heroOpenBtn) heroOpenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openBotBtn?.click();
  });

  let cachedStatus = null;
  let bots = [];
  let currentBotId = localStorage.getItem('selectedBotId') || '';

  // Theme sync with dashboard
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    themeToggle?.querySelector('i')?.classList.replace('fa-moon', 'fa-sun');
  }
  themeToggle?.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    document.body.classList.toggle('dark-mode', newTheme === 'dark');
    document.body.classList.toggle('light-mode', newTheme === 'light');
    localStorage.setItem('theme', newTheme);
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-moon', newTheme === 'dark');
      icon.classList.toggle('fa-sun', newTheme === 'light');
    }
  });

  // Sidebar controls for mobile
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  mobileMenuBtn?.addEventListener('click', () => sidebar?.classList.toggle('active'));
  sidebarToggle?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar?.classList.contains('active')) {
      if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  function setLoading(state) {
    [genBtn, copyBtn, savePrefsBtn, unlinkBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = state;
      btn.style.opacity = state ? '0.6' : '1';
      btn.style.cursor = state ? 'not-allowed' : 'pointer';
    });
  }

  function renderStatus(data) {
    cachedStatus = data;
    const linked = Boolean(data?.linked);
    statusEl.textContent = linked ? 'مرتبط' : 'غير مرتبط';
    statusSub.textContent = linked
      ? `الحساب مرتبط بهذا البوت${data.botName ? ' - ' + data.botName : ''} باسم @${data.username || 'غير معروف'}`
      : 'اختر البوت، ثم اضغط توليد كود ربط جديد وأرسله للبوت على تيليجرام.';
    statusDot.classList.toggle('ok', linked);

    if (heroStatus) heroStatus.textContent = linked ? 'مرتبط' : 'غير مرتبط';
    if (heroLinkStatus) heroLinkStatus.textContent = linked ? 'تم الربط' : 'في انتظار الربط';
    if (heroLinkSubtext) heroLinkSubtext.textContent = data.botName ? `البوت: ${data.botName}` : 'اختر بوت للربط.';

    if (data.botUsername) {
      openBotBtn.href = `https://t.me/${data.botUsername}`;
      openBotBtn.textContent = `فتح @${data.botUsername}`;
      botHint.textContent = `افتح البوت @${data.botUsername} وأرسل كود الربط.`;
      if (heroOpenBtn) heroOpenBtn.href = `https://t.me/${data.botUsername}`;
    } else {
      openBotBtn.href = '#';
      openBotBtn.textContent = 'رابط البوت غير متاح';
      botHint.textContent = 'بعد ضبط TELEGRAM_BOT_USERNAME في .env سيظهر رابط البوت هنا.';
      if (heroOpenBtn) heroOpenBtn.href = '#';
    }

    codeEl.textContent = data.linkCode || '—';
    expiryEl.textContent = data.linkExpiresAt
      ? `صالح حتى: ${new Date(data.linkExpiresAt).toLocaleString('ar-EG')}`
      : 'اضغط توليد كود لعرض الصلاحية.';

    if (heroCode) heroCode.textContent = data.linkCode || '—';
    if (heroExpiry) {
      heroExpiry.textContent = data.linkExpiresAt
        ? `ينتهي: ${new Date(data.linkExpiresAt).toLocaleString('ar-EG')}`
        : 'لم يتم توليد كود بعد.';
    }

    if (unlinkBtn) {
      unlinkBtn.style.display = linked ? 'inline-flex' : 'none';
      unlinkBtn.disabled = !linked;
    }

    prefNewOrder.checked = data.notifications?.newOrder !== false;
    prefOrderStatus.checked = data.notifications?.orderStatus !== false;
    prefChatOrder.checked = data.notifications?.chatOrder !== false;
    prefDailySummary.checked = data.notifications?.dailySummary === true;
  }

  async function loadStatus() {
    if (!currentBotId) return;
    try {
      const data = await handleApiRequest(`/api/telegram/status?botId=${currentBotId}`, {
        method: 'GET',
        headers: authHeaders,
      }, null, 'فشل جلب حالة تيليجرام');
      renderStatus(data);
    } catch (err) {
      statusEl.textContent = 'تعذر تحميل الحالة';
      statusSub.textContent = err.message || 'حاول مرة أخرى لاحقاً.';
    }
  }

  async function generateCode() {
    if (!currentBotId) {
      alert('اختر البوت أولاً.');
      return;
    }
    setLoading(true);
    try {
      const data = await handleApiRequest('/api/telegram/link-code', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ botId: currentBotId }),
      }, null, 'تعذر توليد الكود');
      renderStatus({ ...cachedStatus, ...data, linkCode: data.code, linkExpiresAt: data.expiresAt });
    } catch (err) {
      alert(err.message || 'تعذر توليد الكود');
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!currentBotId) {
      alert('اختر البوت أولاً.');
      return;
    }
    setLoading(true);
    try {
      const data = await handleApiRequest('/api/telegram/preferences', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          botId: currentBotId,
          newOrder: prefNewOrder.checked,
          orderStatus: prefOrderStatus.checked,
          chatOrder: prefChatOrder.checked,
          dailySummary: prefDailySummary.checked,
        }),
      }, null, 'تعذر حفظ الإعدادات');
      renderStatus({ ...cachedStatus, notifications: data.notifications });
    } catch (err) {
      alert(err.message || 'تعذر حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!currentBotId) {
      alert('اختر البوت أولاً.');
      return;
    }
    if (!confirm('متأكد أنك عاوز تلغي الربط مع تيليجرام؟')) return;
    setLoading(true);
    try {
      await handleApiRequest('/api/telegram/unlink', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ botId: currentBotId }),
      }, null, 'تعذر إلغاء الربط');
      renderStatus({
        linked: false,
        username: '',
        linkCode: '',
        linkExpiresAt: null,
        notifications: cachedStatus?.notifications || {},
        botUsername: cachedStatus?.botUsername,
      });
    } catch (err) {
      alert(err.message || 'تعذر إلغاء الربط');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    const code = codeEl.textContent.trim();
    if (!code || code === '—') {
      alert('لا يوجد كود لنسخه.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = 'تم النسخ ✔';
      setTimeout(() => (copyBtn.textContent = 'نسخ الكود'), 1200);
    } catch (err) {
      alert('تعذر النسخ تلقائياً، انسخ الكود يدوياً.');
    }
  }

  genBtn.addEventListener('click', generateCode);
  savePrefsBtn.addEventListener('click', savePreferences);
  unlinkBtn.addEventListener('click', unlink);
  copyBtn.addEventListener('click', copyCode);

  botSelect.addEventListener('change', () => {
    currentBotId = botSelect.value;
    if (currentBotId) {
      localStorage.setItem('selectedBotId', currentBotId);
      loadStatus();
    } else {
      localStorage.removeItem('selectedBotId');
    }
  });

  async function loadBots() {
    try {
      const data = await handleApiRequest('/api/bots', {
        method: 'GET',
        headers: authHeaders,
      }, null, 'فشل في جلب البوتات');
      bots = Array.isArray(data) ? data : (data?.bots || []);
      botSelect.innerHTML = '';
      if (!bots.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'لا يوجد بوتات متاحة';
        botSelect.appendChild(opt);
        return;
      }
      bots.forEach((b, idx) => {
        const opt = document.createElement('option');
        opt.value = b._id;
        opt.textContent = b.name || `بوت ${idx + 1}`;
        botSelect.appendChild(opt);
      });

      if (currentBotId && bots.some((b) => String(b._id) === String(currentBotId))) {
        botSelect.value = currentBotId;
      } else {
        currentBotId = bots[0]._id;
        botSelect.value = currentBotId;
        localStorage.setItem('selectedBotId', currentBotId);
      }

      if (currentBotId) loadStatus();
    } catch (err) {
      botSelect.innerHTML = '<option value="">تعذر جلب البوتات</option>';
      alert(err.message || 'تعذر جلب قائمة البوتات');
    }
  }

  notificationsBtn?.addEventListener('click', () => {
    window.location.href = '/dashboard_new.html';
  });

  logoutBtn?.addEventListener('click', () => window.logoutUser());

  loadBots();
});
