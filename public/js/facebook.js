// public/js/facebook.js (Updated for new dashboard design, unified error handling, and removed Webhook settings)

document.addEventListener("DOMContentLoaded", () => {
  async function loadFacebookPage() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/facebook.css";
    document.head.appendChild(link);
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");
    const userId = localStorage.getItem("userId");
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

    // Validate selectedBotId
    try {
      const bots = await handleApiRequest("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      }, content, "فشل في جلب البوتات");

      console.log('Fetched bots:', bots);

      let userBots = bots;
      if (role !== "superadmin") {
        userBots = bots.filter(bot => {
          const botUserId = typeof bot.userId === 'object' && bot.userId._id ? bot.userId._id : bot.userId;
          return botUserId === userId;
        });
      }

      if (userBots.length === 0) {
        localStorage.removeItem("selectedBotId");
        content.innerHTML = `
          <div class="placeholder error">
            <h2><i class="fas fa-robot"></i> لا يوجد بوتات متاحة</h2>
            <p>يرجى التواصل مع المسؤول لإضافة بوت لحسابك أو إنشاء بوت جديد.</p>
          </div>
        `;
        return;
      }

      const selectedBot = userBots.find(bot => String(bot._id) === String(selectedBotId));
      if (!selectedBot) {
        localStorage.removeItem("selectedBotId");
        content.innerHTML = `
          <div class="placeholder error">
            <h2><i class="fas fa-exclamation-triangle"></i> البوت غير موجود</h2>
            <p>البوت المختار غير موجود أو غير متاح. يرجى اختيار بوت آخر من القائمة العلوية.</p>
          </div>
        `;
        return;
      }
    } catch (err) {
      console.error('Error validating selectedBotId:', err);
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-circle"></i> خطأ</h2>
          <p>خطأ في التحقق من البوت: ${err.message}. يرجى اختيار بوت آخر من القائمة العلوية.</p>
        </div>
      `;
      return;
    }

    // Main structure for the Facebook settings page
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fab fa-facebook-square"></i> إعدادات ربط فيسبوك</h2>
        <div class="header-actions">
          <button id="connectFacebookBtn" class="btn btn-primary"><i class="fab fa-facebook"></i> ربط صفحتك على فيسبوك</button>
        </div>
      </div>

      <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>

      <div id="facebookSettingsContainer" class="settings-container facebook-settings-grid" style="display: none;">
        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-toggle-on"></i> تفعيل ميزات Webhook</h3></div>
          <div class="card-body toggles-grid">
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>رسائل الترحيب (Opt-ins)</h4>
                <p>إرسال رسالة ترحيب من البوت بمجرد فتح دردشة مع الصفحة لأول مرة قبل بدء المحادثة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messagingOptinsToggle" data-setting-key="messagingOptinsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>ردود الفعل (Reactions)</h4>
                <p>تسمح للبوت بالردود على عمليات التفاعل مع الرسالة مثل اعجاب او قلب.</p>
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
                <p>استقبال إشعارات عندما يقوم المستخدم بتعديل رسالة وتوليد رد جديد بناء على التعديل.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messageEditsToggle" data-setting-key="messageEditsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تصنيفات المحادثات (Labels)</h4>
                <p>تسمح للبوت بوضع تصنيفات وتعديل حالات المحادثة (يتطلب اعدادت صلاحيات صفحة خاص).</p>
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

    // Load Facebook SDK
    const fbScript = document.createElement("script");
    fbScript.src = "https://connect.facebook.net/en_US/sdk.js";
    fbScript.async = true;
    fbScript.defer = true;
    fbScript.crossOrigin = "anonymous";
    document.head.appendChild(fbScript);

    const loadingSpinner = document.getElementById("loadingSpinner");
    const errorMessage = document.getElementById("errorMessage");
    const settingsContainer = document.getElementById("facebookSettingsContainer");
    const connectFacebookBtn = document.getElementById("connectFacebookBtn");

    // Toggle elements
    const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
    const togglesError = document.getElementById("togglesError");

    // --- Functions ---

    async function loadBotSettings(botId) {
      loadingSpinner.style.display = "flex";
      settingsContainer.style.display = "none";
      errorMessage.style.display = "none";

      try {
        const settings = await handleApiRequest(`/api/bots/${botId}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }, errorMessage, "حدث خطأ أثناء تحميل الإعدادات");

        // Populate Toggles
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && settings.hasOwnProperty(key)) {
            toggle.checked = settings[key];
          }
        });

        settingsContainer.style.display = "grid";

      } catch (err) {
        // الخطأ تم التعامل معه في handleApiRequest
      } finally {
        loadingSpinner.style.display = "none";
      }
    }

    async function saveApiKeys(botId, facebookApiKey, facebookPageId) {
      errorMessage.style.display = "none";

      // Validate inputs
      if (!facebookApiKey || !facebookPageId) {
        errorMessage.textContent = "فشل حفظ معلومات الربط: مفتاح API أو معرف الصفحة غير موجود";
        errorMessage.style.display = "block";
        return;
      }

      console.log('البيانات المرسلة:', { facebookApiKey, facebookPageId }); // Log data for debugging

      try {
        const response = await handleApiRequest(`/api/bots/${botId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ facebookApiKey, facebookPageId }),
        }, errorMessage, "فشل حفظ معلومات الربط");

        console.log('رد السيرفر:', response); // Log server response
        alert("تم ربط الصفحة بنجاح!");
      } catch (err) {
        console.error('خطأ في حفظ الإعدادات:', err); // Log error details
        if (err.message.includes('غير مصرح لك')) {
          errorMessage.textContent = 'غير مصرح لك بتعديل هذا البوت. تأكد إنك صاحب البوت.';
          errorMessage.style.display = 'block';
        } else if (err.message.includes('البوت غير موجود')) {
          errorMessage.textContent = 'البوت غير موجود. تأكد من اختيار بوت صالح من قايمة البوتات.';
          errorMessage.style.display = 'block';
        } else {
          errorMessage.textContent = 'خطأ في السيرفر أثناء حفظ معلومات الربط: ' + (err.message || 'غير معروف');
          errorMessage.style.display = 'block';
        }
      }
    }

    // Initialize Facebook SDK
    window.fbAsyncInit = function () {
      FB.init({
        appId: '499020366015281', // Your App ID
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      });
    };

    function loginWithFacebook() {
      FB.login(function (response) {
        if (response.authResponse) {
          console.log('تم تسجيل الدخول!');
          getUserPages(response.authResponse.accessToken);
        } else {
          errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ';
          errorMessage.style.display = 'block';
        }
      }, { scope: 'public_profile,pages_show_list,pages_messaging' });
    }

    function getUserPages(accessToken) {
      FB.api('/me/accounts', { access_token: accessToken }, function (response) {
        if (response && !response.error) {
          console.log('الصفحات:', response.data);
          if (response.data.length === 0) {
            errorMessage.textContent = 'لم يتم العثور على صفحات مرتبطة بحسابك';
            errorMessage.style.display = 'block';
            return;
          }
          // Assume the user selects the first page
          const page = response.data[0]; // First page
          if (!page.access_token || !page.id) {
            errorMessage.textContent = 'فشل جلب بيانات الصفحة: مفتاح الوصول أو معرف الصفحة غير موجود';
            errorMessage.style.display = 'block';
            return;
          }
          console.log('بيانات الصفحة المختارة:', { access_token: page.access_token, page_id: page.id });
          saveApiKeys(selectedBotId, page.access_token, page.id);
        } else {
          errorMessage.textContent = 'خطأ في جلب الصفحات: ' + (response.error.message || 'غير معروف');
          errorMessage.style.display = 'block';
        }
      });
    }

    // --- Event Listeners ---
    connectFacebookBtn.addEventListener("click", loginWithFacebook);

    toggles.forEach(toggle => {
      toggle.addEventListener("change", (e) => {
        const key = e.target.dataset.settingKey;
        const value = e.target.checked;
        if (key) {
          updateWebhookSetting(selectedBotId, key, value);
        }
      });
    });

    // --- Initial Load ---
    loadBotSettings(selectedBotId);
  }

  // Make loadFacebookPage globally accessible
  window.loadFacebookPage = loadFacebookPage;
});
