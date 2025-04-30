// public/js/chatPage.js (Updated for gear icon customization)

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
             <div class="form-group toggle-group">
                <label for="imageUploadToggle">تفعيل رفع الصور</label>
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
  let currentLinkId = "; // Store the current link ID

  // --- Fetch Settings --- 
  async function fetchChatSettings() {
    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";
    settingsContainer.style.display = "none";
    try {
      const response = await fetch(`/api/chat-page/settings/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404) {
          // Bot might not have settings yet, use defaults
          console.log("No settings found for this bot, using defaults.");
          currentSettings = { colors: {}, suggestedQuestions: [], linkId: selectedBotId + Date.now().toString(36) }; // Generate a default linkId
        } else {
          throw new Error(`فشل في جلب الإعدادات: ${response.status}`);
        }
      } else {
        currentSettings = await response.json();
        // Ensure colors object exists
        if (!currentSettings.colors) {
          currentSettings.colors = {};
        }
      }
      currentLinkId = currentSettings.linkId;
      populateForm();
      updatePreview();
      generateCodes();
      settingsContainer.style.display = "block";
    } catch (error) {
      console.error("Error fetching settings:", error);
      errorMessage.textContent = `حدث خطأ أثناء جلب الإعدادات: ${error.message}. حاول تحديث الصفحة.`;
      errorMessage.style.display = "block";
    } finally {
      loadingSpinner.style.display = "none";
    }
  }

  // --- Populate Form --- 
  function populateForm() {
    chatLinkInput.value = `${window.location.origin}/chat/${currentLinkId}`;
    viewChatLink.href = `/chat/${currentLinkId}`;
    headerHiddenToggle.checked = currentSettings.headerHidden || false;
    titleInput.value = currentSettings.title || "";
    logoUrlInput.value = currentSettings.logoUrl || "";
    suggestedQuestionsToggle.checked = currentSettings.suggestedQuestionsEnabled || false;
    suggestedQuestionsInput.value = (currentSettings.suggestedQuestions || []).join(", ");
    imageUploadToggle.checked = currentSettings.imageUploadEnabled || false;

    suggestedQuestionsListContainer.style.display = suggestedQuestionsToggle.checked ? "block" : "none";

    // Set color picker values
    colorPickers.forEach(picker => {
      const key = picker.dataset.colorKey;
      picker.value = currentSettings.colors[key] || getDefaultColor(key);
    });
  }

  // --- Default Colors --- 
  function getDefaultColor(key) {
      const defaults = {
          titleColor: "#FFFFFF", headerColor: "#2D3436", chatAreaBackgroundColor: "#3B4A4E",
          textColor: "#FFFFFF", userMessageBackgroundColor: "#6AB04C", userMessageTextColor: "#FFFFFF",
          botMessageBackgroundColor: "#2D3436", botMessageTextColor: "#FFFFFF", buttonColor: "#6AB04C",
          inputAreaBackgroundColor: "#3B4A4E", inputTextColor: "#FFFFFF", sendButtonColor: "#6AB04C",
          containerBackgroundColor: "#3B4A4E", outerBackgroundColor: "#000000"
      };
      return defaults[key] || "#000000";
  }

  // --- Update Preview --- 
  function updatePreview() {
    const colors = currentSettings.colors;
    previewContainer.style.backgroundColor = colors.containerBackgroundColor || getDefaultColor("containerBackgroundColor");
    // Apply outer background color to the wrapper or body if needed, here we apply to container for simplicity in preview
    previewContainer.parentElement.style.backgroundColor = colors.outerBackgroundColor || getDefaultColor("outerBackgroundColor");

    previewHeader.style.backgroundColor = colors.headerColor || getDefaultColor("headerColor");
    previewTitle.style.color = colors.titleColor || getDefaultColor("titleColor");
    previewTitle.textContent = titleInput.value || "عنوان الدردشة";
    previewHeader.style.display = headerHiddenToggle.checked ? "none" : "flex";

    if (logoUrlInput.value) {
        previewLogo.src = logoUrlInput.value;
        previewLogo.style.display = "inline-block";
    } else {
        previewLogo.style.display = "none";
    }

    previewMessages.style.backgroundColor = colors.chatAreaBackgroundColor || getDefaultColor("chatAreaBackgroundColor");
    previewMessages.querySelectorAll(".message").forEach(msg => {
        msg.style.color = colors.textColor || getDefaultColor("textColor");
    });
    previewMessages.querySelectorAll(".user-message").forEach(msg => {
        msg.style.backgroundColor = colors.userMessageBackgroundColor || getDefaultColor("userMessageBackgroundColor");
        msg.style.color = colors.userMessageTextColor || getDefaultColor("userMessageTextColor");
    });
    previewMessages.querySelectorAll(".bot-message").forEach(msg => {
        msg.style.backgroundColor = colors.botMessageBackgroundColor || getDefaultColor("botMessageBackgroundColor");
        msg.style.color = colors.botMessageTextColor || getDefaultColor("botMessageTextColor");
    });

    previewInputArea.style.backgroundColor = colors.inputAreaBackgroundColor || getDefaultColor("inputAreaBackgroundColor");
    previewInputArea.querySelector("input").style.color = colors.inputTextColor || getDefaultColor("inputTextColor");
    previewSendBtn.style.backgroundColor = colors.sendButtonColor || getDefaultColor("sendButtonColor");
    previewImageInputBtn.style.backgroundColor = colors.sendButtonColor || getDefaultColor("sendButtonColor");
    previewImageInputBtn.style.display = imageUploadToggle.checked ? "flex" : "none";

    previewSuggestedQuestions.innerHTML = "; // Clear previous
    if (suggestedQuestionsToggle.checked) {
        previewSuggestedQuestions.style.display = "flex";
        const questions = suggestedQuestionsInput.value.split(",").map(q => q.trim()).filter(q => q);
        if (questions.length > 0) {
            const btn = document.createElement("button");
            btn.className = "suggested-question";
            btn.textContent = questions[0]; // Show first question as example
            btn.style.backgroundColor = colors.buttonColor || getDefaultColor("buttonColor");
            previewSuggestedQuestions.appendChild(btn);
        }
    } else {
        previewSuggestedQuestions.style.display = "none";
    }
  }

  // --- Generate Embed Codes --- 
  function generateCodes() {
    const chatUrl = `${window.location.origin}/chat/${currentLinkId}`;
    floatingButtonCodeInput.value = `<script src="${window.location.origin}/js/floating-button.js" data-chat-url="${chatUrl}" async defer></script>`;
    fullIframeCodeInput.value = `<iframe src="${chatUrl}" style="width: 100%; height: 600px; border: none;"></iframe>`;
  }

  // --- Event Listeners --- 

  // Content changes
  headerHiddenToggle.addEventListener("change", updatePreview);
  titleInput.addEventListener("input", updatePreview);
  logoUrlInput.addEventListener("input", updatePreview);
  suggestedQuestionsToggle.addEventListener("change", () => {
    suggestedQuestionsListContainer.style.display = suggestedQuestionsToggle.checked ? "block" : "none";
    updatePreview();
  });
  suggestedQuestionsInput.addEventListener("input", updatePreview);
  imageUploadToggle.addEventListener("change", updatePreview);

  // Color changes
  colorPickers.forEach(picker => {
    picker.addEventListener("input", (e) => {
      const key = e.target.dataset.colorKey;
      currentSettings.colors[key] = e.target.value;
      updatePreview();
    });
  });

  // Gear icon clicks to toggle color pickers
  colorConfigIcons.forEach(icon => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent closing immediately if clicking icon again
      const targetPopupId = e.target.dataset.target;
      const popup = document.getElementById(targetPopupId);

      // Close other popups
      document.querySelectorAll(".color-picker-popup.visible").forEach(p => {
          if (p !== popup) {
              p.classList.remove("visible");
          }
      });

      // Toggle current popup
      if (popup) {
        popup.classList.toggle("visible");
      }
    });
  });

  // Close popups when clicking outside
  document.addEventListener("click", (e) => {
      if (!e.target.closest(".color-picker-popup") && !e.target.closest(".color-config-icon")) {
          document.querySelectorAll(".color-picker-popup.visible").forEach(p => {
              p.classList.remove("visible");
          });
      }
  });

  // Link editing
  editLinkBtn.addEventListener("click", () => {
    newLinkIdInput.value = currentLinkId;
    editLinkForm.style.display = "flex";
    editLinkBtn.style.display = "none";
  });

  cancelLinkBtn.addEventListener("click", () => {
    editLinkForm.style.display = "none";
    editLinkBtn.style.display = "inline-block";
  });

  saveLinkBtn.addEventListener("click", async () => {
    const newId = newLinkIdInput.value.trim();
    if (newId.length < 4 || !/^[a-zA-Z0-9]+$/.test(newId)) {
      alert("الرابط يجب أن يتكون من 4 حروف أو أرقام إنجليزية على الأقل.");
      return;
    }
    if (newId === currentLinkId) {
      cancelLinkBtn.click();
      return;
    }

    try {
      saveLinkBtn.disabled = true;
      saveLinkBtn.innerHTML = ".";
      const response = await fetch(`/api/chat-page/update-link/${selectedBotId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldLinkId: currentLinkId, newLinkId: newId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `فشل تحديث الرابط: ${response.status}`);
      }
      currentLinkId = newId;
      chatLinkInput.value = `${window.location.origin}/chat/${currentLinkId}`;
      viewChatLink.href = `/chat/${currentLinkId}`;
      generateCodes();
      cancelLinkBtn.click();
      alert("تم تحديث الرابط بنجاح!");
    } catch (error) {
      console.error("Error updating link:", error);
      alert(`خطأ: ${error.message}`);
    } finally {
      saveLinkBtn.disabled = false;
      saveLinkBtn.innerHTML = "حفظ";
    }
  });

  // Copy buttons
  copyLinkBtn.addEventListener("click", () => copyToClipboard(chatLinkInput.value, copyLinkBtn));
  copyFloatingButtonCodeBtn.addEventListener("click", () => copyToClipboard(floatingButtonCodeInput.value, copyFloatingButtonCodeBtn));
  copyFullIframeCodeBtn.addEventListener("click", () => copyToClipboard(fullIframeCodeInput.value, copyFullIframeCodeBtn));

  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalIcon = button.innerHTML;
      button.innerHTML = ".";
      setTimeout(() => {
        button.innerHTML = originalIcon;
      }, 1500);
    }).catch(err => {
      console.error("Failed to copy:", err);
      alert("فشل النسخ!");
    });
  }

  // Save settings
  saveChatSettingsBtn.addEventListener("click", async () => {
    const settingsToSave = {
      linkId: currentLinkId,
      title: titleInput.value.trim(),
      logoUrl: logoUrlInput.value.trim(),
      headerHidden: headerHiddenToggle.checked,
      suggestedQuestionsEnabled: suggestedQuestionsToggle.checked,
      suggestedQuestions: suggestedQuestionsToggle.checked ? suggestedQuestionsInput.value.split(",").map(q => q.trim()).filter(q => q) : [],
      imageUploadEnabled: imageUploadToggle.checked,
      colors: currentSettings.colors,
    };

    try {
      saveChatSettingsBtn.disabled = true;
      saveChatSettingsBtn.innerHTML = ".";
      const response = await fetch(`/api/chat-page/settings/${selectedBotId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsToSave),
      });
      if (!response.ok) {
        throw new Error(`فشل حفظ الإعدادات: ${response.status}`);
      }
      currentSettings = settingsToSave; // Update local currentSettings
      alert("تم حفظ الإعدادات بنجاح!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert(`حدث خطأ أثناء حفظ الإعدادات: ${error.message}`);
    } finally {
      saveChatSettingsBtn.disabled = false;
      saveChatSettingsBtn.innerHTML = ".";
    }
  });

  // --- Initial Load ---
  fetchChatSettings();
}

