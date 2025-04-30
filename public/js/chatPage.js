// public/js/chatPage.js (Updated for new dashboard design)

async function loadChatPage() {
  const content = document.getElementById("content");
  if (!content) {
    console.error("خطأ: عنصر content غير موجود في الـ DOM");
    return;
  }

  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

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

      <div class="settings-section appearance-section">
        <h3><i class="fas fa-palette"></i> تخصيص المظهر</h3>
        <div class="appearance-grid">
          <!-- Color Scheme Selector -->
          <div class="form-group">
            <label for="colorSchemeSelect">اختيار نظام ألوان جاهز:</label>
            <select id="colorSchemeSelect">
              <option value="custom">مخصص</option>
              <!-- Options will be populated by JS -->
            </select>
          </div>

          <!-- Individual Color Pickers -->
          <div class="color-pickers-grid">
            <div class="color-picker-wrapper">
              <label for="titleColorInput">لون العنوان</label>
              <input type="color" id="titleColorInput" data-color-key="titleColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="headerColorInput">لون الهيدر</label>
              <input type="color" id="headerColorInput" data-color-key="headerColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="chatAreaBgInput">خلفية الدردشة</label>
              <input type="color" id="chatAreaBgInput" data-color-key="chatAreaBackgroundColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="textColorInput">لون النص العام</label>
              <input type="color" id="textColorInput" data-color-key="textColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="userMsgBgInput">خلفية رسالة المستخدم</label>
              <input type="color" id="userMsgBgInput" data-color-key="userMessageBackgroundColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="userMsgTextInput">لون نص المستخدم</label>
              <input type="color" id="userMsgTextInput" data-color-key="userMessageTextColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="botMsgBgInput">خلفية رسالة البوت</label>
              <input type="color" id="botMsgBgInput" data-color-key="botMessageBackgroundColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="botMsgTextInput">لون نص البوت</label>
              <input type="color" id="botMsgTextInput" data-color-key="botMessageTextColor">
            </div>
            <div class="color-picker-wrapper">
              <label for="buttonColorInput">لون الأزرار (الأسئلة المقترحة)</label>
              <input type="color" id="buttonColorInput" data-color-key="buttonColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="inputAreaBgInput">خلفية منطقة الإدخال</label>
              <input type="color" id="inputAreaBgInput" data-color-key="inputAreaBackgroundColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="inputTextColorInput">لون نص الإدخال</label>
              <input type="color" id="inputTextColorInput" data-color-key="inputTextColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="sendButtonColorInput">لون زر الإرسال</label>
              <input type="color" id="sendButtonColorInput" data-color-key="sendButtonColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="containerBgInput">خلفية الحاوية</label>
              <input type="color" id="containerBgInput" data-color-key="containerBackgroundColor">
            </div>
             <div class="color-picker-wrapper">
              <label for="outerBgInput">الخلفية الخارجية</label>
              <input type="color" id="outerBgInput" data-color-key="outerBackgroundColor">
            </div>
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
                <input type="text" id="logoUrlInput" placeholder="اتركه فارغًا لعدم عرض الشعار">
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
         </div>
      </div>

      <div class="settings-section preview-section">
        <h3><i class="fas fa-eye"></i> معاينة مباشرة</h3>
        <div class="chat-preview-wrapper">
          <div id="previewChatContainer" class="chat-container">
            <div id="previewHeader" class="chat-header">
              <img id="previewLogo" class="chat-logo" alt="Logo">
              <h1 id="previewTitle" class="chat-title"></h1>
            </div>
            <div id="previewMessages" class="chat-messages">
              <div class="message bot-message">
                <p>مرحباً! كيف يمكنني مساعدتك اليوم؟</p>
              </div>
              <div class="message user-message">
                <p>أريد معرفة المزيد عن خدماتكم.</p>
              </div>
               <div class="message bot-message">
                <p>بالتأكيد! نقدم حلول بوتات ذكية لخدمة العملاء...</p>
              </div>
            </div>
            <div id="previewSuggestedQuestions" class="suggested-questions">
              <!-- Suggested questions preview -->
            </div>
            <div id="previewInputArea" class="chat-input-area">
              <input type="text" placeholder="اكتب رسالتك هنا...">
              <button id="previewSendBtn"><i class="fas fa-paper-plane"></i></button>
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

  // Appearance elements
  const colorSchemeSelect = document.getElementById("colorSchemeSelect");
  const colorPickers = document.querySelectorAll(".color-picker-wrapper input[type=\"color\"]");

  // Content elements
  const headerHiddenToggle = document.getElementById("headerHiddenToggle");
  const titleInput = document.getElementById("titleInput");
  const logoUrlInput = document.getElementById("logoUrlInput");
  const suggestedQuestionsToggle = document.getElementById("suggestedQuestionsToggle");
  const suggestedQuestionsListContainer = document.getElementById("suggestedQuestionsListContainer");
  const suggestedQuestionsInput = document.getElementById("suggestedQuestionsInput");

  // Preview elements
  const previewContainer = document.getElementById("previewChatContainer");
  const previewHeader = document.getElementById("previewHeader");
  const previewLogo = document.getElementById("previewLogo");
  const previewTitle = document.getElementById("previewTitle");
  const previewMessages = document.getElementById("previewMessages");
  const previewSuggestedQuestions = document.getElementById("previewSuggestedQuestions");
  const previewInputArea = document.getElementById("previewInputArea");
  const previewSendBtn = document.getElementById("previewSendBtn");

  let currentSettings = {}; // To store loaded settings

  // --- Color Schemes Definition ---
  const colorSchemes = [
      { name: "ذهبي عصري", colors: { titleColor: "#D4AF37", headerColor: "#FDF5E6", chatAreaBackgroundColor: "#FFF8DC", textColor: "#4A3C31", userMessageBackgroundColor: "#DAA520", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#F5F5DC", botMessageTextColor: "#4A3C31", buttonColor: "#DAA520", inputAreaBackgroundColor: "#FDF5E6", inputTextColor: "#4A3C31", sendButtonColor: "#DAA520", containerBackgroundColor: "#FFF8DC", outerBackgroundColor: "#FDF5E6" } },
      { name: "أزرق فاتح", colors: { titleColor: "#222222", headerColor: "#E6F3FA", chatAreaBackgroundColor: "#F0F8FF", textColor: "#222222", userMessageBackgroundColor: "#00B7EB", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#D9EDF7", botMessageTextColor: "#222222", buttonColor: "#00B7EB", inputAreaBackgroundColor: "#E6F3FA", inputTextColor: "#222222", sendButtonColor: "#00B7EB", containerBackgroundColor: "#E6F3FA", outerBackgroundColor: "#E6F3FA" } },
      { name: "برتقالي دافئ", colors: { titleColor: "#111111", headerColor: "#FFF5E6", chatAreaBackgroundColor: "#FFFAF0", textColor: "#111111", userMessageBackgroundColor: "#FF9900", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#FFEBCC", botMessageTextColor: "#111111", buttonColor: "#FF9900", inputAreaBackgroundColor: "#FFF5E6", inputTextColor: "#111111", sendButtonColor: "#FF9900", containerBackgroundColor: "#FFFAF0", outerBackgroundColor: "#FFF5E6" } },
      { name: "تركواز غامق", colors: { titleColor: "#FFFFFF", headerColor: "#2C3E50", chatAreaBackgroundColor: "#34495E", textColor: "#FFFFFF", userMessageBackgroundColor: "#1ABC9C", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#2C3E50", botMessageTextColor: "#FFFFFF", buttonColor: "#1ABC9C", inputAreaBackgroundColor: "#34495E", inputTextColor: "#FFFFFF", sendButtonColor: "#1ABC9C", containerBackgroundColor: "#34495E", outerBackgroundColor: "#34495E" } },
      { name: "أحمر غامق", colors: { titleColor: "#FFFFFF", headerColor: "#1A1A1A", chatAreaBackgroundColor: "#262626", textColor: "#FFFFFF", userMessageBackgroundColor: "#E74C3C", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#1A1A1A", botMessageTextColor: "#FFFFFF", buttonColor: "#E74C3C", inputAreaBackgroundColor: "#262626", inputTextColor: "#FFFFFF", sendButtonColor: "#E74C3C", containerBackgroundColor: "#262626", outerBackgroundColor: "#262626" } },
      { name: "أخضر غامق", colors: { titleColor: "#FFFFFF", headerColor: "#2D3436", chatAreaBackgroundColor: "#3B4A4E", textColor: "#FFFFFF", userMessageBackgroundColor: "#6AB04C", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#2D3436", botMessageTextColor: "#FFFFFF", buttonColor: "#6AB04C", inputAreaBackgroundColor: "#3B4A4E", inputTextColor: "#FFFFFF", sendButtonColor: "#6AB04C", containerBackgroundColor: "#3B4A4E", outerBackgroundColor: "#3B4A4E" } },
      { name: "فضي أنيق", colors: { titleColor: "#333333", headerColor: "#D3D3D3", chatAreaBackgroundColor: "#E8ECEF", textColor: "#333333", userMessageBackgroundColor: "#B0C4DE", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#C0C0C0", botMessageTextColor: "#333333", buttonColor: "#B0C4DE", inputAreaBackgroundColor: "#E8ECEF", inputTextColor: "#333333", sendButtonColor: "#B0C4DE", containerBackgroundColor: "#E8ECEF", outerBackgroundColor: "#E8ECEF" } },
      { name: "بنفسجي ملكي", colors: { titleColor: "#FFFFFF", headerColor: "#4B0082", chatAreaBackgroundColor: "#6A5ACD", textColor: "#FFFFFF", userMessageBackgroundColor: "#8A2BE2", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#4B0082", botMessageTextColor: "#FFFFFF", buttonColor: "#8A2BE2", inputAreaBackgroundColor: "#6A5ACD", inputTextColor: "#FFFFFF", sendButtonColor: "#8A2BE2", containerBackgroundColor: "#6A5ACD", outerBackgroundColor: "#6A5ACD" } },
      { name: "وردي ناعم", colors: { titleColor: "#4A2F39", headerColor: "#FFE4E1", chatAreaBackgroundColor: "#FFF0F5", textColor: "#4A2F39", userMessageBackgroundColor: "#FF69B4", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#FFD1DC", botMessageTextColor: "#4A2F39", buttonColor: "#FF69B4", inputAreaBackgroundColor: "#FFE4E1", inputTextColor: "#4A2F39", sendButtonColor: "#FF69B4", containerBackgroundColor: "#FFF0F5", outerBackgroundColor: "#FFE4E1" } },
      { name: "أخضر زمردي", colors: { titleColor: "#FFFFFF", headerColor: "#2E8B57", chatAreaBackgroundColor: "#3CB371", textColor: "#FFFFFF", userMessageBackgroundColor: "#228B22", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#2E8B57", botMessageTextColor: "#FFFFFF", buttonColor: "#228B22", inputAreaBackgroundColor: "#3CB371", inputTextColor: "#FFFFFF", sendButtonColor: "#228B22", containerBackgroundColor: "#3CB371", outerBackgroundColor: "#3CB371" } },
      { name: "أسود لامع", colors: { titleColor: "#FFD700", headerColor: "#1C2526", chatAreaBackgroundColor: "#2A2F32", textColor: "#FFD700", userMessageBackgroundColor: "#FFD700", userMessageTextColor: "#1C2526", botMessageBackgroundColor: "#1C2526", botMessageTextColor: "#FFD700", buttonColor: "#FFD700", inputAreaBackgroundColor: "#2A2F32", inputTextColor: "#FFD700", sendButtonColor: "#FFD700", containerBackgroundColor: "#2A2F32", outerBackgroundColor: "#2A2F32" } },
      { name: "بيج كلاسيكي", colors: { titleColor: "#5C4033", headerColor: "#F5F5DC", chatAreaBackgroundColor: "#FAEBD7", textColor: "#5C4033", userMessageBackgroundColor: "#DEB887", userMessageTextColor: "#FFFFFF", botMessageBackgroundColor: "#F5F5DC", botMessageTextColor: "#5C4033", buttonColor: "#DEB887", inputAreaBackgroundColor: "#FAEBD7", inputTextColor: "#5C4033", sendButtonColor: "#DEB887", containerBackgroundColor: "#FAEBD7", outerBackgroundColor: "#F5F5DC" } },
  ];

  // Populate color scheme dropdown
  colorSchemes.forEach((scheme, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = scheme.name;
    colorSchemeSelect.appendChild(option);
  });

  // --- Functions ---

  function updatePreview() {
    const settings = collectSettingsFromUI();

    // Apply colors
    previewContainer.style.backgroundColor = settings.colors.containerBackgroundColor;
    // Apply outer background color to the wrapper or body if needed
    // document.body.style.backgroundColor = settings.colors.outerBackgroundColor; // Example

    previewHeader.style.backgroundColor = settings.colors.headerColor;
    previewTitle.style.color = settings.colors.titleColor;
    previewMessages.style.backgroundColor = settings.colors.chatAreaBackgroundColor;
    previewMessages.style.color = settings.colors.textColor; // General text color

    previewMessages.querySelectorAll(".user-message").forEach(el => {
        el.style.backgroundColor = settings.colors.userMessageBackgroundColor;
        el.querySelector("p").style.color = settings.colors.userMessageTextColor;
    });
    previewMessages.querySelectorAll(".bot-message").forEach(el => {
        el.style.backgroundColor = settings.colors.botMessageBackgroundColor;
        el.querySelector("p").style.color = settings.colors.botMessageTextColor;
    });

    previewInputArea.style.backgroundColor = settings.colors.inputAreaBackgroundColor;
    previewInputArea.querySelector("input").style.color = settings.colors.inputTextColor;
    previewSendBtn.style.backgroundColor = settings.colors.sendButtonColor;
    // Assuming send button icon color needs contrast
    previewSendBtn.querySelector("i").style.color = isLight(settings.colors.sendButtonColor) ? "#000" : "#FFF";

    // Apply content settings
    previewHeader.style.display = settings.headerHidden ? "none" : "flex";
    previewTitle.textContent = settings.title;
    previewLogo.src = settings.logoUrl;
    previewLogo.style.display = settings.logoUrl ? "block" : "none";

    previewSuggestedQuestions.style.display = settings.suggestedQuestionsEnabled ? "flex" : "none";
    previewSuggestedQuestions.innerHTML = "";
    if (settings.suggestedQuestionsEnabled) {
        settings.suggestedQuestions.forEach(q => {
            const btn = document.createElement("button");
            btn.className = "suggested-question-btn";
            btn.textContent = q;
            btn.style.backgroundColor = settings.colors.buttonColor;
            // Assuming button text color needs contrast
            btn.style.color = isLight(settings.colors.buttonColor) ? "#000" : "#FFF";
            previewSuggestedQuestions.appendChild(btn);
        });
    }
  }

  function applyColorScheme(schemeIndex) {
    if (schemeIndex === "custom") return;
    const scheme = colorSchemes[parseInt(schemeIndex)];
    if (!scheme) return;

    Object.keys(scheme.colors).forEach(key => {
        const input = document.querySelector(`input[data-color-key="${key}"]`);
        if (input) {
            input.value = scheme.colors[key];
        }
    });
    updatePreview();
  }

  function loadSettingsIntoUI(settings) {
    currentSettings = settings; // Store globally

    // Links and Codes
    chatLinkInput.value = settings.link || "";
    viewChatLink.href = settings.link || "#";
    floatingButtonCodeInput.value = generateFloatingButtonCode(settings.link);
    fullIframeCodeInput.value = generateFullIframeCode(settings.link);

    // Appearance - Colors
    Object.keys(settings.colors || {}).forEach(key => {
      const input = document.querySelector(`input[data-color-key="${key}"]`);
      if (input) {
        input.value = settings.colors[key];
      }
    });
    // Check if current colors match a predefined scheme
    const matchedSchemeIndex = colorSchemes.findIndex(scheme => 
        JSON.stringify(scheme.colors) === JSON.stringify(settings.colors)
    );
    colorSchemeSelect.value = matchedSchemeIndex !== -1 ? matchedSchemeIndex : "custom";


    // Content
    headerHiddenToggle.checked = settings.headerHidden || false;
    titleInput.value = settings.title || "";
    logoUrlInput.value = settings.logoUrl || "";
    suggestedQuestionsToggle.checked = settings.suggestedQuestionsEnabled || false;
    suggestedQuestionsInput.value = (settings.suggestedQuestions || []).join(", ");
    suggestedQuestionsListContainer.style.display = suggestedQuestionsToggle.checked ? "block" : "none";

    updatePreview(); // Update preview after loading
  }

  function collectSettingsFromUI() {
    const colors = {};
    colorPickers.forEach(picker => {
      colors[picker.dataset.colorKey] = picker.value;
    });

    const suggestedQuestions = suggestedQuestionsInput.value
        .split(",")
        .map(q => q.trim())
        .filter(q => q !== "");

    return {
      link: chatLinkInput.value,
      colors: colors,
      headerHidden: headerHiddenToggle.checked,
      title: titleInput.value.trim(),
      logoUrl: logoUrlInput.value.trim(),
      suggestedQuestionsEnabled: suggestedQuestionsToggle.checked,
      suggestedQuestions: suggestedQuestions,
    };
  }

  async function saveSettings() {
    const settingsToSave = collectSettingsFromUI();
    // Remove link from settings to save, it's saved separately
    const { link, ...settingsData } = settingsToSave;

    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";

    try {
      const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل حفظ الإعدادات");
      }

      const savedSettings = await response.json();
      loadSettingsIntoUI(savedSettings); // Reload UI with saved data (including potentially generated link)
      alert("تم حفظ الإعدادات بنجاح!");

    } catch (err) {
      console.error("خطأ في حفظ الإعدادات:", err);
      errorMessage.textContent = err.message || "حدث خطأ أثناء حفظ الإعدادات.";
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  async function updateChatLink(newId) {
      loadingSpinner.style.display = "flex";
      errorMessage.style.display = "none";
      try {
          const response = await fetch(`/api/chat-page/bot/${selectedBotId}/link`, {
              method: "PUT",
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ linkId: newId }),
          });
          const data = await response.json();
          if (!response.ok) {
              throw new Error(data.message || "فشل تحديث الرابط");
          }
          chatLinkInput.value = data.link;
          viewChatLink.href = data.link;
          floatingButtonCodeInput.value = generateFloatingButtonCode(data.link);
          fullIframeCodeInput.value = generateFullIframeCode(data.link);
          editLinkForm.style.display = "none";
          alert("تم تحديث الرابط بنجاح!");
      } catch (err) {
          console.error("خطأ تحديث الرابط:", err);
          errorMessage.textContent = err.message;
          errorMessage.style.display = "block";
      } finally {
          loadingSpinner.style.display = "none";
      }
  }

  function generateFloatingButtonCode(link) {
      if (!link) return "";
      return `
<div id="zainAiChatButton" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000; cursor: pointer;">
  <img src="https://i.ibb.co/7JJScM0Q/Chat-GPT-Image-20-2025-08-04-13.png" alt="Chat" style="width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
</div>
<div id="zainAiChatIframe" style="display: none; position: fixed; bottom: 90px; right: 20px; width: 350px; height: 550px; border: none; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 999; overflow: hidden;">
  <iframe src="${link}" style="width: 100%; height: 100%; border: none;"></iframe>
</div>
<script>
  const zainButton = document.getElementById('zainAiChatButton');
  const zainIframe = document.getElementById('zainAiChatIframe');
  zainButton.addEventListener('click', () => {
    zainIframe.style.display = zainIframe.style.display === 'none' ? 'block' : 'none';
  });
</script>
      `.trim();
  }

  function generateFullIframeCode(link) {
      if (!link) return "";
      return `<iframe src="${link}" style="width: 100%; height: 600px; border: none;"></iframe>`.trim();
  }

  function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
          alert("تم النسخ إلى الحافظة!");
      }).catch(err => {
          console.error("فشل النسخ:", err);
          alert("فشل النسخ إلى الحافظة.");
      });
  }

  // Helper to determine text color based on background
  function isLight(color) {
      const hex = color.replace("#", "");
      const c_r = parseInt(hex.substr(0, 2), 16);
      const c_g = parseInt(hex.substr(2, 2), 16);
      const c_b = parseInt(hex.substr(4, 2), 16);
      const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
      return brightness > 155; // Adjust threshold if needed
  }

  // --- Event Listeners ---
  saveChatSettingsBtn.addEventListener("click", saveSettings);

  colorSchemeSelect.addEventListener("change", (e) => {
    applyColorScheme(e.target.value);
  });

  colorPickers.forEach(picker => {
    picker.addEventListener("input", updatePreview);
    picker.addEventListener("change", () => { // Mark as custom when a color is changed
        colorSchemeSelect.value = "custom";
    });
  });

  // Content settings listeners
  headerHiddenToggle.addEventListener("change", updatePreview);
  titleInput.addEventListener("input", updatePreview);
  logoUrlInput.addEventListener("input", updatePreview);
  suggestedQuestionsToggle.addEventListener("change", () => {
      suggestedQuestionsListContainer.style.display = suggestedQuestionsToggle.checked ? "block" : "none";
      updatePreview();
  });
  suggestedQuestionsInput.addEventListener("input", updatePreview);

  // Link editing listeners
  editLinkBtn.addEventListener("click", () => {
      editLinkForm.style.display = "flex";
      const currentLink = chatLinkInput.value;
      const linkParts = currentLink.split("/");
      newLinkIdInput.value = linkParts[linkParts.length - 1] || "";
  });
  cancelLinkBtn.addEventListener("click", () => {
      editLinkForm.style.display = "none";
  });
  saveLinkBtn.addEventListener("click", () => {
      const newId = newLinkIdInput.value.trim();
      // Basic validation (server does more)
      if (newId.length < 4 || !/^[a-zA-Z0-9]+$/.test(newId)) {
          alert("الرابط يجب أن يتكون من 4 أحرف أو أرقام على الأقل وبدون رموز خاصة.");
          return;
      }
      updateChatLink(newId);
  });

  // Copy buttons
  copyLinkBtn.addEventListener("click", () => copyToClipboard(chatLinkInput.value));
  copyFloatingButtonCodeBtn.addEventListener("click", () => copyToClipboard(floatingButtonCodeInput.value));
  copyFullIframeCodeBtn.addEventListener("click", () => copyToClipboard(fullIframeCodeInput.value));


  // --- Initial Load --- 
  async function initializePage() {
    try {
      loadingSpinner.style.display = "flex";
      errorMessage.style.display = "none";
      const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
          if (response.status === 401) {
              alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
              logoutUser();
              return;
          }
          // Handle case where settings don't exist yet (e.g., 404)
          if (response.status === 404) {
              console.warn("No settings found for this bot, using defaults.");
              // Load default settings into UI (or create them on save)
              const defaultSettings = {
                  link: ``, // Link will be generated on first save
                  colors: colorSchemes[3].colors, // Default to Turquoise Dark
                  headerHidden: false,
                  title: "مساعدك الذكي",
                  logoUrl: "",
                  suggestedQuestionsEnabled: true,
                  suggestedQuestions: ["ما هي الخدمات؟", "كيف أتواصل معكم؟"]
              };
              loadSettingsIntoUI(defaultSettings);
          } else {
             throw new Error(`فشل في جلب الإعدادات: ${response.statusText}`);
          }
      } else {
          const data = await response.json();
          loadSettingsIntoUI(data);
      }
      settingsContainer.style.display = "block"; // Show content after loading
    } catch (err) {
      console.error("خطأ في تحميل إعدادات صفحة الدردشة:", err);
      errorMessage.textContent = err.message || "حدث خطأ أثناء تحميل الإعدادات.";
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  initializePage();
}

// Make loadChatPage globally accessible
window.loadChatPage = loadChatPage;

