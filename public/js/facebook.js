// public/js/facebook.js

async function loadFacebookPage() {
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
      <h2><i class="fab fa-facebook"></i> إعدادات ربط فيسبوك</h2>
      <div id="instructionsContainer" class="instructions-container" style="display: none;">
        <h3>📋 خطوات بسيطة لربط صفحتك على فيسبوك</h3>
        <p>عشان تقدر تربط صفحتك بالبوت بنجاح، اتأكد من الخطوات دي:</p>
        <ul>
          <li>
            <strong>إنشاء صفحة فيسبوك:</strong> لازم يكون عندك صفحة فيسبوك تديرها.
            <br>
            <span style="display: block; margin-top: 5px;">
              <strong>إزاي تعمل صفحة؟</strong><br>
              1. افتح فيسبوك واضغط على "إنشاء" من القائمة.<br>
              2. اختار "صفحة" واملأ التفاصيل زي الاسم والفئة.<br>
              3. انشر الصفحة وتأكد إنك أنت المدير بتاعها.
            </span>
          </li>
          <li>
            <strong>تواصل معانا:</strong> بعد ما تعمل الصفحة، ابعتلنا رسالة على واتساب على الرقم 
            <a href="https://wa.me/01279425543" target="_blank">01279425543</a>، وهنبعتلك دعوة لتطبيقنا عشان تقدر تستخدمه.
          </li>
          <li>
            <strong>ربط الصفحة:</strong> بعد ما تقبل الدعوة، اضغط على زر ربط الصفحة، واختار الصفحة اللي بتديرها من القايمة اللي هتظهر.
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="connectFacebookBtn" class="btn btn-primary"><i class="fab fa-facebook"></i> ربط صفحتك على فيسبوك</button>
        <div id="pageStatus" class="page-status" style="margin-left: 20px;"></div>
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
              <p>تسمح للبوت بالردود على عمليات التفاعل مع الرسالة مثل اعجاب أو قلب.</p>
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
              <h4>الرد على التعليقات (Comments)</h4>
              <p>تسمح للبوت بالرد على تعليقات المستخدمين على بوستات الصفحة بنفس طريقة الرد على الرسايل.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="feedCommentsToggle" data-setting-key="feedCommentsEnabled">
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
  const instructionsContainer = document.getElementById("instructionsContainer");
  const connectFacebookBtn = document.getElementById("connectFacebookBtn");
  const pageStatus = document.getElementById("pageStatus");

  // Toggle elements
  const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
  const togglesError = document.getElementById("togglesError");

  // --- Functions ---

  async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorMessage = defaultErrorMessage;
        const contentType = response.headers.get("content-type");
        if (response.status === 404) {
          errorMessage = "الإعدادات غير متوفرة حاليًا. جرب لاحقًا أو تواصل مع الدعم.";
        } else if (!contentType || !contentType.includes("application/json")) {
          errorMessage = "الرد غير متوقع (مش JSON). يمكن إن الخدمة مش متاحة.";
        } else {
          const errorData = await response.json();
          errorMessage = errorData.message || defaultErrorMessage;
        }
        throw new Error(errorMessage);
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

    // Default settings in case the API fails
    const defaultSettings = {
      messagingOptinsEnabled: false,
      messageReactionsEnabled: false,
      messagingReferralsEnabled: false,
      messageEditsEnabled: false,
      feedCommentsEnabled: false,
    };

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "حدث خطأ أثناء تحميل الإعدادات");

      if (response.success && response.data) {
        const settings = response.data;
        console.log('تم جلب إعدادات فيسبوك بنجاح:', settings);

        // Populate Toggles
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && settings.hasOwnProperty(key)) {
            toggle.checked = settings[key];
            console.log(`Toggle ${key} set to: ${settings[key]}`);
          } else {
            console.warn(`Key ${key} not found in settings, using default`);
            toggle.checked = defaultSettings[key] || false;
          }
        });

        settingsContainer.style.display = "grid";
      } else {
        throw new Error("فشل في جلب الإعدادات: البيانات غير متاحة");
      }
    } catch (err) {
      console.error('خطأ في تحميل الإعدادات:', err);
      // Use default settings if API fails
      toggles.forEach(toggle => {
        const key = toggle.dataset.settingKey;
        toggle.checked = defaultSettings[key] || false;
      });
      settingsContainer.style.display = "grid";
      errorMessage.textContent = "تعذر تحميل الإعدادات، يتم استخدام الإعدادات الافتراضية. حاول لاحقًا أو تواصل مع الدعم.";
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

      // Check if bot is linked to a Facebook page
      if (bot.facebookPageId && bot.facebookApiKey) {
        console.log(`جاري جلب بيانات الصفحة بالـ ID: ${bot.facebookPageId}`);
        const response = await fetch(`https://graph.facebook.com/${bot.facebookPageId}?fields=name&access_token=${bot.facebookApiKey}`);
        const pageData = await response.json();

        if (pageData.name) {
          console.log(`تم جلب بيانات الصفحة بنجاح:`, pageData);

          // Create status container
          const statusDiv = document.createElement("div");
          statusDiv.style.display = "inline-block";
          statusDiv.style.color = "green";
          statusDiv.innerHTML = `
            <strong>حالة الربط:</strong> مربوط ✅<br>
            <strong>اسم الصفحة:</strong> ${pageData.name}<br>
            <strong>معرف الصفحة:</strong> ${bot.facebookPageId}<br>
            <strong>تاريخ الربط:</strong> ${new Date(bot.lastFacebookTokenRefresh).toLocaleString('ar-EG')}
          `;

          // Create unlink button
          const unlinkFacebookBtn = document.createElement("button");
          unlinkFacebookBtn.id = "unlinkFacebookBtn";
          unlinkFacebookBtn.className = "btn btn-danger";
          unlinkFacebookBtn.style.marginLeft = "10px";
          unlinkFacebookBtn.style.backgroundColor = "#dc3545";
          unlinkFacebookBtn.style.borderColor = "#dc3545";
          unlinkFacebookBtn.textContent = "إلغاء الربط";

          // Add event listener for unlink button
          unlinkFacebookBtn.addEventListener("click", async () => {
            if (confirm("هل أنت متأكد أنك تريد إلغاء ربط هذه الصفحة؟")) {
              try {
                await handleApiRequest(`/api/bots/${botId}/unlink-facebook`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }, errorMessage, "فشل في إلغاء ربط الصفحة");

                errorMessage.textContent = "تم إلغاء ربط الصفحة بنجاح!";
                errorMessage.style.color = "green";
                errorMessage.style.display = "block";
                await loadPageStatus(botId);
              } catch (err) {
                console.error('❌ خطأ في إلغاء الربط:', err);
                errorMessage.textContent = 'خطأ في إلغاء الربط: ' + (err.message || 'غير معروف');
                errorMessage.style.color = "red";
                errorMessage.style.display = "block";
              }
            }
          });

          // Append status and button to pageStatus
          pageStatus.innerHTML = "";
          pageStatus.appendChild(statusDiv);
          pageStatus.appendChild(unlinkFacebookBtn);

          instructionsContainer.style.display = "none";
        } else {
          console.log(`فشل في جلب بيانات الصفحة:`, pageData);
          pageStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌<br>
              <strong>السبب:</strong> فشل في جلب بيانات الصفحة (التوكن قد يكون غير صالح أو منتهي)
            </div>
          `;
          instructionsContainer.style.display = "block";
        }
      } else {
        console.log(`البوت مش مرتبط بصفحة فيسبوك`);
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

  async function updateWebhookSetting(botId, key, value) {
    togglesError.style.display = "none";

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/settings`, {
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

  // Initialize Facebook SDK
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

  function loginWithFacebook() {
    // First, check the login status
    FB.getLoginStatus(function(response) {
      if (response.status === 'connected') {
        // If user is logged in, log them out first
        console.log('المستخدم مسجّل دخوله، جاري تسجيل الخروج...');
        FB.logout(function(logoutResponse) {
          console.log('تم تسجيل الخروج من فيسبوك:', logoutResponse);
          // Proceed with login after logout
          performFacebookLogin();
        });
      } else {
        // If user is not logged in, proceed with login directly
        console.log('المستخدم غير مسجّل دخوله، جاري تسجيل الدخول...');
        performFacebookLogin();
      }
    });
  }

  function performFacebookLogin() {
    FB.login(function (response) {
      if (response.authResponse) {
        console.log('تم تسجيل الدخول!');
        getUserPages(response.authResponse.accessToken);
      } else {
        errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ';
        errorMessage.style.display = 'block';
      }
    }, { 
      scope: 'pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts',
      auth_type: 'reauthenticate'
    });
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
        displayPageSelectionModal(response.data);
      } else {
        errorMessage.textContent = 'خطأ في جلب الصفحات: ' + (response.error.message || 'غير معروف');
        errorMessage.style.display = 'block';
      }
    });
  }

  function displayPageSelectionModal(pages) {
    if (pages.length === 0) {
      errorMessage.textContent = 'لم يتم العثور على صفحات مرتبطة بحسابك';
      errorMessage.style.display = 'block';
      return;
    }

    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>اختر صفحة فيسبوك واحدة لربطها بالبوت</h3>
          <button class="modal-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <select id="pageSelect" class="form-control">
            <option value="">اختر صفحة</option>
            ${pages.map(page => `<option value="${page.id}" data-token="${page.access_token}">${page.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button id="confirmPageBtn" class="btn btn-primary">تأكيد</button>
          <button class="btn btn-secondary modal-close-btn">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll(".modal-close-btn").forEach(btn => {
      btn.addEventListener("click", () => modal.remove());
    });

    const confirmPageBtn = document.getElementById("confirmPageBtn");
    if (confirmPageBtn) {
      confirmPageBtn.addEventListener("click", () => {
        const pageSelect = document.getElementById("pageSelect");
        const selectedPageId = pageSelect.value;
        const selectedOption = pageSelect.options[pageSelect.selectedIndex];
        const accessToken = selectedOption.dataset.token;

        if (!selectedPageId || !accessToken) {
          errorMessage.textContent = 'يرجى اختيار صفحة لربطها بالبوت';
          errorMessage.style.display = 'block';
          modal.remove();
          return;
        }

        console.log('بيانات الصفحة المختارة:', { access_token: accessToken, page_id: selectedPageId });
        saveApiKeys(selectedBotId, accessToken, selectedPageId);
        modal.remove();
      });
    } else {
      console.error("❌ confirmPageBtn is not found in the DOM");
    }
  }

  async function saveApiKeys(botId, facebookApiKey, facebookPageId) {
    errorMessage.style.display = "none";
    loadingSpinner.style.display = "flex";

    if (!facebookApiKey || !facebookPageId) {
      loadingSpinner.style.display = "none";
      errorMessage.textContent = "فشل حفظ معلومات الربط: مفتاح API أو معرف الصفحة غير موجود";
      errorMessage.style.display = "block";
      return;
    }

    console.log('البيانات المرسلة:', { facebookApiKey, facebookPageId });

    try {
      const saveResponse = await handleApiRequest(`/api/bots/${botId}/link-social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ facebookApiKey, facebookPageId }),
      }, errorMessage, "فشل حفظ معلومات الربط");

      console.log('✅ التوكن تم حفظه بنجاح:', facebookApiKey.slice(0, 10) + '...');
      errorMessage.textContent = "تم ربط الصفحة بنجاح!";
      errorMessage.style.color = "green";
      errorMessage.style.display = "block";
      await loadPageStatus(botId);
    } catch (err) {
      console.error('❌ خطأ في حفظ التوكن:', err);
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  // --- Event Listeners ---
  if (connectFacebookBtn) {
    connectFacebookBtn.addEventListener("click", loginWithFacebook);
  } else {
    console.error("❌ connectFacebookBtn is not found in the DOM");
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
  await loadPageStatus(selectedBotId);
  await loadBotSettings(selectedBotId);
}

// Make loadFacebookPage globally accessible
window.loadFacebookPage = loadFacebookPage;

// Ensure the function is available even if called early
if (window.loadFacebookPage) {
  console.log('✅ loadFacebookPage is defined and ready');
} else {
  console.error('❌ loadFacebookPage is not defined');
}
