// public/js/chatPage.js (Updated with ImgBB Upload Logic)

async function loadChatPage() {
  const content = document.getElementById("content");
  if (!content) {
    console.error("خطأ: عنصر content غير موجود في الـ DOM");
    return;
  }

  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");
  const IMGBB_API_KEY = "ac32d0e1b070fc85754b6a58f9708a2f"; // API Key provided by user

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لتخصيص صفحة الدردشة.</p>
      </div>
    `;
    return;
  }

  // Main structure for the chat page customization
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-comment-dots"></i> تخصيص صفحة الدردشة</h2>
      <div class="header-actions">
        <button id="saveChatSettingsBtn" class="btn btn-primary"><i class="fas fa-save"></i> حفظ التغييرات</button>
      </div>
    </div>

    <div id="loadingSpinner" class="spinner"><div class="loader"></div></div>
    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div id="chatPageSettingsContainer" class="chat-page-settings-container" style="display: none;">

      <div class="settings-section link-section">
        <h3><i class="fas fa-link"></i> رابط و أكواد التضمين</h3>
        <div class="form-group">
          <label for="chatLink">رابط صفحة الدردشة:</label>
          <div class="input-group">
            <input type="text" id="chatLink" readonly>
            <button id="editLinkBtn" class="btn btn-secondary btn-sm" title="تعديل الرابط"><i class="fas fa-edit"></i></button>
            <button id="copyLinkBtn" class="btn btn-secondary btn-sm" title="نسخ الرابط"><i class="fas fa-copy"></i></button>
            <a id="viewChatLink" href="#" target="_blank" class="btn btn-secondary btn-sm" title="فتح الرابط"><i class="fas fa-external-link-alt"></i></a>
          </div>
          <div id="editLinkForm" class="inline-form" style="display: none;">
            <input type="text" id="newLinkId" placeholder="الرابط الجديد (4+ حروف/أرقام)">
            <button id="saveLinkBtn" class="btn btn-success btn-sm">حفظ</button>
            <button id="cancelLinkBtn" class="btn btn-danger btn-sm">إلغاء</button>
          </div>
        </div>
        <div class="form-group">
          <label for="floatingButtonCode">كود زر الدعم العائم:</label>
          <div class="input-group code-group">
            <textarea id="floatingButtonCode" readonly class="code-display"></textarea>
            <button id="copyFloatingButtonCodeBtn" class="btn btn-secondary btn-sm" title="نسخ الكود"><i class="fas fa-copy"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label for="fullIframeCode">كود تضمين الإطار الكامل (Iframe):</label>
          <div class="input-group code-group">
            <textarea id="fullIframeCode" readonly class="code-display"></textarea>
            <button id="copyFullIframeCodeBtn" class="btn btn-secondary btn-sm" title="نسخ الكود"><i class="fas fa-copy"></i></button>
          </div>
        </div>
      </div>

      <div class="settings-section content-section">
         <h3><i class="fas fa-cogs"></i> إعدادات المحتوى</h3>
         <div class="content-settings-grid">
            <div class="form-group toggle-group">
                <label for="headerHiddenToggle">إخفاء الهيدر (العنوان والشعار)</label>
                <label class="switch">
                    <input type="checkbox" id="headerHiddenToggle">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="form-group">
                <label for="titleInput">عنوان الدردشة</label>
                <input type="text" id="titleInput">
            </div>
            <div class="form-group">
                <label for="logoUrlInput">رابط الشعار (URL)</label>
                <div class="input-group">
                    <input type="text" id="logoUrlInput" placeholder="الصق رابطًا أو ارفع صورة">
                    <input type="file" id="logoUploadInput" accept="image/*" style="display: none;">
                    <button id="uploadLogoBtn" class="btn btn-secondary btn-sm" title="رفع شعار"><i class="fas fa-upload"></i></button>
                </div>
                <div id="logoUploadStatus" class="upload-status"></div>
            </div>
            <div class="form-group toggle-group">
                <label for="suggestedQuestionsToggle">تفعيل الأسئلة المقترحة</label>
                <label class="switch">
                    <input type="checkbox" id="suggestedQuestionsToggle">
                    <span class="slider"></span>
                </label>
            </div>
            <div id="suggestedQuestionsListContainer" class="form-group" style="display: none;">
                <label>الأسئلة المقترحة (افصل بينها بفاصلة ,)</label>
                <textarea id="suggestedQuestionsInput" placeholder="مثال: ما هي أسعاركم؟, كيف يمكنني التواصل معكم؟"></textarea>
            </div>
             <div class="form-group toggle-group">
                <label for="imageUploadToggle">تفعيل رفع الصور (للمستخدمين)</label>
                <label class="switch">
                    <input type="checkbox" id="imageUploadToggle">
                    <span class="slider"></span>
                </label>
            </div>
         </div>
      </div>

      <div class="settings-section preview-section">
        <h3><i class="fas fa-eye"></i> معاينة مباشرة وتخصيص الألوان</h3>
        <div class="chat-preview-wrapper">
          <div id="previewChatContainer" class="chat-container preview-mode">
            <!-- Outer Background Color Picker -->
            <div class="color-picker-popup" id="outerBgColorPickerPopup">
              <label>الخلفية الخارجية</label>
              <input type="color" id="outerBgColorInput" data-color-key="outerBackgroundColor">
            </div>
            <i class="fas fa-cog color-config-icon" data-target="outerBgColorPickerPopup" style="position: absolute; top: 5px; left: 5px;"></i>

            <!-- Container Background Color Picker -->
            <div class="color-picker-popup" id="containerBgColorPickerPopup">
              <label>خلفية الحاوية</label>
              <input type="color" id="containerBgColorInput" data-color-key="containerBackgroundColor">
            </div>
            <i class="fas fa-cog color-config-icon" data-target="containerBgColorPickerPopup" style="position: absolute; top: 5px; right: 5px;"></i>

            <div id="previewHeader" class="chat-header preview-element">
              <img id="previewLogo" class="chat-logo" alt="Logo">
              <h1 id="previewTitle" class="chat-title"></h1>
              <!-- Header Color Picker -->
              <div class="color-picker-popup" id="headerColorPickerPopup">
                <label>لون الهيدر</label>
                <input type="color" id="headerColorInput" data-color-key="headerColor">
                <label>لون العنوان</label>
                <input type="color" id="titleColorInput" data-color-key="titleColor">
              </div>
              <i class="fas fa-cog color-config-icon" data-target="headerColorPickerPopup"></i>
            </div>

            <div id="previewMessages" class="chat-messages preview-element">
              <!-- Chat Area Background Color Picker -->
              <div class="color-picker-popup" id="chatAreaBgColorPickerPopup">
                <label>خلفية الدردشة</label>
                <input type="color" id="chatAreaBgInput" data-color-key="chatAreaBackgroundColor">
              </div>
              <i class="fas fa-cog color-config-icon" data-target="chatAreaBgColorPickerPopup" style="position: absolute; top: 5px; right: 5px;"></i>

              <div class="message bot-message preview-element">
                <p>مرحباً! كيف يمكنني مساعدتك اليوم؟</p>
                <!-- Bot Message Color Picker -->
                <div class="color-picker-popup" id="botMsgColorPickerPopup">
                  <label>خلفية رسالة البوت</label>
                  <input type="color" id="botMsgBgInput" data-color-key="botMessageBackgroundColor">
                  <label>لون نص البوت</label>
                  <input type="color" id="botMsgTextInput" data-color-key="botMessageTextColor">
                </div>
                <i class="fas fa-cog color-config-icon" data-target="botMsgColorPickerPopup"></i>
              </div>
              <div class="message user-message preview-element">
                <p>أريد معرفة المزيد عن خدماتكم.</p>
                 <!-- User Message Color Picker -->
                <div class="color-picker-popup" id="userMsgColorPickerPopup">
                  <label>خلفية رسالة المستخدم</label>
                  <input type="color" id="userMsgBgInput" data-color-key="userMessageBackgroundColor">
                  <label>لون نص المستخدم</label>
                  <input type="color" id="userMsgTextInput" data-color-key="userMessageTextColor">
                </div>
                <i class="fas fa-cog color-config-icon" data-target="userMsgColorPickerPopup"></i>
              </div>
            </div>

            <div id="previewSuggestedQuestions" class="suggested-questions preview-element">
               <button class="suggested-question">سؤال مقترح؟</button>
               <!-- Suggested Question Button Color Picker -->
               <div class="color-picker-popup" id="buttonColorPickerPopup">
                 <label>لون الأزرار (الأسئلة)</label>
                 <input type="color" id="buttonColorInput" data-color-key="buttonColor">
               </div>
               <i class="fas fa-cog color-config-icon" data-target="buttonColorPickerPopup"></i>
            </div>

            <div id="previewInputArea" class="chat-input-area preview-element">
              <input type="text" placeholder="اكتب رسالتك هنا...">
              <label for="previewImageInput" id="previewImageInputBtn" class="image-input-btn">
                 <i class="fas fa-image"></i>
              </label>
              <button id="previewSendBtn"><i class="fas fa-paper-plane"></i></button>
              <!-- Input Area Color Picker -->
              <div class="color-picker-popup" id="inputAreaColorPickerPopup">
                <label>خلفية منطقة الإدخال</label>
                <input type="color" id="inputAreaBgInput" data-color-key="inputAreaBackgroundColor">
                <label>لون نص الإدخال</label>
                <input type="color" id="inputTextColorInput" data-color-key="inputTextColor">
                <label>لون زر الإرسال/الصورة</label>
                <input type="color" id="sendButtonColorInput" data-color-key="sendButtonColor">
              </div>
              <i class="fas fa-cog color-config-icon" data-target="inputAreaColorPickerPopup"></i>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const settingsContainer = document.getElementById("chatPageSettingsContainer");
  const saveChatSettingsBtn = document.getElementById("saveChatSettingsBtn");

  // Link elements
  const chatLinkInput = document.getElementById("chatLink");
  const viewChatLink = document.getElementById("viewChatLink");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const editLinkBtn = document.getElementById("editLinkBtn");
  const editLinkForm = document.getElementById("editLinkForm");
  const newLinkIdInput = document.getElementById("newLinkId");
  const saveLinkBtn = document.getElementById("saveLinkBtn");
  const cancelLinkBtn = document.getElementById("cancelLinkBtn");

  // Code elements
  const floatingButtonCodeInput = document.getElementById("floatingButtonCode");
  const copyFloatingButtonCodeBtn = document.getElementById("copyFloatingButtonCodeBtn");
  const fullIframeCodeInput = document.getElementById("fullIframeCode");
  const copyFullIframeCodeBtn = document.getElementById("copyFullIframeCodeBtn");

  // Content elements
  const headerHiddenToggle = document.getElementById("headerHiddenToggle");
  const titleInput = document.getElementById("titleInput");
  const logoUrlInput = document.getElementById("logoUrlInput");
  const logoUploadInput = document.getElementById("logoUploadInput");
  const uploadLogoBtn = document.getElementById("uploadLogoBtn");
  const logoUploadStatus = document.getElementById("logoUploadStatus");
  const suggestedQuestionsToggle = document.getElementById("suggestedQuestionsToggle");
  const suggestedQuestionsListContainer = document.getElementById("suggestedQuestionsListContainer");
  const suggestedQuestionsInput = document.getElementById("suggestedQuestionsInput");
  const imageUploadToggle = document.getElementById("imageUploadToggle");

  // Preview elements and color inputs
  const previewContainer = document.getElementById("previewChatContainer");
  const previewHeader = document.getElementById("previewHeader");
  const previewLogo = document.getElementById("previewLogo");
  const previewTitle = document.getElementById("previewTitle");
  const previewMessages = document.getElementById("previewMessages");
  const previewSuggestedQuestions = document.getElementById("previewSuggestedQuestions");
  const previewInputArea = document.getElementById("previewInputArea");
  const previewSendBtn = document.getElementById("previewSendBtn");
  const previewImageInputBtn = document.getElementById("previewImageInputBtn");
  const colorConfigIcons = document.querySelectorAll(".color-config-icon");
  const colorPickers = document.querySelectorAll(".color-picker-popup input[type=\"color\"]");

  let currentSettings = {}; // To store loaded settings
  let currentLinkId = 
(Content truncated due to size limit. Use line ranges to read in chunks)
