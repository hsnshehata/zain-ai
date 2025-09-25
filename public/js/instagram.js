// public/js/instagram.js

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
            <strong>إنشاء حساب مهني:</strong> لازم يكون عندك حساب إنستجرام مهني (Business Account) مرتبط بحساب فيسبوك يمتلك صفحة.
            <br>
            <span style="display: block; margin-top: 5px;">
              <strong>إزاي تعمل حساب مهني؟</strong><br>
              1. افتح تطبيق إنستجرام وادخل على إعدادات الحساب.<br>
              2. اختار "Switch to Professional Account".<br>
              3. اختار نوع الحساب (Business) وكمّل الخطوات.<br>
              4. اربط حسابك بصفحة فيسبوك تديرها.
            </span>
          </li>
          <li>
            <strong>تواصل معانا:</strong> بعد ما تعمل حساب مهني، ابعتلنا رسالة على واتساب على الرقم 
            <a href="https://wa.me/01279425543" target="_blank">01279425543</a>، وهنبعتلك دعوة لتطبيقنا عشان تقدر تستخدمه.
          </li>
          <li>
            <strong>ربط الحساب:</strong> بعد ما تقبل الدعوة، تقدر تختار الحساب المهني اللي بتديره من الزر اللي تحت عشان البوت يشتغل عليه.
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="connectInstagramBtn" class="btn btn-primary"><i class="fab fa-instagram"></i> ربط حسابك على إنستجرام</button>
        <div id="accountStatus" class="page-status" style="margin-left: 20px;"></div>
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
              <input type="checkbox" id="instagramMessagingOptinsToggle" data-setting-key="instagramMessagingOptinsEnabled">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <h4>ردود الفعل (Reactions)</h4>
              <p>تسمح للبوت بالردود على عمليات التفاعل مع الرسالة مثل اعجاب أو قلب.</p>
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
              <h4>الرد على التعليقات (Comments)</h4>
              <p>تسمح للبوت بالرد على تعليقات المستخدمين على بوستات الحساب بنفس طريقة الرد على الرسايل.</p>
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
  const accountStatus = document.getElementById("accountStatus");

  // Toggle elements
  const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
  const togglesError = document.getElementById("togglesError");

  // --- Functions ---

  async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("الرد غير متوقع (مش JSON). يمكن إن الـ endpoint مش موجود.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || defaultErrorMessage);
      }
      return await response.json();
    } catch (err) {
      if (errorElement) {
        errorElement.textContent = err.message;
        errorElement.style.display = "block";
      }
      throw err;
    }
  }

  async function loadBotSettings(botId) {
    loadingSpinner.style.display = "flex";
    settingsContainer.style.display = "none";
    errorMessage.style.display = "none";

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/instagram-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "حدث خطأ أثناء تحميل الإعدادات");

      if (response.success && response.data) {
        const settings = response.data;
        console.log('تم جلب إعدادات إنستجرام بنجاح:', settings);

        // Populate Toggles
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && settings.hasOwnProperty(key)) {
            toggle.checked = settings[key];
            console.log(`Toggle ${key} set to: ${settings[key]}`);
          } else {
            console.warn(`Key ${key} not found in settings or undefined`);
          }
        });

        settingsContainer.style.display = "grid";
      } else {
        throw new Error("فشل في جلب الإعدادات: البيانات غير متاحة");
      }
    } catch (err) {
      console.error('خطأ في تحميل الإعدادات:', err);
      errorMessage.textContent = "خطأ في تحميل الإعدادات: " + (err.message || "غير معروف");
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  async function loadAccountStatus(botId) {
    console.log(`جاري جلب بيانات البوت بالـ ID: ${botId}`);
    try {
      const bot = await handleApiRequest(`/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, accountStatus, "فشل في جلب بيانات البوت");

      if (!bot) {
        console.log(`البوت بالـ ID ${botId} مش موجود`);
        accountStatus.innerHTML = `
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
        const accountData = await response.json();

        if (accountData.username) {
          console.log(`تم جلب بيانات الحساب بنجاح:`, accountData);

          // Create status container
          const statusDiv = document.createElement("div");
          statusDiv.style.display = "inline-block";
          statusDiv.style.color = "green";
          statusDiv.innerHTML = `
            <strong>حالة الربط:</strong> مربوط ✅<br>
            <strong>اسم الحساب:</strong> ${accountData.username}<br>
            <strong>معرف الحساب:</strong> ${bot.instagramPageId}<br>
            <strong>تاريخ الربط:</strong> ${new Date(bot.lastInstagramTokenRefresh).toLocaleString('ar-EG')}
          `;

          // Create unlink button
          const unlinkInstagramBtn = document.createElement("button");
          unlinkInstagramBtn.id = "unlinkInstagramBtn";
          unlinkInstagramBtn.className = "btn btn-danger";
          unlinkInstagramBtn.style.marginLeft = "10px";
          unlinkInstagramBtn.style.backgroundColor = "#dc3545";
          unlinkInstagramBtn.style.borderColor = "#dc3545";
          unlinkInstagramBtn.textContent = "إلغاء الربط";

          // Add event listener for unlink button
          unlinkInstagramBtn.addEventListener("click", async () => {
            if (confirm("هل أنت متأكد أنك تريد إلغاء ربط هذا الحساب؟")) {
              try {
                await handleApiRequest(`/api/bots/${botId}/unlink-instagram`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }, errorMessage, "فشل في إلغاء ربط الحساب");

                errorMessage.textContent = "تم إلغاء ربط الحساب بنجاح!";
                errorMessage.style.color = "green";
                errorMessage.style.display = "block";
                await loadAccountStatus(botId);
              } catch (err) {
                console.error('❌ خطأ في إلغاء الربط:', err);
                errorMessage.textContent = 'خطأ في إلغاء الربط: ' + (err.message || 'غير معروف');
                errorMessage.style.color = "red";
                errorMessage.style.display = "block";
              }
            }
          });

          // Append status and button to accountStatus
          accountStatus.innerHTML = "";
          accountStatus.appendChild(statusDiv);
          accountStatus.appendChild(unlinkInstagramBtn);

          instructionsContainer.style.display = "none";
        } else {
          console.log(`فشل في جلب بيانات الحساب:`, accountData);
          accountStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌<br>
              <strong>السبب:</strong> فشل في جلب بيانات الحساب (التوكن قد يكون غير صالح أو منتهي)
            </div>
          `;
          instructionsContainer.style.display = "block";
        }
      } else {
        console.log(`البوت مش مرتبط بحساب إنستجرام`);
        accountStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌
          </div>
        `;
        instructionsContainer.style.display = "block";
      }
    } catch (err) {
      console.error('Error loading account status:', err);
      accountStatus.innerHTML = `
        <div style="display: inline-block; color: red;">
          <strong>حالة الربط:</strong> غير مربوط ❌<br>
          <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
        </div>
      `;
      instructionsContainer.style.display = "block";
    }
  }

  async function updateWebhookSetting(botId, key, value) {
    togglesError.style.display = "none";

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/instagram-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      }, togglesError, `فشل تحديث إعداد ${key}`);

      if (response.success) {
        console.log(`✅ Updated ${key} to ${value} for bot ${botId}`);
      } else {
        throw new Error("فشل في تحديث الإعداد");
      }
    } catch (err) {
      console.error('خطأ في تحديث الإعداد:', err);
      const toggleInput = document.querySelector(`input[data-setting-key="${key}"]`);
      if (toggleInput) toggleInput.checked = !value;
    }
  }

  // Initialize Instagram SDK (Using Facebook SDK for Instagram login)
  window.fbAsyncInit = function () {
    FB.init({
      appId: '2288330081539329',
      cookie: true,
      xfbml: true,
      version: 'v20.0'
    });
  };

  // Load Facebook SDK
  const fbScript = document.createElement("script");
  fbScript.src = "https://connect.facebook.net/en_US/sdk.js";
  fbScript.async = true;
  fbScript.defer = true;
  fbScript.crossOrigin = "anonymous";
  document.head.appendChild(fbScript);

  function loginWithInstagram() {
    // First, check the login status
    FB.getLoginStatus(function(response) {
      if (response.status === 'connected') {
        // If user is logged in, log them out first
        console.log('المستخدم مسجّل دخوله، جاري تسجيل الخروج...');
        FB.logout(function(logoutResponse) {
          console.log('تم تسجيل الخروج من فيسبوك:', logoutResponse);
          // Proceed with login after logout
          performInstagramLogin();
        });
      } else {
        // If user is not logged in, proceed with login directly
        console.log('المستخدم غير مسجّل دخوله، جاري تسجيل الدخول...');
        performInstagramLogin();
      }
    });
  }

  function performInstagramLogin() {
    FB.login(function (response) {
      if (response.authResponse) {
        console.log('تم تسجيل الدخول!');
        getUserAccounts(response.authResponse.accessToken);
      } else {
        errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ';
        errorMessage.style.display = 'block';
      }
    }, { 
      scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments',
      auth_type: 'reauthenticate' // Force re-authentication to show permission prompt
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

        // Filter accounts with Instagram Business Account linked
        const accountsWithInstagram = [];
        response.data.forEach(page => {
          FB.api(`/${page.id}?fields=instagram_business_account`, { access_token: accessToken }, function (igResponse) {
            if (igResponse && !igResponse.error && igResponse.instagram_business_account) {
              accountsWithInstagram.push({
                id: igResponse.instagram_business_account.id,
                name: page.name,
                access_token: page.access_token
              });

              if (response.data.length === accountsWithInstagram.length + (response.data.length - accountsWithInstagram.length)) {
                displayAccountSelectionModal(accountsWithInstagram);
              }
            }
          });
        });
      } else {
        errorMessage.textContent = 'خطأ في جلب الصفحات: ' + (response.error.message || 'غير معروف');
        errorMessage.style.display = 'block';
      }
    });
  }

  function displayAccountSelectionModal(accounts) {
    if (accounts.length === 0) {
      errorMessage.textContent = 'لم يتم العثور على حسابات إنستجرام مهنية مرتبطة بصفحاتك';
      errorMessage.style.display = 'block';
      return;
    }

    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>اختر حساب إنستجرام واحد لربطه بالبوت</h3>
          <button class="modal-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <select id="accountSelect" class="form-control">
            <option value="">اختر حساب</option>
            ${accounts.map(account => `<option value="${account.id}" data-token="${account.access_token}">${account.name}</option>`).join('')}
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

    const confirmAccountBtn = document.getElementById("confirmAccountBtn");
    if (confirmAccountBtn) {
      confirmAccountBtn.addEventListener("click", () => {
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
    } else {
      console.error("❌ confirmAccountBtn is not found in the DOM");
    }
  }

  async function saveApiKeys(botId, instagramApiKey, instagramPageId) {
    errorMessage.style.display = "none";
    loadingSpinner.style.display = "flex";

    if (!instagramApiKey || !instagramPageId) {
      loadingSpinner.style.display = "none";
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
      errorMessage.textContent = "تم ربط الحساب بنجاح!";
      errorMessage.style.color = "green";
      errorMessage.style.display = "block";
      await loadAccountStatus(botId);
    } catch (err) {
      console.error('❌ خطأ في حفظ التوكن:', err);
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  // --- Event Listeners ---
  if (connectInstagramBtn) {
    connectInstagramBtn.addEventListener("click", loginWithInstagram);
  } else {
    console.error("❌ connectInstagramBtn is not found in the DOM");
  }

  toggles.forEach(toggle => {
    if (toggle) {
      toggle.addEventListener("change", (e) => {
        const key = e.target.dataset.settingKey;
        const value = e.target.checked;
        if (key) {
          updateWebhookSetting(selectedBotId, key, value);
        }
      });
    } else {
      console.error("❌ A toggle element is not found in the DOM");
    }
  });

  // --- Initial Load ---
  await loadAccountStatus(selectedBotId);
  await loadBotSettings(selectedBotId);
}

// Make loadInstagramPage globally accessible
window.loadInstagramPage = loadInstagramPage;

// Ensure the function is available even if called early
if (window.loadInstagramPage) {
  console.log('✅ loadInstagramPage is defined and ready');
} else {
  console.error('❌ loadInstagramPage is not defined');
}
