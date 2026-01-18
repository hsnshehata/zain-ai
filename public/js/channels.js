// public/js/channels.js

async function loadChannelsPage() {
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  // Basic guards
  if (!token) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
        <p>يرجى تسجيل الدخول لعرض قنوات البوت.</p>
      </div>
    `;
    return;
  }

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder">
        <h2><i class="fas fa-hand-pointer"></i> يرجى اختيار بوت</h2>
        <p>اختر بوتًا من القائمة العلوية ثم عد لإدارة القنوات.</p>
      </div>
    `;
    return;
  }

  injectChannelsStyles();

  content.innerHTML = `
    <div class="page-header channels-header">
      <div>
        <h2><i class="fas fa-share-alt"></i> قنوات البوت</h2>
        <p class="page-subtitle">إدارة ربط فيسبوك وإنستجرام وواتساب من مكان واحد</p>
      </div>
    </div>

    <div class="channels-tabs" role="tablist">
      <button class="channel-tab active" data-tab="overview" aria-selected="true">لمحة عن القنوات</button>
      <button class="channel-tab" data-tab="facebook" aria-selected="false">فيسبوك</button>
      <button class="channel-tab" data-tab="instagram" aria-selected="false">إنستجرام</button>
      <button class="channel-tab" data-tab="whatsapp" aria-selected="false">واتساب</button>
    </div>

    <div id="channelsTabContent" class="channels-tab-content"></div>
  `;

  const tabContent = document.getElementById("channelsTabContent");
  const tabButtons = Array.from(content.querySelectorAll(".channel-tab"));

  const tabHandlers = {
    overview: renderOverview,
    facebook: () => renderChannelTab("facebook", "loadFacebookPage", "/js/facebook.js"),
    instagram: () => renderChannelTab("instagram", "loadInstagramPage", "/js/instagram.js"),
    whatsapp: () => renderChannelTab("whatsapp", "loadWhatsAppPage", "/js/whatsapp.js"),
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.classList.contains("active")) return;
      await activateTab(btn.dataset.tab);
    });
  });

  await activateTab("overview");

  async function activateTab(tabKey) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabKey;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const handler = tabHandlers[tabKey];
    if (typeof handler === "function") {
      await handler();
    }
  }

  async function renderOverview() {
    tabContent.innerHTML = `
      <div class="channels-overview">
        <div class="channels-overview-grid">
          <div class="channel-card">
            <div class="channel-card-icon fb"><i class="fab fa-facebook"></i></div>
            <div class="channel-card-body">
              <h3>فيسبوك</h3>
              <p>اربط صفحتك وفعّل الردود الذكية والتعليقات.</p>
              <button class="btn btn-primary overview-link-btn" data-target="facebook">فتح إعدادات فيسبوك</button>
            </div>
          </div>
          <div class="channel-card">
            <div class="channel-card-icon ig"><i class="fab fa-instagram"></i></div>
            <div class="channel-card-body">
              <h3>إنستجرام</h3>
              <p>حوّل رسائل إنستجرام لردود تلقائية بإدارة كاملة.</p>
              <button class="btn btn-primary overview-link-btn" data-target="instagram">فتح إعدادات إنستجرام</button>
            </div>
          </div>
          <div class="channel-card">
            <div class="channel-card-icon wa"><i class="fab fa-whatsapp"></i></div>
            <div class="channel-card-body">
              <h3>واتساب</h3>
              <p>اربط رقمك لتستقبل وترسل رسائل واتساب عبر البوت.</p>
              <button class="btn btn-primary overview-link-btn" data-target="whatsapp">فتح إعدادات واتساب</button>
            </div>
          </div>
        </div>

        <div class="channels-tips">
          <h4><i class="fas fa-lightbulb"></i> نصائح سريعة</h4>
          <ul>
            <li>تأكد أن نفس البوت مختار قبل البدء في الربط.</li>
            <li>ابدأ من هنا ثم انتقل لأي قناة بالضغط على التبويب أو الزر المناسب.</li>
            <li>يمكنك العودة إلى هذه اللمحة في أي وقت من التبويب الأول.</li>
          </ul>
        </div>
      </div>
    `;

    tabContent.querySelectorAll(".overview-link-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = btn.dataset.target;
        await activateTab(target);
      });
    });
  }

  async function renderChannelTab(key, funcName, src) {
    tabContent.innerHTML = `<div class="spinner"><div class="loader"></div></div>`;
    try {
      await ensureScript(funcName, src);
      if (typeof window[funcName] !== "function") {
        throw new Error(`${funcName} لم يتم تحميله بنجاح`);
      }
      await window[funcName](tabContent);
    } catch (err) {
      tabContent.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-circle"></i> تعذر تحميل ${key}</h2>
          <p>${err.message || "حدث خطأ أثناء تحميل صفحة القناة."}</p>
        </div>
      `;
    }
  }
}

function injectChannelsStyles() {
  if (document.getElementById("channels-inline-style")) return;
  const style = document.createElement("style");
  style.id = "channels-inline-style";
  style.textContent = `
    .channels-header { margin-bottom: 12px; }
    .page-subtitle { color: var(--text-secondary, #aeb7c3); font-size: 0.95rem; margin-top: 6px; }
    .channels-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 15px; }
    .channel-tab { border: 1px solid var(--border-color, #2f3240); background: var(--card-bg, #1f2233); color: var(--text-primary, #e5e7ef); padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease; font-weight: 700; }
    .channel-tab:hover { border-color: var(--accent, #00c4b4); transform: translateY(-2px); }
    .channel-tab.active { background: linear-gradient(135deg, var(--accent, #00c4b4), #2f89ff); border-color: transparent; color: #ffffff; box-shadow: 0 6px 18px rgba(0, 196, 180, 0.25); }
    .channels-tab-content { background: var(--card-bg, #1f2233); border: 1px solid var(--border-color, #2f3240); border-radius: 14px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
    .channels-overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .channel-card { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: center; background: var(--card-alt-bg, #23273a); border: 1px solid var(--border-color, #2f3240); border-radius: 12px; padding: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
    .channel-card-icon { width: 64px; height: 64px; border-radius: 14px; display: grid; place-items: center; font-size: 26px; color: #fff; }
    .channel-card-icon.fb { background: linear-gradient(135deg, #1877f2, #0b5ab5); }
    .channel-card-icon.ig { background: linear-gradient(135deg, #e4405f, #c13584); }
    .channel-card-icon.wa { background: linear-gradient(135deg, #25d366, #128c7e); }
    .channel-card-body h3 { margin: 0 0 6px 0; color: var(--text-primary, #e5e7ef); }
    .channel-card-body p { margin: 0 0 8px 0; color: var(--text-secondary, #aeb7c3); font-size: 0.95rem; }
    .overview-link-btn { width: fit-content; padding: 8px 12px; }
    .channels-tips { margin-top: 8px; padding: 12px; background: var(--card-alt-bg, #23273a); border: 1px dashed var(--border-color, #2f3240); border-radius: 12px; }
    .channels-tips h4 { margin: 0 0 8px 0; color: var(--text-primary, #e5e7ef); display: flex; align-items: center; gap: 8px; }
    .channels-tips ul { margin: 0; padding-left: 18px; color: var(--text-secondary, #aeb7c3); line-height: 1.6; }
    @media (max-width: 768px) {
      .channel-card { grid-template-columns: 1fr; text-align: center; }
      .channel-card-icon { margin: 0 auto; }
      .channels-tab-content { padding: 14px; }
    }
  `;
  document.head.appendChild(style);
}

async function ensureScript(funcName, src) {
  if (typeof window[funcName] === "function") return;

  let script = document.querySelector(`script[src="${src}"]`);
  if (!script) {
    script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }

  await waitForGlobalFunction(funcName, 80, 100);
}

async function waitForGlobalFunction(name, maxAttempts = 60, interval = 100) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    if (typeof window[name] === "function") return;
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }
  throw new Error(`${name} لم يتم تحميله في الوقت المتوقع`);
}

// Expose globally
window.loadChannelsPage = loadChannelsPage;
