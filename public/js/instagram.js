// public/js/instagram.js

document.addEventListener("DOMContentLoaded", () => {
  async function loadInstagramPage() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/facebook.css";
    document.head.appendChild(link);
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

    if (!selectedBotId) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
          <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض إعدادات إنستجرام.</p>
        </div>
      `;
      return;
    }

    if (!token) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض إعدادات إنستجرام.</p>
        </div>
      `;
      return;
    }

    // Main structure for the Instagram settings page
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fab fa-instagram"></i> إعدادات ربط إنستجرام</h2>
        <div id="instructionsContainer" class="instructions-container" style="display: none;">
          <h3>📋 خطوات بسيطة لربط حسابك على إنستجرام</h3>
          <p>عشان تقدر تربط حسابك بالبوت بنجاح، اتأكد من الخطوات دي:</p>
          <ul>
            <li>
              <strong>إنشاء حساب مطور:</strong> لازم يكون عندك حساب مطور على موقع Meta Developer عشان تقدر تكمل عملية الربط.
              <br>
              <span style="display: block; margin-top: 5px;">
                <strong>إزاي تعمل حساب مطور؟</strong><br>
                1. ادخل على موقع <a href="https://developers.facebook.com/" target="_blank">Meta Developer</a>.<br>
                2. اضغط على "Get Started" أو "Log In" لو عندك حساب إنستجرام.<br>
                3. سجّل دخولك بحساب إنستجرام مهني (Business أو Creator).<br>
                4. وافق على شروط المطورين (Meta Developer Terms) لو ظهرتلك، وكده هيبقى عندك حساب مطور.
              </span>
            </li>
            <li>
              <strong>تسجيل الدخول بحساب إنستجرام:</strong> لما تضغط على زر الربط، هيفتحلك نافذة تسجيل دخول إنستجرام. سجّل دخول بحساب إنستجرام مهني (Business أو Creator).
            </li>
            <li>
              <strong>لو فشلت في الربط:</strong> لو ماعرفتش تربط الحساب، اتأكد إن:
              <ul>
                <li>حساب الإنستجرام بتاعك مهني (Business أو Creator).</li>
                <li>حساب الإنستجرام اللي بتسجل بيه هو نفس الحساب اللي عايز تربطه.</li>
              </ul>
              لو لسه في مشكلة، تواصل معانا على واتساب: <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.
            </li>
          </ul>
        </div>
        <div class="header-actions">
          <button id="connectInstagramBtn" class="btn btn-primary"><i class="fab fa-instagram"></i> ربط حسابك على إنستجرام</button>
          <div id="pageStatus" class="page-status" style="margin-left: 20px;"></div>
        </div>
      </div>

      <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>

      <div id="instagramSettingsContainer" class="settings-container facebook-settings-grid" style="display: none;">
        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-toggle-on"></i> تفعيل ميزات Webhook</h3></div>
          <div class="card-body toggles-grid">
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>رسائل الترحيب (Opt-ins)</h4>
                <p>إرسال رسالة ترحيب من البوت بمجرد فتح دردشة مع الحساب لأول مرة قبل بدء المحادثة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramMessagingOptinsToggle" data-setting-key="instagramMessagingOptinsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>ردود الفعل (Reactions)</h4>
                <p>تسمح للبوت بالرد على تفاعلات المستخدم مع الرسائل مثل الإعجاب أو القلوب.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramMessageReactionsToggle" data-setting-key="instagramMessageReactionsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تتبع المصدر (Referrals)</h4>
                <p>معرفة كيف وصل المستخدم إلى حسابك (مثل الإعلانات).</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramMessagingReferralsToggle" data-setting-key="instagramMessagingReferralsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تعديلات الرسائل (Edits)</h4>
                <p>استقبال إشعارات عندما يقوم المستخدم بتعديل رسالة وتوليد رد جديد بناء على التعديل.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramMessageEditsToggle" data-setting-key="instagramMessageEditsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تصنيفات المحادثات (Labels)</h4>
                <p>تسمح للبوت بوضع تصنيفات وتعديل حالات المحادثة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramInboxLabelsToggle" data-setting-key="instagramInboxLabelsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>الرد على التعليقات (Comments)</h4>
                <p>تسمح للبوت بالرد على تعليقات المستخدمين على منشورات الحساب بنفس طريقة الرد على الرسائل.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="instagramCommentsRepliesToggle" data-setting-key="instagramCommentsRepliesEnabled">
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
    const settingsContainer = document.getElementById("instagramSettingsContainer");
    const instructionsContainer = document.getElementById("instructionsContainer");
    const connectInstagramBtn = document.getElementById("connectInstagramBtn");
    const pageStatus = document.getElementById("pageStatus");

    // Toggle elements
    const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
    const togglesError = document.getElementById("togglesError");

    // Instagram OAuth settings
    const CLIENT_ID = '2288330081539329'; // معرف تطبيق الإنستجرام
    const REDIRECT_URI = encodeURIComponent(window.location.origin + '/dashboard_new.html');
    const SCOPES = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments';

    // --- Functions ---

    async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || defaultErrorMessage);
        }
        return await response.json();
      } catch (err) {
        if (errorElement) {
          errorMessage.textContent = err.message;
          errorMessage.style.display = "block";
        }
        throw err;
      }
    }

    async function loadBotSettings(botId) {
      loadingSpinner.style.display = "flex";
      settingsContainer.style.display = "none";
      errorMessage.style.display = "none";

      try {
        const settings = await handleApiRequest(`/api/bots/${botId}/instagram-settings`, {
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
        errorMessage.textContent = "خطأ في تحميل الإعدادات: " + (err.message || "غير معروف");
        errorMessage.style.display = "block";
      } finally {
        loadingSpinner.style.display = "none";
      }
    }

    async function loadPageStatus(botId) {
      console.log(`جاري جلب بيانات البوت بالـ ID: ${botId}`);
      try {
        const bot = await handleApiRequest(`/api/bots/${botId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, pageStatus, "فشل في جلب بيانات البوت");

        if (!bot) {
          console.log(`البوت بالـ ID ${botId} مش موجود`);
          pageStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌<br>
              <strong>السبب:</strong> البوت غير موجود أو تم حذفه
            </div>
          `;
          instructionsContainer.style.display = "block";
          return;
        }

        console.log(`بيانات البوت:`, bot);

        // Check if bot is linked to an Instagram account
        if (bot.instagramPageId && bot.instagramApiKey) {
          console.log(`جاري جلب بيانات الحساب بالـ ID: ${bot.instagramPageId}`);
          const response = await fetch(`https://graph.instagram.com/${bot.instagramPageId}?fields=username&access_token=${bot.instagramApiKey}`);
          const pageData = await response.json();

          if (pageData.username) {
            console.log(`تم جلب بيانات الحساب بنجاح:`, pageData);
            pageStatus.innerHTML = `
              <div style="display: inline-block; color: green;">
                <strong>حالة الربط:</strong> مربوط ✅<br>
                <strong>اسم الحساب:</strong> ${pageData.username}<br>
                <strong>معرف الحساب:</strong> ${bot.instagramPageId}
              </div>
            `;
            instructionsContainer.style.display = "none";
          } else {
            console.log(`فشل في جلب بيانات الحساب:`, pageData);
            pageStatus.innerHTML = `
              <div style="display: inline-block; color: red;">
                <strong>حالة الربط:</strong> غير مربوط ❌<br>
                <strong>السبب:</strong> فشل في جلب بيانات الحساب (التوكن قد يكون غير صالح أو منتهي)
              </div>
            `;
            instructionsContainer.style.display = "block";
          }
        } else {
          console.log(`البوت مش مرتبط بحساب إنستجرام`);
          pageStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌
            </div>
          `;
          instructionsContainer.style.display = "block";
        }
      } catch (err) {
        console.error('Error loading page status:', err);
        pageStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌<br>
            <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
          </div>
        `;
        instructionsContainer.style.display = "block";
      }
    }

    async function saveApiKeys(botId, instagramApiKey, instagramPageId) {
      errorMessage.style.display = "none";

      if (!instagramApiKey || !instagramPageId) {
        errorMessage.textContent = "فشل حفظ معلومات الربط: مفتاح API أو معرف الحساب غير موجود";
        errorMessage.style.display = "block";
        return;
      }

      console.log('البيانات المرسلة:', { instagramApiKey, instagramPageId });

      try {
        const saveResponse = await handleApiRequest(`/api/bots/${botId}/link-social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instagramApiKey, instagramPageId }),
        }, errorMessage, "فشل حفظ معلومات الربط");

        console.log('✅ التوكن تم حفظه بنجاح:', instagramApiKey.slice(0, 10) + '...');
        alert("تم ربط الحساب بنجاح!");
        await loadPageStatus(botId);
      } catch (err) {
        console.error('❌ خطأ في حفظ التوكن:', err);
        errorMessage.textContent = 'خطأ في حفظ التوكن: ' + (err.message || 'غير معروف');
        errorMessage.style.display = 'block';
      }
    }

    async function updateWebhookSetting(botId, key, value) {
      togglesError.style.display = "none";

      try {
        await handleApiRequest(`/api/bots/${botId}/instagram-settings`, {
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
      }
    }

    // Handle Instagram OAuth flow with Pop-up
    function loginWithInstagram() {
      const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&response_type=code`;
      console.log('Opening Instagram OAuth URL in Pop-up:', authUrl);

      // فتح Pop-up
      const width = 600;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      const popup = window.open(authUrl, 'InstagramLogin', `width=${width},height=${height},top=${top},left=${left}`);

      if (!popup) {
        errorMessage.textContent = 'يرجى السماح بفتح النوافذ المنبثقة (Pop-ups) لتسجيل الدخول';
        errorMessage.style.display = 'block';
        return;
      }

      // مراقبة الـ Pop-up لاستقبال الـ code
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          // الـ code هيتعامل معاه في handleInstagramCallback
        }
      }, 500);
    }

    // Check for OAuth code in URL and send it to backend
    async function handleInstagramCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        console.log('OAuth code received:', code);
        try {
          // Send the code to the backend to exchange for access token
          const response = await handleApiRequest(`/api/bots/${selectedBotId}/exchange-instagram-code`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
          }, errorMessage, "فشل في ربط حساب الإنستجرام");

          if (response.success) {
            console.log('Access token exchanged successfully by backend');
            // Clear the URL parameters
            window.history.replaceState({}, document.title, '/dashboard_new.html#instagram');
            await loadPageStatus(selectedBotId);
          } else {
            throw new Error(response.message || 'فشل في جلب التوكن');
          }
        } catch (err) {
          console.error('Error exchanging code for access token:', err);
          errorMessage.textContent = 'خطأ أثناء ربط الحساب: ' + (err.message || 'غير معروف');
          errorMessage.style.display = 'block';
        }
      }
    }

    // --- Event Listeners ---
    connectInstagramBtn.addEventListener("click", loginWithInstagram);

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
    loadPageStatus(selectedBotId);
    handleInstagramCallback(); // Check for OAuth callback
  }

  // Make loadInstagramPage globally accessible
  window.loadInstagramPage = loadInstagramPage;

  // Ensure the function is available even if called early
  if (window.loadInstagramPage) {
    console.log('✅ loadInstagramPage is defined and ready');
  } else {
    console.error('❌ loadInstagramPage is not defined');
  }
});
