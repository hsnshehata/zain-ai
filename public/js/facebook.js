// public/js/facebook.js (Updated for new dashboard design and unified error handling)

document.addEventListener("DOMContentLoaded", () => {
  async function loadFacebookPage() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/facebook.css";
    document.head.appendChild(link);
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");
    const role = localStorage.getItem("role");

    if (!selectedBotId) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
          <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض إعدادات فيسبوك.</p>
        </div>
      `;
      return;
    }

    if (!token) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض إعدادات فيسبوك.</p>
        </div>
      `;
      return;
    }

    // تحقق إذا كان الـ selectedBotId متاح للمستخدم
    let bots = [];
    try {
      bots = await handleApiRequest("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      }, null, null); // null عشان نتحكم في الخطأ بنفسنا

      if (!Array.isArray(bots)) {
        throw new Error("فشل في جلب قايمة البوتات. حاول مرة أخرى.");
      }

      if (bots.length === 0) {
        content.innerHTML = `
          <div class="placeholder error">
            <h2><i class="fas fa-exclamation-triangle"></i> لا توجد بوتات متاحة</h2>
            <p>ليس لديك أي بوتات متاحة حاليًا. تواصل مع المدير لإنشاء بوت جديد.</p>
          </div>
        `;
        return;
      }

      const isBotAccessible = bots.some(bot => bot._id === selectedBotId);
      if (!isBotAccessible) {
        content.innerHTML = `
          <div class="placeholder error">
            <h2><i class="fas fa-exclamation-triangle"></i> بوت غير متاح</h2>
            <p>البوت المختار غير متاح أو ليس لديك صلاحية للوصول إليه. يرجى اختيار بوت آخر.</p>
          </div>
        `;
        return;
      }
    } catch (err) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> خطأ في التحقق</h2>
          <p>حدث خطأ أثناء التحقق من البوت المختار: ${err.message || 'حاول مرة أخرى أو اختيار بوت آخر.'}</p>
        </div>
      `;
      return;
    }

    // Main structure for the Facebook settings page
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fab fa-facebook-square"></i> إعدادات ربط فيسبوك</h2>
        <div class="header-actions">
          <!-- Actions like refresh or test connection could go here -->
        </div>
      </div>

      <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>

      <div id="facebookSettingsContainer" class="settings-container facebook-settings-grid" style="display: none;">

        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-key"></i> معلومات الربط الأساسية</h3></div>
          <div class="card-body">
            <div class="form-group">
              <label for="fbApiKey">مفتاح API لفيسبوك (Page Access Token)</label>
              <input type="password" id="fbApiKey" class="form-control" placeholder="أدخل مفتاح الوصول الخاص بالصفحة">
            </div>
            <div class="form-group">
              <label for="fbPageId">معرف صفحة فيسبوك (Page ID)</label>
              <input type="text" id="fbPageId" class="form-control" placeholder="أدخل معرف الصفحة الرقمي">
            </div>
            <button id="saveApiKeysBtn" class="btn btn-primary"><i class="fas fa-save"></i> حفظ معلومات الربط</button>
            <p id="apiKeysError" class="error-message small-error" style="display: none;"></p>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-cogs"></i> إعدادات Webhook</h3></div>
          <div class="card-body">
            <p>لاستقبال الرسائل من فيسبوك، يجب إعداد Webhook. استخدم المعلومات التالية في <a href="https://developers.facebook.com/apps/" target="_blank">لوحة تحكم مطوري فيسبوك</a> لتطبيقك.</p>
            <div class="form-group">
                <label for="webhookUrl">عنوان URL للـ Webhook:</label>
                <div class="input-group">
                    <input type="text" id="webhookUrl" class="form-control" readonly>
                    <button id="copyWebhookUrlBtn" class="btn btn-secondary btn-sm" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
            </div>
            <div class="form-group">
                <label for="verifyToken">رمز التحقق (Verify Token):</label>
                 <div class="input-group">
                    <input type="text" id="verifyToken" class="form-control" readonly>
                    <button id="copyVerifyTokenBtn" class="btn btn-secondary btn-sm" title="نسخ"><i class="fas fa-copy"></i></button>
                </div>
            </div>
            <p class="info-text">تأكد من الاشتراك في حقول Webhook التالية على الأقل: <code>messages</code>, <code>messaging_postbacks</code>.</p>
            <p class="info-text">قد تحتاج أيضًا إلى: <code>messaging_optins</code>, <code>message_reactions</code>, <code>messaging_referrals</code>, <code>message_edits</code>, <code>inbox_labels</code> بناءً على الإعدادات التي تفعلها أدناه.</p>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-toggle-on"></i> تفعيل ميزات Webhook</h3></div>
          <div class="card-body toggles-grid">

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>رسائل الترحيب (Opt-ins)</h4>
                <p>إرسال رسالة ترحيب من البوت بمجرد فتح دردشة مع الصفحة لأول مرة قبل بدء المحادثة .</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messagingOptinsToggle" data-setting-key="messagingOptinsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>ردود الفعل (Reactions)</h4>
                <p>تسمح للبوت بالردود على عمليات التفاعل مع الرسالة مثل اعجاب او قلب .</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messageReactionsToggle" data-setting-key="messageReactionsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تتبع المصدر (Referrals)</h4>
                <p>معرفة كيف وصل المستخدم إلى صفحتك (مثل الإعلانات).</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messagingReferralsToggle" data-setting-key="messagingReferralsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تعديلات الرسائل (Edits)</h4>
                <p> استقبال إشعارات عندما يقوم المستخدم بتعديل رسالة وتوليد رد جديد بناء على التعديل.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messageEditsToggle" data-setting-key="messageEditsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تصنيفات المحادثات (Labels)</h4>
                <p>تسمح للبوت بوضع تصنيفات و تعديل حالات المحادثة (يتطلب اعدادت صلاحيات صفحة خاص ).</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="inboxLabelsToggle" data-setting-key="inboxLabelsEnabled">
                <span class="slider"></span>
              </label>
            </div>

          </div>
           <p id="togglesError" class="error-message small-error" style="display: none;"></p>
        </div>

      </div>
    `;

    const loadingSpinner = document.getElementById("loadingSpinner");
    const errorMessage = document.getElementById("errorMessage");
    const settingsContainer = document.getElementById("facebookSettingsContainer");

    // API Key elements
    const fbApiKeyInput = document.getElementById("fbApiKey");
    const fbPageIdInput = document.getElementById("fbPageId");
    const saveApiKeysBtn = document.getElementById("saveApiKeysBtn");
    const apiKeysError = document.getElementById("apiKeysError");

    // Webhook elements
    const webhookUrlInput = document.getElementById("webhookUrl");
    const verifyTokenInput = document.getElementById("verifyToken");
    const copyWebhookUrlBtn = document.getElementById("copyWebhookUrlBtn");
    const copyVerifyTokenBtn = document.getElementById("copyVerifyTokenBtn");

    // Toggle elements
    const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
    const togglesError = document.getElementById("togglesError");

    // --- Functions ---

    async function loadBotSettings(botId) {
      loadingSpinner.style.display = "flex";
      settingsContainer.style.display = "none";
      errorMessage.style.display = "none";

      try {
        const bot = await handleApiRequest(`/api/bots/${botId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, errorMessage, "حدث خطأ أثناء تحميل إعدادات البوت");

        // Populate API Keys
        fbApiKeyInput.value = bot.facebookApiKey || "";
        fbPageIdInput.value = bot.facebookPageId || "";

        // Populate Webhook Info
        const webhookBaseUrl = window.location.origin;
        webhookUrlInput.value = `${webhookBaseUrl}/api/webhook/facebook/${botId}`;
        verifyTokenInput.value = bot.facebookVerifyToken || "hassanshehata";

        // Populate Toggles
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && bot.hasOwnProperty(key)) {
            toggle.checked = bot[key];
          }
        });

        settingsContainer.style.display = "grid";

      } catch (err) {
        // الخطأ تم التعامل معه في handleApiRequest
      } finally {
        loadingSpinner.style.display = "none";
      }
    }

    async function saveApiKeys(botId) {
      const apiKey = fbApiKeyInput.value.trim();
      const pageId = fbPageIdInput.value.trim();
      apiKeysError.style.display = "none";

      if (apiKey && !pageId) {
        apiKeysError.textContent = "يرجى إدخال معرف صفحة فيسبوك طالما تم إدخال مفتاح API.";
        apiKeysError.style.display = "block";
        return;
      }

      saveApiKeysBtn.disabled = true;
      saveApiKeysBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جار الحفظ...`;

      try {
        // Fetch current bot data to preserve the name
        const bot = await handleApiRequest(`/api/bots/${botId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, apiKeysError, "فشل في جلب بيانات البوت");

        await handleApiRequest(`/api/bots/${botId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: bot.name, // Preserve the bot name
            facebookApiKey: apiKey || undefined,
            facebookPageId: pageId || undefined,
          }),
        }, apiKeysError, null); // null عشان نتحكم في رسالة الخطأ بنفسنا

        alert("تم حفظ معلومات الربط بنجاح!");
      } catch (err) {
        // معالجة أخطاء محددة
        if (err.status === 403) {
          apiKeysError.textContent = "غير مصرح لك بتعديل هذا البوت. تأكد إنك صاحب البوت أو لديك صلاحيات المدير.";
        } else if (err.status === 404) {
          apiKeysError.textContent = "البوت المختار غير موجود. يرجى اختيار بوت آخر.";
        } else if (err.status === 400) {
          apiKeysError.textContent = err.message || "تأكد من إدخال معرف صفحة فيسبوك مع مفتاح API.";
        } else {
          apiKeysError.textContent = err.message || "فشل حفظ معلومات الربط. حاول مرة أخرى.";
        }
        apiKeysError.style.display = "block";
      } finally {
        saveApiKeysBtn.disabled = false;
        saveApiKeysBtn.innerHTML = `<i class="fas fa-save"></i> حفظ معلومات الربط`;
      }
    }

    async function updateWebhookSetting(botId, key, value) {
      togglesError.style.display = "none";

      try {
        await handleApiRequest(`/api/bots/${botId}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [key]: value }),
        }, togglesError, `فشل تحديث إعداد ${key}`);

        console.log(`✅ Updated ${key} to ${value} for bot ${botId}`);
      } catch (err) {
        const toggleInput = document.querySelector(`input[data-setting-key="${key}"]`);
        if (toggleInput) toggleInput.checked = !value;
        // الخطأ تم التعامل معه في handleApiRequest
      }
    }

    function copyToClipboard(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const originalIcon = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> تم النسخ`;
        setTimeout(() => { btn.innerHTML = originalIcon; }, 1500);
      }).catch(err => {
        console.error("فشل النسخ:", err);
        alert("فشل النسخ إلى الحافظة.");
      });
    }

    // --- Event Listeners ---
    saveApiKeysBtn.addEventListener("click", () => saveApiKeys(selectedBotId));

    toggles.forEach(toggle => {
      toggle.addEventListener("change", (e) => {
        const key = e.target.dataset.settingKey;
        const value = e.target.checked;
        if (key) {
          updateWebhookSetting(selectedBotId, key, value);
        }
      });
    });

    copyWebhookUrlBtn.addEventListener("click", (e) => copyToClipboard(webhookUrlInput.value, e.currentTarget));
    copyVerifyTokenBtn.addEventListener("click", (e) => copyToClipboard(verifyTokenInput.value, e.currentTarget));

    // --- Initial Load ---
    loadBotSettings(selectedBotId);
  }

  // Make loadFacebookPage globally accessible
  window.loadFacebookPage = loadFacebookPage;
});
