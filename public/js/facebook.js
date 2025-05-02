// public/js/facebook.js (Updated for new dashboard design)

document.addEventListener("DOMContentLoaded", () => {
  async function loadFacebookPage() {
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

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
                <p>استقبال إشعارات عندما يبدأ مستخدم جديد محادثة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messagingOptinsToggle" data-setting-key="messagingOptinsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>ردود الفعل (Reactions)</h4>
                <p>استقبال إشعارات عندما يتفاعل المستخدم مع رسالة.</p>
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
                <p>استقبال إشعارات عندما يقوم المستخدم بتعديل رسالة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messageEditsToggle" data-setting-key="messageEditsEnabled">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تصنيفات المحادثات (Labels)</h4>
                <p>استقبال إشعارات عند إضافة أو إزالة تصنيف لمحادثة (يتطلب صلاحيات خاصة).</p>
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
        const response = await fetch(`/api/bots/${botId}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          throw new Error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
        }
        if (!response.ok) {
          throw new Error(`فشل جلب الإعدادات: ${response.statusText}`);
        }

        const settings = await response.json();

        // Populate API Keys
        fbApiKeyInput.value = settings.facebookApiKey || "";
        fbPageIdInput.value = settings.facebookPageId || "";

        // Populate Webhook Info (Assuming these are derived or fixed)
        // Replace with actual logic to get webhook URL and verify token
        const webhookBaseUrl = window.location.origin; // Or your specific API base URL
        webhookUrlInput.value = `${webhookBaseUrl}/api/webhook/facebook/${botId}`;
        verifyTokenInput.value = settings.facebookVerifyToken || "قم بإنشاء رمز وحفظه"; // Ideally, this is generated and stored securely

        // Populate Toggles
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && settings.hasOwnProperty(key)) {
            toggle.checked = settings[key];
          }
        });

        settingsContainer.style.display = "grid"; // Show the grid layout

      } catch (err) {
        console.error("❌ Error loading Facebook settings:", err);
        errorMessage.textContent = err.message || "حدث خطأ أثناء تحميل الإعدادات.";
        errorMessage.style.display = "block";
        if (err.message.includes("جلسة غير صالحة")) {
            logoutUser(); // Assumes logoutUser is global
        }
      } finally {
        loadingSpinner.style.display = "none";
      }
    }

    async function saveApiKeys(botId) {
        const apiKey = fbApiKeyInput.value.trim();
        const pageId = fbPageIdInput.value.trim();
        apiKeysError.style.display = "none";

        // Basic validation
        if (!apiKey || !pageId) {
            apiKeysError.textContent = "يرجى إدخال مفتاح API ومعرف الصفحة.";
            apiKeysError.style.display = "block";
            return;
        }

        saveApiKeysBtn.disabled = true;
        saveApiKeysBtn.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار الحفظ...`;

        try {
            const response = await fetch(`/api/bots/${botId}/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ facebookApiKey: apiKey, facebookPageId: pageId }),
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "فشل حفظ معلومات الربط");
            }

            alert("تم حفظ معلومات الربط بنجاح!");
            // Optionally update webhook info if it depends on these keys

        } catch (err) {
            console.error("❌ Error saving API keys:", err);
            apiKeysError.textContent = err.message;
            apiKeysError.style.display = "block";
             if (err.message.includes("جلسة غير صالحة")) logoutUser();
        } finally {
            saveApiKeysBtn.disabled = false;
            saveApiKeysBtn.innerHTML = 
`<i class="fas fa-save"></i> حفظ معلومات الربط`;
        }
    }

    async function updateWebhookSetting(botId, key, value) {
        togglesError.style.display = "none";
        // Disable the specific toggle during update? Maybe not necessary for quick updates.
        try {
            const response = await fetch(`/api/bots/${botId}/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ [key]: value }),
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `فشل تحديث إعداد ${key}`);
            }

            console.log(`✅ Updated ${key} to ${value} for bot ${botId}`);

        } catch (err) {
            console.error(`❌ Error updating ${key}:`, err);
            togglesError.textContent = err.message;
            togglesError.style.display = "block";
            // Revert toggle state on error
            const toggleInput = document.querySelector(`input[data-setting-key="${key}"]`);
            if (toggleInput) toggleInput.checked = !value;
            if (err.message.includes("جلسة غير صالحة")) logoutUser();
        }
    }

    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = 
`<i class="fas fa-check"></i> تم النسخ`;
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
    await loadBotSettings(selectedBotId);
  }

  // Make loadFacebookPage globally accessible
  window.loadFacebookPage = loadFacebookPage;
});

