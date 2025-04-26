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
      name: 'فاتح 1',
      colors: {
        titleColor: '#333333',
        headerColor: '#f8f9fa',
        chatAreaBackgroundColor: '#ffffff',
        textColor: '#333333',
        userMessageBackgroundColor: '#007bff',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#e9ecef',
        botMessageTextColor: '#333333',
        buttonColor: '#007bff',
        backgroundColor: '#f8f9fa',
        inputTextColor: '#333333',
        sendButtonColor: '#007bff',
      },
    },
    {
      name: 'فاتح 2',
      colors: {
        titleColor: '#222222',
        headerColor: '#e6f3fa',
        chatAreaBackgroundColor: '#f0f8ff',
        textColor: '#222222',
        userMessageBackgroundColor: '#00b7eb',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#d9edf7',
        botMessageTextColor: '#222222',
        buttonColor: '#00b7eb',
        backgroundColor: '#e6f3fa',
        inputTextColor: '#222222',
        sendButtonColor: '#00b7eb',
      },
    },
    {
      name: 'فاتح 3',
      colors: {
        titleColor: '#111111',
        headerColor: '#fff5e6',
        chatAreaBackgroundColor: '#fffaf0',
        textColor: '#111111',
        userMessageBackgroundColor: '#ff9900',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#ffebcc',
        botMessageTextColor: '#111111',
        buttonColor: '#ff9900',
        backgroundColor: '#fff5e6',
        inputTextColor: '#111111',
        sendButtonColor: '#ff9900',
      },
    },
    {
      name: 'غامق 1',
      colors: {
        titleColor: '#ffffff',
        headerColor: '#2c3e50',
        chatAreaBackgroundColor: '#34495e',
        textColor: '#ffffff',
        userMessageBackgroundColor: '#1abc9c',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#2c3e50',
        botMessageTextColor: '#ffffff',
        buttonColor: '#1abc9c',
        backgroundColor: '#34495e',
        inputTextColor: '#ffffff',
        sendButtonColor: '#1abc9c',
      },
    },
    {
      name: 'غامق 2',
      colors: {
        titleColor: '#ffffff',
        headerColor: '#1a1a1a',
        chatAreaBackgroundColor: '#262626',
        textColor: '#ffffff',
        userMessageBackgroundColor: '#e74c3c',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#1a1a1a',
        botMessageTextColor: '#ffffff',
        buttonColor: '#e74c3c',
        backgroundColor: '#262626',
        inputTextColor: '#ffffff',
        sendButtonColor: '#e74c3c',
      },
    },
    {
      name: 'غامق 3',
      colors: {
        titleColor: '#ffffff',
        headerColor: '#2d3436',
        chatAreaBackgroundColor: '#3b4a4e',
        textColor: '#ffffff',
        userMessageBackgroundColor: '#6ab04c',
        userMessageTextColor: '#ffffff',
        botMessageBackgroundColor: '#2d3436',
        botMessageTextColor: '#ffffff',
        buttonColor: '#6ab04c',
        backgroundColor: '#3b4a4e',
        inputTextColor: '#ffffff',
        sendButtonColor: '#6ab04c',
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
  <div style="position: relative; width: 350px; height: 400px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); background: ${data.colors.background || '#262626'}; overflow: hidden;">
    <button id="closeChatIframe" style="position: absolute; top: 10px; left: 10px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;">✕</button>
    <iframe src="${data.link}" style="width: 100%; height: 100%; border: none; border-radius: 8px; overflow: hidden;"></iframe>
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="settings-section">
              <h3>نماذج الألوان</h3>
              <div class="color-schemes-container">
                <div class="color-schemes-grid">
                  ${colorSchemes
                    .map(
                      (scheme, index) => `
                        <div class="color-scheme-card" data-scheme-index="${index}">
                          <div class="color-samples">
                            <div class="color-sample" style="background-color: ${scheme.colors.headerColor};"></div>
                            <div class="color-sample" style="background-color: ${scheme.colors.backgroundColor};"></div>
                            <div class="color-sample" style="background-color: ${scheme.colors.userMessageBackgroundColor};"></div>
                            <div class="color-sample" style="background-color: ${scheme.colors.botMessageBackgroundColor};"></div>
                            <div class="color-sample" style="background-color: ${scheme.colors.buttonColor};"></div>
                          </div>
                          <p>${scheme.name}</p>
                        </div>
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

        // Object to store color values
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
        };

        function updatePreviewStyles() {
          previewChat.style.backgroundColor = colorValues.backgroundColor;
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
        }

        // Handle gear buttons to show/hide settings popups
        document.querySelectorAll('.settings-gear').forEach(gear => {
          gear.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Settings gear clicked:', gear.getAttribute('data-target'));
            const targetId = gear.getAttribute('data-target');
            const popup = document.getElementById(targetId);
            const isVisible = popup.style.display === 'block';
            // Hide all popups first
            document.querySelectorAll('.settings-popup').forEach(p => p.style.display = 'none');
            // Toggle the clicked popup
            popup.style.display = isVisible ? 'none' : 'block';
            console.log(`Toggled popup ${targetId} to ${popup.style.display}`);
          });
        });

        // Handle close buttons for settings popups
        document.querySelectorAll('.settings-popup .close-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            btn.parentElement.style.display = 'none';
          });
        });

        // Handle color schemes
        document.querySelectorAll('.color-scheme-card').forEach( card => {
          card.addEventListener('click', () => {
            const schemeIndex = card.getAttribute('data-scheme-index');
            const selectedScheme = colorSchemes[schemeIndex];
            colorValues = { ...selectedScheme.colors };
            updatePreviewStyles();
          });
        });

        // Attach event listeners to color inputs
        setTimeout(() => {
          const colorInputs = document.querySelectorAll('.color-input');
          console.log(`Found ${colorInputs.length} color-input elements`);
          colorInputs.forEach(input => {
            const colorId = input.getAttribute('data-color-id');
            console.log(`Attaching event listener for ${colorId}`);
            input.addEventListener('input', (e) => {
              colorValues[colorId] = e.target.value;
              updatePreviewStyles();
              console.log(`Color changed for ${colorId}: ${e.target.value}`);
            });
          });
        }, 0); // Ensure DOM is fully rendered

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
            console.log(`Link copied: ${linkInput.value}`);
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
            console.log('Floating button code copied');
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
            console.log('Full iframe code copied');
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
          }));
          formData.set('suggestedQuestionsEnabled', formData.get('suggestedQuestionsEnabled') === 'on' ? 'true' : 'false');
          formData.set('suggestedQuestions', JSON.stringify(questions));
          formData.set('imageUploadEnabled', formData.get('imageUploadEnabled') === 'on' ? 'true' : 'false');

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
            // Update colorValues with the new values from the server response
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

              // Update the preview with the new values
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
        // If no chat page exists for the selected bot, show the "Create Chat Page" button
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

              // After creating the chat page, reload settings
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

  // Load settings for the selected bot
  loadChatPageSettings();
}
