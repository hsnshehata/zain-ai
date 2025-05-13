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
    const pageStatus = document.getElementById("pageStatus");

    // Toggle elements
    const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
    const togglesError = document.getElementBygo to pageStatus.innerHTML = `
              <div style="display: inline-block; color: green;">
                <strong>حالة الربط:</strong> مربوط ✅<br>
                <strong>اسم الصفحة:</strong> ${pageData.name}<br>
                <strong>معرف الصفحة:</strong> ${bot.facebookPageId}
              </div>
            `;
          } else {
            console.log(`فشل في جلب بيانات الصفحة:`, pageData);
            pageStatus.innerHTML = `
              <div style="display: inline-block; color: red;">
                <strong>حالة الربط:</strong> غير مربوط ❌<br>
                <strong>السبب:</strong> فشل في جلب بيانات الصفحة (التوكن قد يكون غير صالح أو منتهي)
              </div>
            `;
          }
        } else {
          console.log(`البوت مش مرتبط بصفحة`);
          pageStatus.innerHTML = `
            <div style="display: inline-block; color: red;">
              <strong>حالة الربط:</strong> غير مربوط ❌
            </div>
          `;
        }
      } catch (err) {
        console.error('Error loading page status:', err);
        pageStatus.innerHTML = `
          <div style="display: inline-block; color: red;">
            <strong>حالة الربط:</strong> غير مربوط ❌<br>
            <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
          </div>
        `;
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

      console.log('البيانات المرسلة:', { facebookApiKey, facebookPageId });

      try {
        // طلب توكن طويل الأمد
        const response = await fetch(
          `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=499020366015281&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${facebookApiKey}`
        );
        const data = await response.json();
        if (!data.access_token) {
          throw new Error('فشل في جلب توكن طويل الأمد: ' + (data.error?.message || 'غير معروف'));
        }
        const longLivedToken = data.access_token;

        // حفظ التوكن الطويل الأمد
        const saveResponse = await handleApiRequest(`/api/bots/${botId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ facebookApiKey: longLivedToken, facebookPageId }),
        }, errorMessage, "فشل حفظ معلومات الربط");

        console.log('✅ توكن طويل الأمد تم حفظه بنجاح:', longLivedToken.slice(0, 10) + '...');
        alert("تم ربط الصفحة بنجاح!");
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

    // Initialize Facebook SDK
    window.fbAsyncInit = function () {
      FB.init({
        appId: '499020366015281',
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
      }, { 
        scope: 'public_profile,pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_engagement' 
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

          // Create a dropdown to select a single page
          const modal = document.createElement("div");
          modal.classList.add("modal");
          modal.innerHTML = `
            <div class="modal-content">
              <div class="modal-header">
                <h3>اختر صفحة واحدة لربطها بالبوت</h3>
                <button class="modal-close-btn"><i class="fas fa-times"></i></button>
              </div>
              <div class="modal-body">
                <select id="pageSelect" class="form-control">
                  <option value="">اختر صفحة</option>
                  ${response.data.map(page => `<option value="${page.id}" data-token="${page.access_token}">${page.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-actions">
                <button id="confirmPageBtn" class="btn btn-primary">تأكيد</button>
                <button class="btn btn-secondary modal-close-btn">إلغاء</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          // Close modal on cancel
          modal.querySelectorAll(".modal-close-btn").forEach(btn => {
            btn.addEventListener("click", () => modal.remove());
          });

          // Handle page selection
          document.getElementById("confirmPageBtn").addEventListener("click", () => {
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
    loadPageStatus(selectedBotId);
  }

  // Make loadFacebookPage globally accessible
  window.loadFacebookPage = loadFacebookPage;
});
