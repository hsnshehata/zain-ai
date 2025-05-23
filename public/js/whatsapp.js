// public/js/whatsapp.js
console.log('WhatsApp script started loading at', new Date().toISOString());

async function loadWhatsAppPage() {
  console.log('loadWhatsAppPage called at', new Date().toISOString());
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/facebook.css"; // نستخدم نفس ستايل فيسبوك
  document.head.appendChild(link);
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض إعدادات واتساب.</p>
      </div>
    `;
    return;
  }

  if (!token) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
        <p>يرجى تسجيل الدخول لعرض إعدادات واتساب.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fab fa-whatsapp"></i> إعدادات ربط واتساب</h2>
      <div id="instructionsContainer" class="instructions-container" style="display: none;">
        <h3>📋 خطوات بسيطة لربط حسابك على واتساب</h3>
        <p>عشان تقدر تربط حسابك بالبوت بنجاح، اتأكد من الخطوات دي:</p>
        <ul>
          <li>
            <strong>إنشاء حساب واتساب بيزنس:</strong> لازم يكون عندك حساب واتساب بيزنس (WhatsApp Business Account) مرتبط بحساب فيسبوك بيزنس.
            <br>
            <span style="display: block; margin-top: 5px;">
              <strong>إزاي تعمل حساب واتساب بيزنس؟</strong><br>
              1. افتح تطبيق واتساب بيزنس واتأكد إن رقمك مسجل.<br>
              2. اربط حسابك بحساب فيسبوك بيزنس من إعدادات التطبيق.<br>
              3. ادخل على Meta Business Manager وأضف رقم واتساب في قسم WhatsApp Accounts.<br>
            </span>
          </li>
          <li>
            <strong>تواصل معانا:</strong> بعد ما تعمل حساب واتساب بيزنس، ابعتلنا رسالة على واتساب على الرقم 
            <a href="https://wa.me/01279425543" target="_blank">01279425543</a>، وهنبعتلك دعوة لتطبيقنا.
          </li>
          <li>
            <strong>ربط الحساب:</strong> بعد ما تقبل الدعوة، تقدر تختار رقم واتساب اللي بتديره من الزر اللي تحت.
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="connectWhatsAppBtn" class="btn btn-primary"><i class="fab fa-whatsapp"></i> ربط حسابك على واتساب</button>
        <div id="accountStatus" class="page-status" style="margin-left: 20px;"></div>
      </div>
    </div>

    <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div id="whatsappSettingsContainer" class="settings-container whatsapp-settings-grid" style="display: none;">
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-toggle-on"></i> تفعيل ميزات Webhook</h3></div>
        <div class="card-body toggles-grid">
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <h4>رسائل الترحيب (Opt-ins)</h4>
              <p>إرسال رسالة ترحيب من البوت بمجرد بدء محادثة جديدة.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="whatsappMessagingOptinsToggle" data-setting-key="whatsappMessagingOptinsEnabled">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <h4>ردود الفعل (Reactions)</h4>
              <p>تسمح للبوت بالرد على ردود الفعل مثل الإيموجي.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="whatsappMessageReactionsToggle" data-setting-key="whatsappMessageReactionsEnabled">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <h4>تتبع المصدر (Referrals)</h4>
              <p>معرفة مصدر المستخدم (مثل إعلانات أو روابط).</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="whatsappMessagingReferralsToggle" data-setting-key="whatsappMessagingReferralsEnabled">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <h4>تعديلات الرسائل (Edits)</h4>
              <p>استقبال إشعارات عند تعديل رسالة وتوليد رد جديد.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="whatsappMessageEditsToggle" data-setting-key="whatsappMessageEditsEnabled">
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
  const settingsContainer = document.getElementById("whatsappSettingsContainer");
  const instructionsContainer = document.getElementById("instructionsContainer");
  const connectWhatsAppBtn = document.getElementById("connectWhatsAppBtn");
  const accountStatus = document.getElementById("accountStatus");
  const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
  const togglesError = document.getElementById("togglesError");

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
      const response = await handleApiRequest(`/api/bot/${botId}/whatsapp-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "حدث خطأ أثناء تحميل الإعدادات");

      if (response.success && response.data) {
        const settings = response.data;
        console.log('تم جلب إعدادات واتساب بنجاح:', settings);
        toggles.forEach(toggle => {
          const key = toggle.dataset.settingKey;
          if (key && settings.hasOwnProperty(key)) {
            toggle.checked = settings[key];
            console.log(`Toggle ${key} set to: ${settings[key]}`);
          }
        });
        settingsContainer.style.display = "grid";
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
        accountStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌<br>
            <strong>السبب:</strong> البوت غير موجود أو تم حذفه
          </div>
        `;
        instructionsContainer.style.display = "block";
        return;
      }

      if (bot.whatsappBusinessAccountId && bot.whatsappApiKey) {
        const response = await fetch(`https://graph.whatsapp.com/v22.0/${bot.whatsappBusinessAccountId}?fields=phone_number&access_token=${bot.whatsappApiKey}`);
        const accountData = await response.json();

        if (accountData.phone_number) {
          const statusDiv = document.createElement("div");
          statusDiv.style.display = "inline-block";
          statusDiv.style.color = "green";
          statusDiv.innerHTML = `
            <strong>حالة الربط:</strong> مربوط ✅<br>
            <strong>رقم واتساب:</strong> ${accountData.phone_number}<br>
            <strong>معرف الحساب:</strong> ${bot.whatsappBusinessAccountId}<br>
            <strong>تاريخ الربط:</strong> ${new Date(bot.lastWhatsappTokenRefresh).toLocaleString('ar-EG')}
          `;

          const unlinkWhatsAppBtn = document.createElement("button");
          unlinkWhatsAppBtn.id = "unlinkWhatsAppBtn";
          unlinkWhatsAppBtn.className = "btn btn-danger";
          unlinkWhatsAppBtn.style.marginLeft = "10px";
          unlinkWhatsAppBtn.style.backgroundColor = "#dc3545";
          unlinkWhatsAppBtn.style.borderColor = "#dc3545";
          unlinkWhatsAppBtn.textContent = "إلغاء الربط";

          unlinkWhatsAppBtn.addEventListener("click", async () => {
            if (confirm("هل أنت متأكد أنك تريد إلغاء ربط هذا الحساب؟")) {
              try {
                await handleApiRequest(`/api/bots/${botId}/unlink-whatsapp`, {
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
                errorMessage.textContent = 'خطأ في إلغاء الربط: ' + (err.message || 'غير معروف');
                errorMessage.style.color = "red";
                errorMessage.style.display = "block";
              }
            }
          });

          accountStatus.innerHTML = "";
          accountStatus.appendChild(statusDiv);
          accountStatus.appendChild(unlinkWhatsAppBtn);
          instructionsContainer.style.display = "none";
        } else {
          accountStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌<br>
              <strong>السبب:</strong> فشل في جلب بيانات الحساب (التوكن قد يكون غير صالح أو منتهي)
            </div>
          `;
          instructionsContainer.style.display = "block";
        }
      } else {
        accountStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌
          </div>
        `;
        instructionsContainer.style.display = "block";
      }
    } catch (err) {
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
      const response = await handleApiRequest(`/api/bot/${botId}/whatsapp-settings`, {
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

  window.fbAsyncInit = function () {
    FB.init({
      appId: '499020366015281', // معرف التكوين لواتساب
      cookie: true,
      xfbml: true,
      version: 'v22.0'
    });
  };

  const fbScript = document.createElement("script");
  fbScript.src = "https://connect.facebook.net/en_US/sdk.js";
  fbScript.async = true;
  fbScript.defer = true;
  fbScript.crossOrigin = "anonymous";
  document.head.appendChild(fbScript);

  function loginWithWhatsApp() {
    FB.getLoginStatus(function(response) {
      if (response.status === 'connected') {
        FB.logout(function(logoutResponse) {
          console.log('تم تسجيل الخروج من فيسبوك:', logoutResponse);
          performWhatsAppLogin();
        });
      } else {
        console.log('المستخدم غير مسجّل دخوله، جاري تسجيل الدخول...');
        performWhatsAppLogin();
      }
    });
  }

  function performWhatsAppLogin() {
    FB.login(function (response) {
      if (response.authResponse) {
        console.log('تم تسجيل الدخول!');
        getWhatsAppAccounts(response.authResponse.accessToken);
      } else {
        errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ';
        errorMessage.style.display = 'block';
      }
    }, { 
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
      auth_type: 'reauthenticate'
    });
  }

  function getWhatsAppAccounts(accessToken) {
    // التحقق من الصلاحيات أولاً
    FB.api('/me/permissions', { access_token: accessToken }, function (permissionsResponse) {
      console.log('الصلاحيات المتاحة:', permissionsResponse);
      if (permissionsResponse.error) {
        errorMessage.textContent = 'خطأ في التحقق من الصلاحيات: ' + (permissionsResponse.error.message || 'غير معروف');
        errorMessage.style.display = 'block';
        return;
      }

      const hasWhatsAppManagement = permissionsResponse.data.some(perm => 
        perm.permission === 'whatsapp_business_management' && perm.status === 'granted'
      );
      const hasWhatsAppMessaging = permissionsResponse.data.some(perm => 
        perm.permission === 'whatsapp_business_messaging' && perm.status === 'granted'
      );

      if (!hasWhatsAppManagement || !hasWhatsAppMessaging) {
        errorMessage.textContent = 'التوكن لا يحتوي على الصلاحيات المطلوبة لإدارة واتساب بيزنس. تأكد من إعدادات التطبيق.';
        errorMessage.style.display = 'block';
        return;
      }

      // جلب الـ Business Accounts أولاً
      FB.api('/me/businesses', { access_token: accessToken }, function (businessResponse) {
        console.log('استجابة جلب الـ Business Accounts:', businessResponse);
        if (businessResponse && !businessResponse.error) {
          const businesses = businessResponse.data;
          if (businesses.length === 0) {
            errorMessage.textContent = 'لم يتم العثور على حسابات بيزنس مرتبطة. تأكد من إعدادات حسابك في Meta Business Manager.';
            errorMessage.style.display = 'block';
            return;
          }

          const accountsWithWhatsApp = [];
          let processedCount = 0;

          businesses.forEach(business => {
            // جلب الـ WhatsApp Business Accounts من كل Business
            FB.api(`/${business.id}/owned_whatsapp_business_accounts`, { access_token: accessToken }, function (waResponse) {
              processedCount++;
              console.log(`استجابة جلب حسابات واتساب بيزنس لـ Business ID ${business.id}:`, waResponse);

              if (waResponse && !waResponse.error && waResponse.data && waResponse.data.length > 0) {
                waResponse.data.forEach(account => {
                  if (!account.phone_number) {
                    FB.api(`/${account.id}`, { fields: 'phone_number', access_token: accessToken }, function (phoneResponse) {
                      if (phoneResponse && !phoneResponse.error && phoneResponse.phone_number) {
                        account.phone_number = phoneResponse.phone_number;
                      } else {
                        console.warn(`فشل جلب رقم الهاتف للحساب ${account.id}:`, phoneResponse?.error || 'لا يوجد رقم');
                        account.phone_number = 'رقم واتساب غير متاح';
                      }
                      accountsWithWhatsApp.push({
                        id: account.id,
                        phone_number: account.phone_number || 'رقم واتساب غير متاح',
                        access_token: accessToken
                      });
                      if (processedCount === businesses.length) {
                        finalizeAccounts(accountsWithWhatsApp);
                      }
                    });
                  } else {
                    accountsWithWhatsApp.push({
                      id: account.id,
                      phone_number: account.phone_number || 'رقم واتساب',
                      access_token: accessToken
                    });
                    if (processedCount === businesses.length) {
                      finalizeAccounts(accountsWithWhatsApp);
                    }
                  }
                });
              } else {
                console.warn(`فشل جلب حسابات واتساب بيزنس لـ Business ID ${business.id}:`, waResponse?.error || 'لا توجد بيانات');
                if (processedCount === businesses.length) {
                  finalizeAccounts(accountsWithWhatsApp);
                }
              }
            });
          });
        } else {
          errorMessage.textContent = 'خطأ في جلب حسابات البيزنس: ' + (businessResponse.error?.message || 'غير معروف');
          errorMessage.style.display = 'block';
        }
      });
    });
  }

  function finalizeAccounts(accountsWithWhatsApp) {
    if (accountsWithWhatsApp.length === 0) {
      errorMessage.textContent = 'لم يتم العثور على حسابات واتساب بيزنس مرتبطة. تأكد من إعدادات حسابك في Meta Business Manager.';
      errorMessage.style.display = 'block';
      return;
    }
    displayAccountSelectionModal(accountsWithWhatsApp);
  }

  function displayAccountSelectionModal(accounts) {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>اختر حساب واتساب واحد لربطه بالبوت</h3>
          <button class="modal-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <select id="accountSelect" class="form-control">
            <option value="">اختر حساب</option>
            ${accounts.map(account => `<option value="${account.id}" data-token="${account.access_token}">${account.phone_number}</option>`).join('')}
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
  }

  async function saveApiKeys(botId, whatsappApiKey, whatsappBusinessAccountId) {
    errorMessage.style.display = "none";
    loadingSpinner.style.display = "flex";

    try {
      const saveResponse = await handleApiRequest(`/api/bots/${botId}/link-social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsappApiKey, whatsappBusinessAccountId }),
      }, errorMessage, "فشل حفظ معلومات الربط");
      errorMessage.textContent = "تم ربط الحساب بنجاح!";
      errorMessage.style.color = "green";
      errorMessage.style.display = "block";
      await loadAccountStatus(botId);
    } catch (err) {
      errorMessage.textContent = "فشل حفظ معلومات الربط: " + (err.message || "غير معروف");
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  if (connectWhatsAppBtn) {
    connectWhatsAppBtn.addEventListener("click", loginWithWhatsApp);
  } else {
    console.error("❌ connectWhatsAppBtn is not found in the DOM");
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

  loadAccountStatus(selectedBotId);
  loadBotSettings(selectedBotId);
}

window.loadWhatsAppPage = loadWhatsAppPage;

console.log('WhatsApp script loaded, loadWhatsAppPage defined:', typeof window.loadWhatsAppPage);
