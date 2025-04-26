async function loadChatPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const selectedBotId = localStorage.getItem('selectedBotId');

  if (!selectedBotId) {
    content.innerHTML = `
      <h2>تخصيص صفحة الدردشة</h2>
      <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
    `;
    return;
  }

  content.innerHTML = `
    <h2>تخصيص صفحة الدردشة</h2>
    <div id="chatPageContent" class="chat-page-settings">
      <p>جاري تحميل الإعدادات...</p>
    </div>
  `;

  const chatPageContent = document.getElementById('chatPageContent');

  // Color schemes definitions
  const colorSchemes = [
    {
      name: 'ذهبي عصري',
      colors: {
        titleColor: '#D4AF37',
        headerColor: '#FDF5E6',
        chatAreaBackgroundColor: '#FFF8DC',
        textColor: '#4A3C31',
        userMessageBackgroundColor: '#DAA520',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#F5F5DC',
        botMessageTextColor: '#4A3C31',
        buttonColor: '#DAA520',
        backgroundColor: '#FDF5E6',
        inputTextColor: '#4A3C31',
        sendButtonColor: '#DAA520',
        mainBackgroundColor: '#FFF8DC',
      },
    },
    {
      name: 'أزرق فاتح',
      colors: {
        titleColor: '#222222',
        headerColor: '#E6F3FA',
        chatAreaBackgroundColor: '#F0F8FF',
        textColor: '#222222',
        userMessageBackgroundColor: '#00B7EB',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#D9EDF7',
        botMessageTextColor: '#222222',
        buttonColor: '#00B7EB',
        backgroundColor: '#E6F3FA',
        inputTextColor: '#222222',
        sendButtonColor: '#00B7EB',
        mainBackgroundColor: '#E6F3FA',
      },
    },
    {
      name: 'برتقالي دافئ',
      colors: {
        titleColor: '#111111',
        headerColor: '#FFF5E6',
        chatAreaBackgroundColor: '#FFFAF0',
        textColor: '#111111',
        userMessageBackgroundColor: '#FF9900',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#FFEBCC',
        botMessageTextColor: '#111111',
        buttonColor: '#FF9900',
        backgroundColor: '#FFF5E6',
        inputTextColor: '#111111',
        sendButtonColor: '#FF9900',
        mainBackgroundColor: '#FFFAF0',
      },
    },
    {
      name: 'تركواز غامق',
      colors: {
        titleColor: '#FFFFFF',
        headerColor: '#2C3E50',
        chatAreaBackgroundColor: '#34495E',
        textColor: '#FFFFFF',
        userMessageBackgroundColor: '#1ABC9C',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#2C3E50',
        botMessageTextColor: '#FFFFFF',
        buttonColor: '#1ABC9C',
        backgroundColor: '#34495E',
        inputTextColor: '#FFFFFF',
        sendButtonColor: '#1ABC9C',
        mainBackgroundColor: '#34495E',
      },
    },
    {
      name: 'أحمر غامق',
      colors: {
        titleColor: '#FFFFFF',
        headerColor: '#1A1A1A',
        chatAreaBackgroundColor: '#262626',
        textColor: '#FFFFFF',
        userMessageBackgroundColor: '#E74C3C',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#1A1A1A',
        botMessageTextColor: '#FFFFFF',
        buttonColor: '#E74C3C',
        backgroundColor: '#262626',
        inputTextColor: '#FFFFFF',
        sendButtonColor: '#E74C3C',
        mainBackgroundColor: '#262626',
      },
    },
    {
      name: 'أخضر غامق',
      colors: {
        titleColor: '#FFFFFF',
        headerColor: '#2D3436',
        chatAreaBackgroundColor: '#3B4A4E',
        textColor: '#FFFFFF',
        userMessageBackgroundColor: '#6AB04C',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#2D3436',
        botMessageTextColor: '#FFFFFF',
        buttonColor: '#6AB04C',
        backgroundColor: '#3B4A4E',
        inputTextColor: '#FFFFFF',
        sendButtonColor: '#6AB04C',
        mainBackgroundColor: '#3B4A4E',
      },
    },
    {
      name: 'فضي أنيق',
      colors: {
        titleColor: '#333333',
        headerColor: '#D3D3D3',
        chatAreaBackgroundColor: '#E8ECEF',
        textColor: '#333333',
        userMessageBackgroundColor: '#B0C4DE',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#C0C0C0',
        botMessageTextColor: '#333333',
        buttonColor: '#B0C4DE',
        backgroundColor: '#E8ECEF',
        inputTextColor: '#333333',
        sendButtonColor: '#B0C4DE',
        mainBackgroundColor: '#E8ECEF',
      },
    },
    {
      name: 'بنفسجي ملكي',
      colors: {
        titleColor: '#FFFFFF',
        headerColor: '#4B0082',
        chatAreaBackgroundColor: '#6A5ACD',
        textColor: '#FFFFFF',
        userMessageBackgroundColor: '#8A2BE2',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#4B0082',
        botMessageTextColor: '#FFFFFF',
        buttonColor: '#8A2BE2',
        backgroundColor: '#6A5ACD',
        inputTextColor: '#FFFFFF',
        sendButtonColor: '#8A2BE2',
        mainBackgroundColor: '#6A5ACD',
      },
    },
    {
      name: 'وردي ناعم',
      colors: {
        titleColor: '#4A2F39',
        headerColor: '#FFE4E1',
        chatAreaBackgroundColor: '#FFF0F5',
        textColor: '#4A2F39',
        userMessageBackgroundColor: '#FF69B4',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#FFD1DC',
        botMessageTextColor: '#4A2F39',
        buttonColor: '#FF69B4',
        backgroundColor: '#FFE4E1',
        inputTextColor: '#4A2F39',
        sendButtonColor: '#FF69B4',
        mainBackgroundColor: '#FFF0F5',
      },
    },
    {
      name: 'أخضر زمردي',
      colors: {
        titleColor: '#FFFFFF',
        headerColor: '#2E8B57',
        chatAreaBackgroundColor: '#3CB371',
        textColor: '#FFFFFF',
        userMessageBackgroundColor: '#228B22',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#2E8B57',
        botMessageTextColor: '#FFFFFF',
        buttonColor: '#228B22',
        backgroundColor: '#3CB371',
        inputTextColor: '#FFFFFF',
        sendButtonColor: '#228B22',
        mainBackgroundColor: '#3CB371',
      },
    },
    {
      name: 'أسود لامع',
      colors: {
        titleColor: '#FFD700',
        headerColor: '#1C2526',
        chatAreaBackgroundColor: '#2A2F32',
        textColor: '#FFD700',
        userMessageBackgroundColor: '#FFD700',
        userMessageTextColor: '#1C2526',
        botMessageBackgroundColor: '#1C2526',
        botMessageTextColor: '#FFD700',
        buttonColor: '#FFD700',
        backgroundColor: '#2A2F32',
        inputTextColor: '#FFD700',
        sendButtonColor: '#FFD700',
        mainBackgroundColor: '#2A2F32',
      },
    },
    {
      name: 'بيج كلاسيكي',
      colors: {
        titleColor: '#5C4033',
        headerColor: '#F5F5DC',
        chatAreaBackgroundColor: '#FAEBD7',
        textColor: '#5C4033',
        userMessageBackgroundColor: '#DEB887',
        userMessageTextColor: '#FFFFFF',
        botMessageBackgroundColor: '#F5F5DC',
        botMessageTextColor: '#5C4033',
        buttonColor: '#DEB887',
        backgroundColor: '#FAEBD7',
        inputTextColor: '#5C4033',
        sendButtonColor: '#DEB887',
        mainBackgroundColor: '#FAEBD7',
      },
    },
  ];

  async function loadChatPageSettings() {
    try {
      const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const floatingButtonCode = `
<div id="supportButtonContainer" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
  <img id="supportButton" src="https://i.ibb.co/7JJScM0Q/Chat-GPT-Image-20-2025-08-04-13.png" alt="دعم العملاء" style="width: 60px; height: 60px; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;">
</div>
<div id="chatIframeContainer" style="display: none; position: fixed; bottom: 90px; right: 20px; z-index: 1000;">
  <div style="position: relative; width: 350px; height: 600px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); background: white;">
    <button id="closeChatIframe" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
    <iframe src="${data.link}" style="width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>
  </div>
</div>
<script>
  const supportButton = document.getElementById('supportButton');
  const chatIframeContainer = document.getElementById('chatIframeContainer');
  const closeChatIframe = document.getElementById('closeChatIframe');
  supportButton.addEventListener('click', () => {
    chatIframeContainer.style.display = chatIframeContainer.style.display === 'none' ? 'block' : 'none';
    supportButton.style.transform = chatIframeContainer.style.display === 'block' ? 'scale(1.1)' : 'scale(1)';
  });
  closeChatIframe.addEventListener('click', () => {
    chatIframeContainer.style.display = 'none';
    supportButton.style.transform = 'scale(1)';
  });
</script>
        `.trim();

        const fullIframeCode = `
<iframe src="${data.link}" style="width: 100%; height: 100vh; border: none;"></iframe>
        `.trim();

        chatPageContent.innerHTML = `
          <div class="form-group">
            <label for="chatLink">رابط صفحة الدردشة:</label>
            <div class="input-group">
              <input type="text" id="chatLink" value="${data.link}" readonly>
              <button id="copyLinkBtn" class="submit-btn">نسخ الرابط</button>
            </div>
          </div>
          <div class="form-group">
            <label for="floatingButtonCode">كود زر الدعم العائم:</label>
            <div class="input-group">
              <textarea id="floatingButtonCode" readonly style="width: 100%; height: 150px; resize: none; direction: ltr;">${floatingButtonCode}</textarea>
              <button id="copyFloatingButtonCodeBtn" class="submit-btn">نسخ</button>
            </div>
          </div>
          <div class="form-group">
            <label for="fullIframeCode">كود تضمين صفحة الدردشة:</label>
            <div class="input-group">
              <textarea id="fullIframeCode" readonly style="width: 100%; height: 100px; resize: none; direction: ltr;">${fullIframeCode}</textarea>
              <button id="copyFullIframeCodeBtn" class="submit-btn">نسخ</button>
            </div>
          </div>
          <div class="preview-settings-container">
            <div class="preview-section">
              <h3>معاينة صفحة الدردشة</h3>
              <div class="chat-preview-container">
                <div id="previewChat" class="chat-container">
                  <div class="section-with-settings">
                    <div id="previewChatHeader" class="chat-header">
                      <img id="previewChatLogo" class="chat-logo" style="display: ${data.logoUrl ? 'block' : 'none'};" src="${data.logoUrl || ''}" alt="Logo">
                      <h1 id="previewChatTitle" class="chat-title">${data.title}</h1>
                    </div>
                    <button class="settings-gear" data-target="header-settings">⚙️</button>
                    <div id="header-settings" class="settings-popup" style="display: none;">
                      <button class="close-btn">✕</button>
                      <div class="color-picker-wrapper">
                        <label for="titleColor">لون نص العنوان:</label>
                        <input type="color" class="color-input" id="titleColorInput" data-color-id="titleColor" value="${data.titleColor || '#ffffff'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="headerColor">لون الهيدر:</label>
                        <input type="color" class="color-input" id="headerColorInput" data-color-id="headerColor" value="${data.colors.header}">
                      </div>
                    </div>
                  </div>
                  <div class="section-with-settings">
                    <div id="previewChatMessages" class="chat-messages">
                      <div class="message user-message">رسالة المستخدم</div>
                      <div class="message bot-message">رد البوت</div>
                    </div>
                    <button class="settings-gear" data-target="messages-settings">⚙️</button>
                    <div id="messages-settings" class="settings-popup" style="display: none;">
                      <button class="close-btn">✕</button>
                      <div class="color-picker-wrapper">
                        <label for="chatAreaBackgroundColor">لون خلفية مربع الدردشة:</label>
                        <input type="color" class="color-input" id="chatAreaBackgroundColorInput" data-color-id="chatAreaBackgroundColor" value="${data.colors.chatAreaBackground || '#ffffff'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="textColor">لون النص العام:</label>
                        <input type="color" class="color-input" id="textColorInput" data-color-id="textColor" value="${data.colors.text}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="userMessageBackgroundColor">لون فقاعة المستخدم:</label>
                        <input type="color" class="color-input" id="userMessageBackgroundColorInput" data-color-id="userMessageBackgroundColor" value="${data.colors.userMessageBackground || '#007bff'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="userMessageTextColor">لون نص المستخدم:</label>
                        <input type="color" class="color-input" id="userMessageTextColorInput" data-color-id="userMessageTextColor" value="${data.colors.userMessageTextColor || '#ffffff'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="botMessageBackgroundColor">لون فقاعة البوت:</label>
                        <input type="color" class="color-input" id="botMessageBackgroundColorInput" data-color-id="botMessageBackgroundColor" value="${data.colors.botMessageBackground || '#e9ecef'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="botMessageTextColor">لون نص البوت:</label>
                        <input type="color" class="color-input" id="botMessageTextColorInput" data-color-id="botMessageTextColor" value="${data.colors.botMessageTextColor || '#000000'}">
                      </div>
                    </div>
                  </div>
                  <div class="section-with-settings">
                    <div id="previewSuggestedQuestions" class="suggested-questions" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};">
                      ${data.suggestedQuestions?.map(q => `<button class="suggested-question">${q}</button>`).join('') || ''}
                    </div>
                    <button class="settings-gear" data-target="suggested-questions-settings" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};" id="suggestedQuestionsGear">⚙️</button>
                    <div id="suggested-questions-settings" class="settings-popup" style="display: none;">
                      <button class="close-btn">✕</button>
                      <div class="color-picker-wrapper">
                        <label for="buttonColor">لون الأزرار المقترحة:</label>
                        <input type="color" class="color-input" id="buttonColorInput" data-color-id="buttonColor" value="${data.colors.button}">
                      </div>
                    </div>
                  </div>
                  <div class="section-with-settings">
                    <div class="chat-input">
                      <input type="text" id="previewMessageInput" placeholder="اكتب رسالتك...">
                      <input type="file" id="previewImageInput" accept="image/*" style="display: ${data.imageUploadEnabled ? 'block' : 'none'};">
                      <button id="previewSendMessageBtn">إرسال</button>
                    </div>
                    <button class="settings-gear" data-target="input-settings">⚙️</button>
                    <div id="input-settings" class="settings-popup" style="display: none;">
                      <button class="close-btn">✕</button>
                      <div class="color-picker-wrapper">
                        <label for="backgroundColor">لون الخلفية:</label>
                        <input type="color" class="color-input" id="backgroundColorInput" data-color-id="backgroundColor" value="${data.colors.background}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="inputTextColor">لون نص مربع الإدخال:</label>
                        <input type="color" class="color-input" id="inputTextColorInput" data-color-id="inputTextColor" value="${data.colors.inputTextColor || '#333333'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="sendButtonColor">لون زر الإرسال:</label>
                        <input type="color" class="color-input" id="sendButtonColorInput" data-color-id="sendButtonColor" value="${data.colors.sendButtonColor || '#007bff'}">
                      </div>
                      <div class="color-picker-wrapper">
                        <label for="mainBackgroundColor">لون خلفية الصفحة الرئيسية:</label>
                        <input type="color" class="color-input" id="mainBackgroundColorInput" data-color-id="mainBackgroundColor" value="${data.colors.mainBackgroundColor || '#ffffff'}">
                      </div>
                      <div class="color-picker-wrapper" id="transparencyWrapper" style="display: ${data.transparentBackgroundEnabled ? 'block' : 'none'};">
                        <label for="backgroundTransparency">نسبة الشفافية (0-1):</label>
                        <input type="range" min="0" max="1" step="0.1" id="backgroundTransparencyInput" data-color-id="backgroundTransparency" value="${data.backgroundTransparency || 0.5}">
                        <span id="transparencyValue">${data.backgroundTransparency || 0.5}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="settings-section">
              <h3>نماذج الألوان</h3>
              <div class="color-schemes-container">
                <div class="color-schemes-buttons">
                  ${colorSchemes
                    .map(
                      (scheme, index) => `
                        <button class="color-scheme-btn" data-scheme-index="${index}" style="
                          background: linear-gradient(
                            45deg,
                            ${scheme.colors.headerColor} 20%,
                            ${scheme.colors.backgroundColor} 20%, ${scheme.colors.backgroundColor} 40%,
                            ${scheme.colors.userMessageBackgroundColor} 40%, ${scheme.colors.userMessageBackgroundColor} 60%,
                            ${scheme.colors.botMessageBackgroundColor} 60%, ${scheme.colors.botMessageBackgroundColor} 80%,
                            ${scheme.colors.buttonColor} 80%
                          );
                          color: ${scheme.colors.textColor};
                          padding: 8px 16px;
                          border: none;
                          border-radius: 20px;
                          cursor: pointer;
                          font-size: 0.9em;
                          margin: 5px;
                          transition: transform 0.2s;
                        ">
                          ${scheme.name}
                        </button>
                      `
                    )
                    .join('')}
                </div>
              </div>
              <form id="customizationForm" class="settings-group" enctype="multipart/form-data">
                <div class="form-group">
                  <label for="title">عنوان الصفحة:</label>
                  <input type="text" id="title" name="title" value="${data.title}" required placeholder="أدخل عنوان الصفحة">
                </div>
                <div class="form-group logo-section">
                  <label for="logo">شعار الصفحة (PNG):</label>
                  <input type="file" id="logo" name="logo" accept="image/png">
                  <div class="logo-preview-container">
                    <p style="font-size: 0.8em; margin-bottom: 5px;">الشعار الحالي:</p>
                    ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo Preview" class="logo-preview-img" />` : '<p style="font-size: 0.8em;">لا يوجد</p>'}
                  </div>
                  <img id="logoPreview" class="logo-preview-img" style="display: none;" alt="Logo Preview" />
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="suggestedQuestionsEnabled" name="suggestedQuestionsEnabled" ${data.suggestedQuestionsEnabled ? 'checked' : ''}>
                    تفعيل الأسئلة المقترحة
                  </label>
                  <div id="suggestedQuestionsContainer" class="suggested-questions-container" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};">
                    <h3>إدارة الأسئلة المقترحة</h3>
                    <div class="question-input-group">
                      <input type="text" id="newQuestion" placeholder="أدخل سؤالًا جديدًا">
                      <button type="button" id="addQuestionBtn" class="submit-btn">إضافة سؤال</button>
                    </div>
                    <ul id="questionsList" class="questions-list"></ul>
                  </div>
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="imageUploadEnabled" name="imageUploadEnabled" ${data.imageUploadEnabled ? 'checked' : ''}>
                    تفعيل إرفاق الصور
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="transparentBackgroundEnabled" name="transparentBackgroundEnabled" ${data.transparentBackgroundEnabled ? 'checked' : ''}>
                    جعل خلفية الصفحة شفافة
                  </label>
                </div>
                <button type="submit" class="submit-btn">حفظ الإعدادات</button>
              </form>
            </div>
          </div>
        `;

        // Apply initial styles to the preview
        const previewChat = document.getElementById('previewChat');
        const previewChatHeader = document.getElementById('previewChatHeader');
        const previewChatTitle = document.getElementById('previewChatTitle');
        const previewChatMessages = document.getElementById('previewChatMessages');
        const previewSuggestedQuestions = document.getElementById('previewSuggestedQuestions');
        const previewSendMessageBtn = document.getElementById('previewSendMessageBtn');
        const previewMessageInput = document.getElementById('previewMessageInput');
        const previewImageInput = document.getElementById('previewImageInput');
        const userMessage = document.querySelector('#previewChatMessages .user-message');
        const botMessage = document.querySelector('#previewChatMessages .bot-message');

        // Object to store color values and transparency
        let colorValues = {
          titleColor: data.titleColor || '#ffffff',
          headerColor: data.colors.header,
          chatAreaBackgroundColor: data.colors.chatAreaBackground || '#ffffff',
          textColor: data.colors.text,
          userMessageBackgroundColor: data.colors.userMessageBackground || '#007bff',
          userMessageTextColor: data.colors.userMessageTextColor || '#ffffff',
          botMessageBackgroundColor: data.colors.botMessageBackground || '#e9ecef',
          botMessageTextColor: data.colors.botMessageTextColor || '#000000',
          buttonColor: data.colors.button,
          backgroundColor: data.colors.background,
          inputTextColor: data.colors.inputTextColor || '#333333',
          sendButtonColor: data.colors.sendButtonColor || '#007bff',
          mainBackgroundColor: data.colors.mainBackgroundColor || '#ffffff',
          backgroundTransparency: data.backgroundTransparency || 0.5,
        };

        function updatePreviewStyles() {
          const transparentBackgroundEnabled = document.getElementById('transparentBackgroundEnabled').checked;
          if (transparentBackgroundEnabled) {
            previewChat.style.backgroundColor = `rgba(255, 255, 255, ${colorValues.backgroundTransparency})`;
          } else {
            previewChat.style.backgroundColor = colorValues.mainBackgroundColor;
          }
          previewChatHeader.style.backgroundColor = colorValues.headerColor;
          previewChatTitle.style.color = colorValues.titleColor;
          previewChatMessages.style.backgroundColor = colorValues.chatAreaBackgroundColor;
          previewChat.style.color = colorValues.textColor;
          previewSendMessageBtn.style.backgroundColor = colorValues.sendButtonColor;
          previewMessageInput.style.color = colorValues.inputTextColor;
          Array.from(previewSuggestedQuestions.children).forEach(btn => {
            btn.style.backgroundColor = colorValues.buttonColor;
          });
          userMessage.style.backgroundColor = colorValues.userMessageBackgroundColor;
          userMessage.style.color = colorValues.userMessageTextColor;
          botMessage.style.backgroundColor = colorValues.botMessageBackgroundColor;
          botMessage.style.color = colorValues.botMessageTextColor;

          // Update color inputs
          document.getElementById('titleColorInput').value = colorValues.titleColor;
          document.getElementById('headerColorInput').value = colorValues.headerColor;
          document.getElementById('chatAreaBackgroundColorInput').value = colorValues.chatAreaBackgroundColor;
          document.getElementById('textColorInput').value = colorValues.textColor;
          document.getElementById('userMessageBackgroundColorInput').value = colorValues.userMessageBackgroundColor;
          document.getElementById('userMessageTextColorInput').value = colorValues.userMessageTextColor;
          document.getElementById('botMessageBackgroundColorInput').value = colorValues.botMessageBackgroundColor;
          document.getElementById('botMessageTextColorInput').value = colorValues.botMessageTextColor;
          document.getElementById('buttonColorInput').value = colorValues.buttonColor;
          document.getElementById('backgroundColorInput').value = colorValues.backgroundColor;
          document.getElementById('inputTextColorInput').value = colorValues.inputTextColor;
          document.getElementById('sendButtonColorInput').value = colorValues.sendButtonColor;
          document.getElementById('mainBackgroundColorInput').value = colorValues.mainBackgroundColor;
          document.getElementById('backgroundTransparencyInput').value = colorValues.backgroundTransparency;
          document.getElementById('transparencyValue').textContent = colorValues.backgroundTransparency;
        }

        // Handle transparent background toggle
        document.getElementById('transparentBackgroundEnabled').addEventListener('change', () => {
          const transparencyWrapper = document.getElementById('transparencyWrapper');
          transparencyWrapper.style.display = document.getElementById('transparentBackgroundEnabled').checked ? 'block' : 'none';
          updatePreviewStyles();
        });

        // Handle transparency slider
        document.getElementById('backgroundTransparencyInput').addEventListener('input', (e) => {
          colorValues.backgroundTransparency = e.target.value;
          document.getElementById('transparencyValue').textContent = e.target.value;
          updatePreviewStyles();
        });

        // Handle gear buttons to show/hide settings popups
        document.querySelectorAll('.settings-gear').forEach(gear => {
          gear.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = gear.getAttribute('data-target');
            const popup = document.getElementById(targetId);
            const isVisible = popup.style.display === 'block';
            document.querySelectorAll('.settings-popup').forEach(p => p.style.display = 'none');
            popup.style.display = isVisible ? 'none' : 'block';
          });
        });

        // Handle close buttons for settings popups
        document.querySelectorAll('.settings-popup .close-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            btn.parentElement.style.display = 'none';
          });
        });

        // Handle color schemes
        document.querySelectorAll('.color-scheme-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const schemeIndex = btn.getAttribute('data-scheme-index');
            const selectedScheme = colorSchemes[schemeIndex];
            colorValues = { ...selectedScheme.colors, backgroundTransparency: colorValues.backgroundTransparency };
            updatePreviewStyles();
          });
        });

        // Attach event listeners to color inputs
        setTimeout(() => {
          const colorInputs = document.querySelectorAll('.color-input');
          colorInputs.forEach(input => {
            const colorId = input.getAttribute('data-color-id');
            input.addEventListener('input', (e) => {
              colorValues[colorId] = e.target.value;
              updatePreviewStyles();
            });
          });
        }, 0);

        // Update title in preview
        document.getElementById('title').addEventListener('input', (e) => {
          previewChatTitle.textContent = e.target.value || 'صفحة الدردشة';
        });

        // Logo upload preview
        const logoInput = document.getElementById('logo');
        const logoPreview = document.getElementById('logoPreview');
        const previewChatLogo = document.getElementById('previewChatLogo');
        logoInput.addEventListener('change', () => {
          const file = logoInput.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              logoPreview.src = e.target.result;
              logoPreview.style.display = 'block';
              previewChatLogo.src = e.target.result;
              previewChatLogo.style.display = 'block';
            };
            reader.readAsDataURL(file);
          } else {
            logoPreview.style.display = 'none';
            previewChatLogo.style.display = 'none';
          }
        });

        // Copy link functionality
        document.getElementById('copyLinkBtn').addEventListener('click', async () => {
          const linkInput = document.getElementById('chatLink');
          try {
            await navigator.clipboard.writeText(linkInput.value);
            alert('تم نسخ الرابط بنجاح!');
          } catch (err) {
            console.error('خطأ في نسخ الرابط:', err);
            alert('فشل في نسخ الرابط، حاول مرة أخرى');
          }
        });

        // Copy floating button code
        document.getElementById('copyFloatingButtonCodeBtn').addEventListener('click', async () => {
          const floatingButtonCodeInput = document.getElementById('floatingButtonCode');
          try {
            await navigator.clipboard.writeText(floatingButtonCodeInput.value);
            alert('تم نسخ كود زر الدعم العائم بنجاح!');
          } catch (err) {
            console.error('خطأ في نسخ كود زر الدعم العائم:', err);
            alert('فشل في نسخ الكود، حاول مرة أخرى');
          }
        });

        // Copy full iframe code
        document.getElementById('copyFullIframeCodeBtn').addEventListener('click', async () => {
          const fullIframeCodeInput = document.getElementById('fullIframeCode');
          try {
            await navigator.clipboard.writeText(fullIframeCodeInput.value);
            alert('تم نسخ كود تضمين صفحة الدردشة بنجاح!');
          } catch (err) {
            console.error('خطأ في نسخ كود تضمين صفحة الدردشة:', err);
            alert('فشل في نسخ الكود، حاول مرة أخرى');
          }
        });

        // Suggested questions functionality
        const suggestedQuestionsEnabledCheckbox = document.getElementById('suggestedQuestionsEnabled');
        const suggestedQuestionsContainer = document.getElementById('suggestedQuestionsContainer');
        const suggestedQuestionsGear = document.getElementById('suggestedQuestionsGear');
        suggestedQuestionsEnabledCheckbox.addEventListener('change', () => {
          suggestedQuestionsContainer.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
          previewSuggestedQuestions.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
          suggestedQuestionsGear.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
        });

        let questions = data.suggestedQuestions || [];
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
          const newQuestionInput = document.getElementById('newQuestion');
          const question = newQuestionInput.value.trim();
          if (question) {
            questions.push(question);
            newQuestionInput.value = '';
            updateQuestionsList();
            updatePreviewSuggestedQuestions();
          } else {
            alert('يرجى إدخال سؤال صالح');
          }
        });

        function updateQuestionsList() {
          const questionsList = document.getElementById('questionsList');
          questionsList.innerHTML = '';
          questions.forEach((question, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
              ${question}
              <div class="question-actions">
                <button type="button" onclick="editQuestion(${index})">تعديل</button>
                <button type="button" onclick="deleteQuestion(${index})">حذف</button>
              </div>
            `;
            questionsList.appendChild(li);
          });
        }

        function updatePreviewSuggestedQuestions() {
          previewSuggestedQuestions.innerHTML = questions.map(q => `<button class="suggested-question">${q}</button>`).join('');
          Array.from(previewSuggestedQuestions.children).forEach(btn => {
            btn.style.backgroundColor = colorValues.buttonColor;
          });
        }

        window.editQuestion = (index) => {
          const newQuestion = prompt('أدخل السؤال الجديد:', questions[index]);
          if (newQuestion && newQuestion.trim()) {
            questions[index] = newQuestion.trim();
            updateQuestionsList();
            updatePreviewSuggestedQuestions();
          }
        };

        window.deleteQuestion = (index) => {
          if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            questions.splice(index, 1);
            updateQuestionsList();
            updatePreviewSuggestedQuestions();
          }
        };

        updateQuestionsList();

        // Image upload toggle
        document.getElementById('imageUploadEnabled').addEventListener('change', (e) => {
          previewImageInput.style.display = e.target.checked ? 'block' : 'none';
        });

        // Form submission
        document.getElementById('customizationForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          formData.set('title', formData.get('title'));
          formData.set('titleColor', colorValues.titleColor);
          formData.set('colors', JSON.stringify({
            header: colorValues.headerColor,
            background: colorValues.backgroundColor,
            chatAreaBackground: colorValues.chatAreaBackgroundColor,
            text: colorValues.textColor,
            button: colorValues.buttonColor,
            userMessageBackground: colorValues.userMessageBackgroundColor,
            userMessageTextColor: colorValues.userMessageTextColor,
            botMessageBackground: colorValues.botMessageBackgroundColor,
            botMessageTextColor: colorValues.botMessageTextColor,
            inputTextColor: colorValues.inputTextColor,
            sendButtonColor: colorValues.sendButtonColor,
            mainBackgroundColor: colorValues.mainBackgroundColor,
          }));
          formData.set('suggestedQuestionsEnabled', formData.get('suggestedQuestionsEnabled') === 'on' ? 'true' : 'false');
          formData.set('suggestedQuestions', JSON.stringify(questions));
          formData.set('imageUploadEnabled', formData.get('imageUploadEnabled') === 'on' ? 'true' : 'false');
          formData.set('transparentBackgroundEnabled', formData.get('transparentBackgroundEnabled') === 'on' ? 'true' : 'false');
          formData.set('backgroundTransparency', colorValues.backgroundTransparency);

          try {
            const response = await fetch(`/api/chat-page/${data.chatPageId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `فشل في حفظ الإعدادات: ${response.status}`);
            }

            const result = await response.json();
            if (result.logoUrl) {
              document.querySelector('.logo-preview-container p').innerHTML = `الشعار الحالي: <img src="${result.logoUrl}" alt="Logo Preview" class="logo-preview-img" />`;
              logoPreview.src = result.logoUrl;
              logoPreview.style.display = 'block';
              previewChatLogo.src = result.logoUrl;
              previewChatLogo.style.display = 'block';
            }
            if (result.colors) {
              colorValues.headerColor = result.colors.header || colorValues.headerColor;
              colorValues.backgroundColor = result.colors.background || colorValues.backgroundColor;
              colorValues.chatAreaBackgroundColor = result.colors.chatAreaBackground || colorValues.chatAreaBackgroundColor;
              colorValues.textColor = result.colors.text || colorValues.textColor;
              colorValues.buttonColor = result.colors.button || colorValues.buttonColor;
              colorValues.userMessageBackgroundColor = result.colors.userMessageBackground || colorValues.userMessageBackgroundColor;
              colorValues.userMessageTextColor = result.colors.userMessageTextColor || colorValues.userMessageTextColor;
              colorValues.botMessageBackgroundColor = result.colors.botMessageBackground || colorValues.botMessageBackgroundColor;
              colorValues.botMessageTextColor = result.colors.botMessageTextColor || colorValues.botMessageTextColor;
              colorValues.inputTextColor = result.colors.inputTextColor || colorValues.inputTextColor;
              colorValues.sendButtonColor = result.colors.sendButtonColor || colorValues.sendButtonColor;
              colorValues.mainBackgroundColor = result.colors.mainBackgroundColor || colorValues.mainBackgroundColor;
              updatePreviewStyles();
            }
            alert('تم حفظ الإعدادات بنجاح!');
          } catch (err) {
            console.error('خطأ في حفظ الإعدادات:', err);
            alert(err.message || 'فشل في حفظ الإعدادات، حاول مرة أخرى');
          }
        });

        // Initial preview update
        updatePreviewStyles();
      } else {
        chatPageContent.innerHTML = `
          <button id="createChatPageBtn" class="submit-btn">إنشاء صفحة دردشة</button>
        `;

        const createChatPageBtn = document.getElementById('createChatPageBtn');
        if (createChatPageBtn) {
          createChatPageBtn.addEventListener('click', async () => {
            try {
              const response = await fetch('/api/chat-page', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: localStorage.getItem('userId'),
                  botId: selectedBotId,
                }),
              });

              if (!response.ok) {
                throw new Error(`فشل في إنشاء صفحة الدردشة: ${response.status} ${response.statusText}`);
              }

              loadChatPageSettings();
            } catch (err) {
              console.error('خطأ في إنشاء صفحة الدردشة:', err);
              chatPageContent.innerHTML = `
                <p style="color: red;">تعذر إنشاء صفحة الدردشة، حاول مرة أخرى لاحقًا.</p>
              `;
            }
          });
        }
      }
    } catch (err) {
      console.error('خطأ في جلب صفحة الدردشة:', err);
      chatPageContent.innerHTML = `
        <p style="color: red;">تعذر جلب صفحة الدردشة، حاول مرة أخرى لاحقًا.</p>
      `;
    }
  }

  loadChatPageSettings();
}
