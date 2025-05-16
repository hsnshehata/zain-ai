// public/js/instagram.js (New file for Instagram settings page)

document.addEventListener("DOMContentLoaded", () => {
  async function loadInstagramPage() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/instagram.css";
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
                2. اضغط على "Get Started" أو "Log In" لو عندك حساب فيسبوك.<br>
                3. سجّل دخولك بنفس حساب فيسبوك اللي بتدير منه حساب الإنستجرام.<br>
                4. وافق على شروط المطورين (Meta Developer Terms) لو ظهرتلك، وكده هيبقى عندك حساب مطور.
              </span>
            </li>
            <li>
              <strong>تواصل معانا:</strong> بعد ما تعمل حساب المطور، ابعتلنا رسالة على واتساب على الرقم 
              <a href="https://wa.me/01279425543" target="_blank">01279425543</a>، وهنبعتلك دعوة لتطبيقنا عشان تقدر تستخدمه.
            </li>
            <li>
              <strong>ربط الحساب:</strong> بعد ما تقبل الدعوة، تقدر تختار حساب الإنستجرام اللي بتديره من الزر اللي تحت عشان البوت يشتغل عليه.
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

      <div id="instagramSettingsContainer" class="settings-container instagram-settings-grid" style="display: none;">
        <div class="card settings-card">
          <div class="card-header"><h3><i class="fas fa-toggle-on"></i> تفعيل ميزات Webhook</h3></div>
          <div class="card-body toggles-grid">
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>رسائل الترحيب (Opt-ins)</h4>
                <p>إرسال رسالة ترحيب من البوت بمجرد فتح دردشة مع الحساب لأول مرة قبل بدء المحادثة.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messagingOptinsToggle" data-setting-key="messagingOptinsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>ردود الفعل (Reactions)</h4>
                <p>تسمح للبوت بالردود على عمليات التفاعل مع الرسالة مثل الإعجاب أو القلب.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="messageReactionsToggle" data-setting-key="messageReactionsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>تتبع المصدر (Referrals)</h4>
                <p>معرفة كيف وصل المستخدم إلى حسابك (مثل الإعلانات).</p>
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
                <h4>الرد على القصص (Stories)</h4>
                <p>تسمح للبوت بالرد على القصص المرتبطة بالحساب.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="storiesRepliesToggle" data-setting-key="storiesRepliesEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item toggle-item">
              <div class="setting-info">
                <h4>الرد على التعليقات (Comments)</h4>
                <p>تسمح للبوت بالرد على تعليقات المستخدمين على المنشورات بنفس طريقة الرد على الرسائل.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="commentsRepliesToggle" data-setting-key="commentsRepliesEnabled">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <p id="togglesError" class="error-message small-error" style="display: none;"></p>
        </div>
      </div>
    `;

    // Load Instagram SDK (using the same Facebook SDK since Instagram is managed via Meta)
    const fbScript = document.createElement("script");
    fbScript.src = "https://connect.facebook.net/en_US/sdk.js";
    fbScript.async = true;
    fbScript.defer = true;
    fbScript.crossOrigin = "anonymous";
    document.head.appendChild(fbScript);

    const loadingSpinner = document.getElementById("loadingSpinner");
    const errorMessage = document.getElementById("errorMessage");
    const settingsContainer = document.getElementById("instagramSettingsContainer");
    const instructionsContainer = document.getElementById("instructionsContainer");
    const connectInstagramBtn = document.getElementById("connectInstagramBtn");
    const pageStatus = document.getElementById("pageStatus");

    // Toggle elements
    const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
    const togglesError = document.getElementById("togglesError");

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
        errorElement.textContent = err.message;
        errorElement.style.display = "block";
        throw err;
      }
    }

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
          instructionsContainer.style.display = "block"; // Show instructions if bot is not linked
          return;
        }

        console.log(`بيانات البوت:`, bot);

        // Check if bot is linked to an Instagram account
        if (bot.instagramPageId && bot.instagramApiKey) {
          console.log(`جاري جلب بيانات الحساب بالـ ID: ${bot.instagramPageId}`);
          const response = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${bot.instagramApiKey}`);
          const accountData = await response.json();

          if (accountData.username) {
            console.log(`تم جلب بيانات الحساب بنجاح:`, accountData);
            pageStatus.innerHTML = `
              <div style="display: inline-block; color: green;">
                <strong>حالة الربط:</strong> مربوط ✅<br>
                <strong>اسم الحساب:</strong> ${accountData.username}<br>
                <strong>معرف الحساب:</strong> ${bot.instagramPageId}
              </div>
            `;
            instructionsContainer.style.display = "none"; // Hide instructions if bot is linked
          } else {
            console.log(`فشل في جلب بيانات الحساب:`, accountData);
            pageStatus.innerHTML = `
              <div style="display: inline-block; color: red;">
                <strong>حالة الربط:</strong> غير مربوط ❌<br>
                <strong>السبب:</strong> فشل في جلب بيانات الحساب (التوكن قد يكون غير صالح أو منتهي)
              </div>
            `;
            instructionsContainer.style.display = "block"; // Show instructions if bot is not linked
          }
        } else {
          console.log(`البوت مش مرتبط بحساب إنستجرام`);
          pageStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌
            </div>
          `;
          instructionsContainer.style.display = "block"; // Show instructions if bot is not linked
        }
      } catch (err) {
        console.error('Error loading account status:', err);
        pageStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌<br>
            <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
          </div>
        `;
        instructionsContainer.style.display = "block"; // Show instructions if bot is not linked
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
        // إرسال التوكن قصير الأمد للـ backend لتحويله إلى توكن طويل الأمد
        const saveResponse = await handleApiRequest(`/api/bots/${botId}/link-instagram`, {
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
      }
    }

    // Initialize Facebook SDK (used for Instagram as well)
    window.fbAsyncInit = function () {
      FB.init({
        appId: '499020366015281',
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      });
    };

    function loginWithInstagram() {
      FB.login(function (response) {
        if (response.authResponse) {
          console.log('تم تسجيل الدخول!');
          getUserAccounts(response.authResponse.accessToken);
        } else {
          errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ';
          errorMessage.style.display = 'block';
        }
      }, { 
        scope: 'public_profile,instagram_basic,instagram_manage_messages,instagram_manage_comments,instagram_manage_insights'
      });
    }

    function getUserAccounts(accessToken) {
      FB.api('/me/accounts', { access_token: accessToken }, function (response) {
        if (response && !response.error) {
          console.log('الصفحات:', response.data);
          if (response.data.length === 0) {
            errorMessage.textContent = 'لم يتم العثور على صفحات مرتبطة بحسابك';
            errorMessage.style.display = 'block';
            return;
          }

          const pageIds = response.data.map(page => page.id);
          const pagePromises = pageIds.map(pageId =>
            new Promise((resolve) => {
              FB.api(`/${pageId}?fields=instagram_business_account`, { access_token: accessToken }, function (igResponse) {
                if (igResponse && igResponse.instagram_business_account) {
                  resolve({
                    pageName: response.data.find(page => page.id === pageId).name,
                    igAccountId: igResponse.instagram_business_account.id,
                    accessToken: accessToken
                  });
                } else {
                  resolve(null);
                }
              });
            })
          );

          Promise.all(pagePromises).then(accounts => {
            const validAccounts = accounts.filter(account => account !== null);
            if (validAccounts.length === 0) {
              errorMessage.textContent = 'لم يتم العثور على حسابات إنستجرام مرتبطة بصفحاتك';
              errorMessage.style.display = 'block';
              return;
            }

            const modal = document.createElement("div");
            modal.classList.add("modal");
            modal.innerHTML = `
              <div class="modal-content">
                <div class="modal-header">
                  <h3>اختر حساب إنستجرام لربطه بالبوت</h3>
                  <button class="modal-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                  <select id="accountSelect" class="form-control">
                    <option value="">اختر حساب</option>
                    ${validAccounts.map(account => `<option value="${account.igAccountId}" data-token="${account.accessToken}">${account.pageName} (@${account.igAccountId})</option>`).join('')}
                  </select>
                </div>
                <div class="form-actions">
                  <button id="confirmAccountBtn" class="btn btn-primary">تأكيد</button>
                  <button class="btn btn-secondary modal-close-btn">إلغاء</button>
                </div>
              </div>
            `;
            document.body.appendChild(modal);

            modal.querySelectorAll(".modal-close-btn").forEach(btn => {
              btn.addEventListener("click", () => modal.remove());
            });

            document.getElementById("confirmAccountBtn").addEventListener("click", () => {
              const accountSelect = document.getElementById("accountSelect");
              const selectedAccountId = accountSelect.value;
              const selectedOption = accountSelect.options[accountSelect.selectedIndex];
              const accessToken = selectedOption.dataset.token;

              if (!selectedAccountId || !accessToken) {
                errorMessage.textContent = 'يرجى اختيار حساب لربطه بالبوت';
                errorMessage.style.display = 'block';
                modal.remove();
                return;
              }

              console.log('بيانات الحساب المختار:', { access_token: accessToken, account_id: selectedAccountId });
              saveApiKeys(selectedBotId, accessToken, selectedAccountId);
              modal.remove();
            });
          });
        } else {
          errorMessage.textContent = 'خطأ في جلب الحسابات: ' + (response.error.message || 'غير معروف');
          errorMessage.style.display = 'block';
        }
      });
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
