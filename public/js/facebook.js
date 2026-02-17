// public/js/facebook.js

async function loadFacebookPage(rootEl = document.getElementById("content")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/facebook.css";
  document.head.appendChild(link);
  const content = rootEl || document.getElementById("content");
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
        <h3>📋 خطوات ربط صفحتك على فيسبوك بالبوت</h3>
        <p>عشان تربط صفحتك بالبوت بسهولة، اتّبع الخطوات دي بعناية:</p>
        <ul>
          <li>
            <strong>1. لازم يكون عندك صفحة فيسبوك:</strong> لازم تكون مدير صفحة فيسبوك مربوطة بحسابك الشخصي.
            <br>
            <span style="display: block; margin-top: 5px;">
              <strong>إزاي تعمل صفحة لو معندكش؟</strong><br>
              - افتح فيسبوك واضغط على "إنشاء" من القايمة الجانبية.<br>
              - اختار "صفحة"، واملّي بيانات زي اسم الصفحة ونوعها (مثل: بيزنس أو مجتمع).<br>
              - انشر الصفحة وتأكد إنك أنت المدير بتاعها من إعدادات الصفحة.
            </span>
          </li>
          <li>
            <strong>2. إنشاء حساب مطور فيسبوك:</strong> لازم يكون عندك حساب مطور على موقع فيسبوك للمطورين عشان تقدر تربط التطبيق.
            <br>
            <span style="display: block; margin-top: 5px;">
              <strong>إزاي تعمل حساب مطور؟</strong><br>
              - اضغط على الزرار ده وروح على موقع فيسبوك للمطورين:
              <br>
              <a href="https://developers.facebook.com/" target="_blank" class="btn btn-primary btn-developer" style="display: inline-block; margin: 10px 0; padding: 8px 16px; background-color: #1877F2; color: white; border-radius: 5px; text-decoration: none;">
                <i class="fab fa-facebook"></i> موقع فيسبوك للمطورين
              </a><br>
              - لو أول مرة تدخل، اضغط على "Get Started" أو "التسجيل".<br>
              - سجّل بحسابك في فيسبوك، ووافق على شروط المطورين.<br>
            </span>
          </li>
          <li>
            <strong>3. ابعتلنا رابط صفحتك على واتساب:</strong> بعد ما تعمل الصفحة وحساب المطور، ابعتلنا رابط صفحتك على واتساب.
            <br>
            <span style="display: block; margin-top: 5px;">
              - ابعت الرابط على الرقم: <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.<br>
              - هنبعتلك دعوة لتطبيقنا على فيسبوك عشان تقدر تستخدمه.<br>
              - افتح الدعوة من إشعارات فيسبوك، واضغط "قبول" عشان تفعّل التطبيق.
            </span>
          </li>
          <li>
            <strong>4. ارجع واربط الصفحة:</strong> بعد ما تقبل الدعوة، ارجع هنا واضغط على زر "ربط الصفحة".
            <br>
            <span style="display: block; margin-top: 5px;">
              - هيظهرلك قايمة بالصفحات اللي بتديرها.<br>
              - اختار الصفحة اللي عايز تربطها، واضغط "تأكيد".<br>
              - لو كل حاجة تمام، هيتربط البوت بصفحتك بنجاح!
            </span>
          </li>
        </ul>
      </div>
      <div class="header-actions">
        <button id="connectFacebookBtn" class="btn btn-primary"><i class="fab fa-facebook"></i> ربط صفحتك على فيسبوك</button>
        <button id="resetFacebookBtn" class="btn btn-secondary"><i class="fas fa-sign-out-alt"></i> تبديل حساب فيسبوك</button>
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
          <div class="setting-item toggle-item" style="flex-wrap: wrap;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <div class="setting-info">
                <h4>الرد على التعليقات (Comments)</h4>
                <p>تسمح للبوت بالرد على تعليقات المستخدمين.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="commentsRepliesToggle" data-setting-key="commentsRepliesEnabled">
                <span class="slider"></span>
              </label>
            </div>
            
            <div id="commentsConfiguration" style="width: 100%; display: none; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                <div class="form-group">
                  <label for="commentReplyModeSelect"><b>نظام الرد:</b></label>
                  <select id="commentReplyModeSelect" class="form-control" style="margin-bottom: 10px;">
                    <option value="ai">🤖 الذكاء الاصطناعي (AI)</option>
                    <option value="keyword">🔑 الكلمات المفتاحية (Keywords)</option>
                    <option value="private">📩 الرد الخاص (Private Reply)</option>
                  </select>
                </div>

                <!-- Keyword Mode Settings -->
                <div id="keywordModeSettings" style="display: none; margin-top: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                    <label style="display:block; margin-bottom:10px;"><b>قواعد الكلمات المفتاحية:</b></label>
                    <div id="keywordsContainer"></div>
                    <button id="addKeywordRowBtn" class="btn btn-sm btn-outline-primary" style="margin-top: 10px;"><i class="fas fa-plus"></i> إضافة قاعدة جديدة</button>
                    
                    <div class="form-group" style="margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 15px;">
                      <label><b>الرد الافتراضي (في حال عدم وجود تطابق):</b></label>
                      <input type="text" id="commentDefaultReplyInput" class="form-control" placeholder="مثال: شكراً على تعليقك، سنتواصل معك قريباً.">
                      <small class="text-muted">اترك هذا الحقل فارغاً إذا كنت لا تريد رداً افتراضياً.</small>
                    </div>
                </div>

                <!-- Private Mode Settings -->
                <div id="privateModeSettings" style="display: none; margin-top: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                    <div class="alert alert-info" style="font-size: 0.9em; margin-bottom: 15px;">
                      <i class="fas fa-info-circle"></i> في هذا الوضع، سيقوم البوت بالرد على التعليق برسالة عامة (أدناه)، ثم يأخذ سؤال العميل ويرسله للذكاء الاصطناعي ليقوم بالرد عليه في <b>رسالة خاصة (Messenger)</b>.
                    </div>
                    <div class="form-group">
                      <label><b>رسالة الرد العام على التعليق:</b></label>
                      <input type="text" id="privateReplyMessageInput" class="form-control" placeholder="تم إرسال التفاصيل على الخاص">
                    </div>
                </div>

                <div style="margin-top: 20px; text-align: left;">
                  <button id="saveCommentSettingsBtn" class="btn btn-success"><i class="fas fa-save"></i> حفظ إعدادات التعليقات</button>
                </div>
                <p id="commentSettingsMessage" class="message" style="display: none; margin-top: 10px;"></p>
            </div>
          </div>
        </div>
        <p id="togglesError" class="error-message small-error" style="display: none;"></p>
      </div>
      <div class="card settings-card">
        <div class="card-header"><h3><i class="fas fa-pause-circle"></i> إيقاف ردود البوت بكلمة</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label for="pauseKeywordInput">الكلمة التي يرسلها المالك لإيقاف الردود في المحادثة</label>
            <input type="text" id="pauseKeywordInput" class="form-control" placeholder="مثال: stopbot">
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label for="pauseDurationInput">مدة الإيقاف بالدقائق</label>
            <input type="number" min="1" max="10080" id="pauseDurationInput" class="form-control" placeholder="30">
          </div>
          <div class="form-actions" style="margin-top: 16px; display: flex; gap: 10px; align-items: center;">
            <button id="savePauseSettingsBtn" class="btn btn-primary"><i class="fas fa-save"></i> حفظ الإعداد</button>
            <small class="text-muted">عند إرسال الكلمة من حساب الصفحة للمحادثة سيتم إيقاف الردود لمدة المدة المحددة.</small>
          </div>
          <p id="pauseSettingsError" class="error-message small-error" style="display: none;"></p>
        </div>
      </div>
    </div>
  `;

  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const settingsContainer = document.getElementById("facebookSettingsContainer");
  const instructionsContainer = document.getElementById("instructionsContainer");
  const connectFacebookBtn = document.getElementById("connectFacebookBtn");
  const resetFacebookBtn = document.getElementById("resetFacebookBtn");
  const pageStatus = document.getElementById("pageStatus");

  // Toggle elements
  const toggles = settingsContainer.querySelectorAll(".switch input[type=\"checkbox\"]");
  const togglesError = document.getElementById("togglesError");
  const pauseKeywordInput = document.getElementById("pauseKeywordInput");
  const pauseDurationInput = document.getElementById("pauseDurationInput");
  const savePauseSettingsBtn = document.getElementById("savePauseSettingsBtn");
  const pauseSettingsError = document.getElementById("pauseSettingsError");

  // Comment Settings Elements
  const commentsConfiguration = document.getElementById("commentsConfiguration");
  const commentReplyModeSelect = document.getElementById("commentReplyModeSelect");
  const keywordModeSettings = document.getElementById("keywordModeSettings");
  const privateModeSettings = document.getElementById("privateModeSettings");
  const keywordsContainer = document.getElementById("keywordsContainer");
  const addKeywordRowBtn = document.getElementById("addKeywordRowBtn");
  const commentDefaultReplyInput = document.getElementById("commentDefaultReplyInput");
  const privateReplyMessageInput = document.getElementById("privateReplyMessageInput");
  const saveCommentSettingsBtn = document.getElementById("saveCommentSettingsBtn");
  const commentSettingsMessage = document.getElementById("commentSettingsMessage");
  const commentsRepliesToggle = document.getElementById("commentsRepliesToggle");

  const cacheKey = 'facebook-settings';

  function applyCachedSettings(snapshot) {
    try {
      if (!snapshot?.settings) return;
      const settings = snapshot.settings;
      toggles.forEach(toggle => {
        const key = toggle.dataset.settingKey;
        if (key && settings.hasOwnProperty(key)) {
          toggle.checked = !!settings[key];
        }
      });
      if (pauseKeywordInput) pauseKeywordInput.value = settings.ownerPauseKeyword || '';
      if (pauseDurationInput) pauseDurationInput.value = settings.ownerPauseDurationMinutes ?? 30;
      if (typeof snapshot.statusHtml === 'string') {
        pageStatus.innerHTML = snapshot.statusHtml;
        instructionsContainer.style.display = snapshot.showInstructions ? "block" : "none";
      }
      settingsContainer.style.display = "grid";
      loadingSpinner.style.display = "none";
      console.log('Applied cached Facebook settings snapshot');
    } catch (err) {
      console.warn('Failed to apply Facebook cache:', err);
    }
  }

  const cached = window.readPageCache ? window.readPageCache(cacheKey, selectedBotId, 5 * 60 * 1000) : null;
  if (cached) {
    applyCachedSettings(cached);
  }

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
      commentsRepliesEnabled: false,
      ownerPauseKeyword: '',
      ownerPauseDurationMinutes: 30,
      commentReplyMode: 'ai',
      commentKeywords: [],
      commentDefaultReply: '',
      privateReplyMessage: 'تم إرسال التفاصيل على الخاص'
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

        if (pauseKeywordInput) pauseKeywordInput.value = settings.ownerPauseKeyword || '';
        if (pauseDurationInput) pauseDurationInput.value = settings.ownerPauseDurationMinutes ?? defaultSettings.ownerPauseDurationMinutes;

        // Populate Comment Settings
        if (commentReplyModeSelect) commentReplyModeSelect.value = settings.commentReplyMode || 'ai';
        if (commentDefaultReplyInput) commentDefaultReplyInput.value = settings.commentDefaultReply || '';
        if (privateReplyMessageInput) privateReplyMessageInput.value = settings.privateReplyMessage || 'تم إرسال التفاصيل على الخاص';

        renderKeywords(settings.commentKeywords || []);
        updateCommentUIState();


        settingsContainer.style.display = "grid";

        window.writePageCache && window.writePageCache(cacheKey, botId, {
          settings,
          statusHtml: pageStatus.innerHTML,
          showInstructions: instructionsContainer.style.display !== 'none'
        });
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
      if (pauseKeywordInput) pauseKeywordInput.value = defaultSettings.ownerPauseKeyword;
      if (pauseDurationInput) pauseDurationInput.value = defaultSettings.ownerPauseDurationMinutes;
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

      window.writePageCache && window.writePageCache(cacheKey, botId, {
        settings: null,
        statusHtml: pageStatus.innerHTML,
        showInstructions: instructionsContainer.style.display !== 'none'
      });
    } catch (err) {
      console.error('Error loading page status:', err);
      pageStatus.innerHTML = `
        <div style="display: inline-block; color: red;">
          <strong>حالة الربط:</strong> غير مربوط ❌<br>
          <strong>السبب:</strong> خطأ في جلب بيانات البوت: ${err.message || 'غير معروف'}
        </div>
      `;
      instructionsContainer.style.display = "block";
      window.writePageCache && window.writePageCache(cacheKey, botId, {
        settings: null,
        statusHtml: pageStatus.innerHTML,
        showInstructions: instructionsContainer.style.display !== 'none'
      });
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

  async function savePauseSettings(botId) {
    pauseSettingsError.style.display = "none";

    const keyword = pauseKeywordInput?.value?.trim() || '';
    const duration = Number(pauseDurationInput?.value || 0);

    if (Number.isNaN(duration) || duration <= 0 || duration > 10080) {
      pauseSettingsError.textContent = "مدة الإيقاف يجب أن تكون بين 1 و 10080 دقيقة.";
      pauseSettingsError.style.display = "block";
      pauseSettingsError.style.color = "red";
      return;
    }

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ownerPauseKeyword: keyword, ownerPauseDurationMinutes: duration }),
      }, pauseSettingsError, "فشل حفظ إعدادات الإيقاف");

      if (response.success) {
        pauseSettingsError.textContent = "تم حفظ إعدادات الإيقاف بنجاح.";
        pauseSettingsError.style.display = "block";
        pauseSettingsError.style.color = "green";
      }
    } catch (err) {
      console.error('خطأ في حفظ إعدادات الإيقاف:', err);
      pauseSettingsError.textContent = err.message || "حدث خطأ أثناء الحفظ";
      pauseSettingsError.style.display = "block";
      pauseSettingsError.style.color = "red";
    }
  }

  async function saveCommentSettings(botId) {
    commentSettingsMessage.style.display = 'none';
    commentSettingsMessage.className = 'message'; // reset class

    const mode = commentReplyModeSelect.value;
    const defaultReply = commentDefaultReplyInput.value.trim(); // Allow empty
    const privateMsg = privateReplyMessageInput.value.trim();

    // Gather keywords
    const keywordRows = keywordsContainer.querySelectorAll('.keyword-row');
    const commentKeywords = [];

    keywordRows.forEach(row => {
      const keywordsInput = row.querySelector('.keywords-input').value;
      const replyInput = row.querySelector('.reply-input').value;
      const matchTypeSelect = row.querySelector('.match-type-select').value;

      if (keywordsInput.trim() && replyInput.trim()) {
        commentKeywords.push({
          keywords: keywordsInput.split(',').map(k => k.trim()).filter(k => k),
          reply: replyInput.trim(),
          matchType: matchTypeSelect
        });
      }
    });

    const body = {
      commentReplyMode: mode,
      commentKeywords: commentKeywords,
      commentDefaultReply: defaultReply,
      privateReplyMessage: privateMsg
    };

    try {
      const response = await handleApiRequest(`/api/bots/${botId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }, null, "فشل حفظ إعدادات التعليقات");

      if (response.success) {
        commentSettingsMessage.textContent = "تم حفظ إعدادات التعليقات بنجاح ✅";
        commentSettingsMessage.className = 'message success-message';
        commentSettingsMessage.style.color = 'green';
        commentSettingsMessage.style.display = 'block';
        setTimeout(() => { commentSettingsMessage.style.display = 'none'; }, 3000);
      }
    } catch (err) {
      console.error('Save comment settings error:', err);
      commentSettingsMessage.textContent = "حدث خطأ أثناء الحفظ: " + err.message;
      commentSettingsMessage.className = 'message error-message';
      commentSettingsMessage.style.color = 'red';
      commentSettingsMessage.style.display = 'block';
    }
  }

  function renderKeywords(keywordsData) {
    keywordsContainer.innerHTML = '';
    if (!keywordsData || keywordsData.length === 0) {
      // Add one empty row if none exist
      addKeywordRow();
    } else {
      keywordsData.forEach(k => addKeywordRow(k));
    }
  }

  function addKeywordRow(data = null) {
    const row = document.createElement('div');
    row.className = 'keyword-row card';
    row.style.marginBottom = '10px';
    row.style.padding = '10px';
    row.style.border = '1px solid #ddd';

    const keywordsVal = data ? data.keywords.join(', ') : '';
    const replyVal = data ? data.reply : '';
    const matchType = data ? data.matchType : 'partial';

    row.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 5px;">
        <div style="flex: 2;">
          <label style="font-size: 0.8em; font-weight: bold;">الكلمات المفتاحية (افصل بينها بفاصلة)</label>
          <input type="text" class="form-control keywords-input" value="${keywordsVal}" placeholder="مثال: سعر, تكلفة, بكم">
        </div>
        <div style="flex: 1;">
          <label style="font-size: 0.8em; font-weight: bold;">نوع التطابق</label>
          <select class="form-control match-type-select">
            <option value="partial" ${matchType === 'partial' ? 'selected' : ''}>جزئي (يحتوي على)</option>
            <option value="exact" ${matchType === 'exact' ? 'selected' : ''}>تام (مطابق تماماً)</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size: 0.8em; font-weight: bold;">الرد</label>
        <textarea class="form-control reply-input" rows="2" placeholder="الرد الذي سيتم إرساله...">${replyVal}</textarea>
      </div>
      <div style="text-align: left; margin-top: 5px;">
        <button type="button" class="btn btn-sm btn-danger remove-keyword-btn"><i class="fas fa-trash"></i> حذف</button>
      </div>
    `;

    row.querySelector('.remove-keyword-btn').addEventListener('click', () => {
      row.remove();
    });

    keywordsContainer.appendChild(row);
  }

  function updateCommentUIState() {
    const isEnabled = commentsRepliesToggle.checked;
    commentsConfiguration.style.display = isEnabled ? 'block' : 'none';

    const mode = commentReplyModeSelect.value;
    keywordModeSettings.style.display = mode === 'keyword' ? 'block' : 'none';
    privateModeSettings.style.display = mode === 'private' ? 'block' : 'none';
  }
  // Initialize Facebook SDK
  window.fbAsyncInit = function () {
    FB.init({
      appId: '499020366015281',
      cookie: true,
      xfbml: true,
      version: 'v20.0'
    });
    console.log('✅ Facebook SDK Initialized');
  };

  // Load Facebook SDK
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) { return; }
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  function loginWithFacebook() {
    console.log('📡 جاري التحقق من حالة تسجيل الدخول في فيسبوك...');
    FB.getLoginStatus(function (response) {
      console.log('📋 حالة تسجيل الدخول:', response);
      if (response.status === 'connected') {
        console.log('✅ المستخدم مسجّل دخوله، جاري جلب الصفحات...');
        getUserPages(response.authResponse.accessToken);
      } else {
        console.log('🔐 المستخدم غير مسجّل دخوله، جاري طلب تسجيل الدخول...');
        performFacebookLogin();
      }
    });
  }

  function performFacebookLogin(forceReauth = false) {
    const loginOptions = {
      scope: 'pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts',
      auth_type: forceReauth ? 'reauthenticate' : 'rerequest' // reauthenticate تطلب اختيار/تأكيد الحساب
    };

    if (forceReauth) {
      loginOptions.auth_nonce = Date.now().toString(); // يجبر فيسبوك على فتح حوار جديد
    }

    FB.login(function (response) {
      if (response.authResponse) {
        console.log('✅ تم تسجيل الدخول بنجاح:', response.authResponse);
        getUserPages(response.authResponse.accessToken);
      } else {
        console.error('❌ تم إلغاء تسجيل الدخول أو حدث خطأ:', response);
        errorMessage.textContent = 'تم إلغاء تسجيل الدخول أو حدث خطأ، جرب تاني.';
        errorMessage.style.display = 'block';
      }
    }, loginOptions);
  }

  function resetFacebookSession() {
    errorMessage.style.display = 'none';

    if (typeof FB === 'undefined') {
      errorMessage.textContent = 'مطلوب تحميل SDK الخاص بفيسبوك أولاً، جرّب إعادة تحميل الصفحة.';
      errorMessage.style.display = 'block';
      return;
    }

    const proceed = confirm('سيتم تسجيل خروج فيسبوك لهذا التطبيق لتقدر تختار حساب/صفحة مختلفة. متابعة؟');
    if (!proceed) return;

    console.log('🔄 جاري تسجيل الخروج من جلسة فيسبوك للتطبيق...');
    FB.getLoginStatus(function (statusResponse) {
      if (statusResponse.status === 'connected') {
        FB.logout(function (logoutResponse) {
          console.log('✅ تم تسجيل الخروج من جلسة التطبيق:', logoutResponse);
          performFacebookLogin(true);
        });
      } else {
        console.log('ℹ️ لا توجد جلسة نشطة للتطبيق، سيتم طلب تسجيل دخول جديد.');
        performFacebookLogin(true);
      }
    });
  }

  function getUserPages(accessToken) {
    console.log('📑 جاري جلب الصفحات باستخدام التوكن:', accessToken.slice(0, 10) + '...');
    FB.api('/me/accounts', { access_token: accessToken }, function (response) {
      if (response && !response.error) {
        console.log('✅ الصفحات:', response.data);
        if (response.data.length === 0) {
          errorMessage.textContent = 'لم يتم العثور على صفحات مرتبطة بحسابك، تأكد إنك مدير صفحة.';
          errorMessage.style.display = 'block';
          return;
        }
        displayPageSelectionModal(response.data);
      } else {
        console.error('❌ خطأ في جلب الصفحات:', response.error);
        errorMessage.textContent = 'خطأ في جلب الصفحات: ' + (response.error.message || 'غير معروف');
        errorMessage.style.display = 'block';
      }
    });
  }

  function displayPageSelectionModal(pages) {
    if (pages.length === 0) {
      errorMessage.textContent = 'لم يتم العثور على صفحات مرتبطة بحسابك، تأكد إنك مدير صفحة.';
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

        console.log('📋 بيانات الصفحة المختارة:', { page_id: selectedPageId, access_token: accessToken.slice(0, 10) + '...' });
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

    console.log('📡 جاري حفظ بيانات الربط:', { facebookPageId, facebookApiKey: facebookApiKey.slice(0, 10) + '...' });

    try {
      // حفظ مفتاح API ومعرف الصفحة
      const saveResponse = await handleApiRequest(`/api/bots/${botId}/link-social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ facebookApiKey, facebookPageId }),
      }, errorMessage, "فشل حفظ معلومات الربط");

      // الاشتراك في Webhook Events
      const subscribedFields = [
        'messages',
        'message_echoes',
        'message_deliveries',
        'message_reads',
        'messaging_postbacks',
        'messaging_optins',
        'messaging_optouts',
        'messaging_referrals',
        'message_edits',
        'message_reactions',
        'inbox_labels',
        'messaging_customer_information',
        'response_feedback',
        'messaging_integrity',
        'feed'
      ].join(',');

      console.log('📡 جاري الاشتراك في Webhook Events:', subscribedFields);
      const subscriptionResponse = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}/subscribed_apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `subscribed_fields=${encodeURIComponent(subscribedFields)}&access_token=${encodeURIComponent(facebookApiKey)}`
      });

      const subscriptionData = await subscriptionResponse.json();
      if (!subscriptionData.success) {
        console.error('❌ فشل في الاشتراك في Webhook Events:', subscriptionData);
        throw new Error('فشل في الاشتراك في أحداث Webhook: ' + (subscriptionData.error?.message || 'غير معروف'));
      }

      console.log('✅ تم الاشتراك في Webhook Events بنجاح:', subscriptionData);
      console.log('✅ تم ربط الصفحة بنجاح:', saveResponse);
      errorMessage.textContent = "تم ربط الصفحة والاشتراك في الأحداث بنجاح!";
      errorMessage.style.color = "green";
      errorMessage.style.display = "block";
      await loadPageStatus(botId);
    } catch (err) {
      console.error('❌ خطأ في حفظ الربط أو الاشتراك في الأحداث:', err);
      errorMessage.textContent = err.message || "خطأ في ربط الصفحة أو الاشتراك في الأحداث، جرب تاني.";
      errorMessage.style.display = "block";
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

  if (resetFacebookBtn) {
    resetFacebookBtn.addEventListener("click", resetFacebookSession);
  } else {
    console.error("❌ resetFacebookBtn is not found in the DOM");
  }

  if (savePauseSettingsBtn) {
    savePauseSettingsBtn.addEventListener("click", () => savePauseSettings(selectedBotId));
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

  if (savePauseSettingsBtn) {
    savePauseSettingsBtn.addEventListener("click", () => savePauseSettings(selectedBotId));
  }

  if (saveCommentSettingsBtn) {
    saveCommentSettingsBtn.addEventListener("click", () => saveCommentSettings(selectedBotId));
  }

  if (addKeywordRowBtn) {
    addKeywordRowBtn.addEventListener("click", () => addKeywordRow());
  }

  if (commentReplyModeSelect) {
    commentReplyModeSelect.addEventListener("change", updateCommentUIState);
  }

  if (commentsRepliesToggle) {
    commentsRepliesToggle.addEventListener("change", (e) => {
      updateCommentUIState();
    });
  }

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
