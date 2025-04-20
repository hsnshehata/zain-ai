async function loadChatPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  content.innerHTML = `
    <h2>تخصيص صفحة الدردشة</h2>
    <div id="chatPageContent" class="chat-page-settings">
      <p>جاري تحميل البوتات...</p>
    </div>
  `;

  const chatPageContent = document.getElementById('chatPageContent');

  let bots = [];
  try {
    const response = await fetch('/api/bots', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`فشل في جلب البوتات: ${response.status} ${response.statusText}`);
    }
    bots = await response.json();
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    chatPageContent.innerHTML = `
      <p style="color: red;">تعذر جلب البوتات، حاول مرة أخرى لاحقًا.</p>
    `;
    return;
  }

  let html = `
    <div class="form-group">
      <label for="botId">اختر البوت:</label>
      <select id="botId" name="botId" required>
        <option value="">اختر بوت</option>
  `;

  const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId && bot.userId._id === userId);
  userBots.forEach(bot => {
    html += `<option value="${bot._id}">${bot.name}</option>`;
  });

  html += `
      </select>
    </div>
    <button id="createChatPageBtn" class="submit-btn" style="display: none;">إنشاء صفحة دردشة</button>
  `;

  chatPageContent.innerHTML = html;

  const botIdSelect = document.getElementById('botId');
  const createChatPageBtn = document.getElementById('createChatPageBtn');

  if (botIdSelect) {
    botIdSelect.addEventListener('change', async () => {
      const selectedBotId = botIdSelect.value;
      createChatPageBtn.style.display = selectedBotId ? 'block' : 'none';
      createChatPageBtn.disabled = !selectedBotId;
      console.log(`Selected bot ID: ${selectedBotId}`);

      if (selectedBotId) {
        try {
          const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            content.innerHTML = `
              <h2>تخصيص صفحة الدردشة</h2>
              <div class="chat-page-settings">
                <div class="form-group">
                  <label for="chatLink">رابط صفحة الدردشة:</label>
                  <div class="input-group">
                    <input type="text" id="chatLink" value="${data.link}" readonly>
                    <button id="copyLinkBtn" class="submit-btn">نسخ الرابط</button>
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
                            <div class="color-picker-wrapper">
                              <label for="titleColor">لون نص العنوان:</label>
                              <input type="color" id="titleColor" name="titleColor" value="${data.titleColor || '#ffffff'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="headerColor">لون الهيدر:</label>
                              <input type="color" id="headerColor" name="headerColor" value="${data.colors.header}">
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
                            <div class="color-picker-wrapper">
                              <label for="chatAreaBackgroundColor">لون خلفية مربع الدردشة:</label>
                              <input type="color" id="chatAreaBackgroundColor" name="chatAreaBackgroundColor" value="${data.colors.chatAreaBackground || '#ffffff'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="textColor">لون النص العام:</label>
                              <input type="color" id="textColor" name="textColor" value="${data.colors.text}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="userMessageBackgroundColor">لون فقاعة المستخدم:</label>
                              <input type="color" id="userMessageBackgroundColor" name="userMessageBackgroundColor" value="${data.colors.userMessageBackground || '#007bff'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="userMessageTextColor">لون نص المستخدم:</label>
                              <input type="color" id="userMessageTextColor" name="userMessageTextColor" value="${data.colors.userMessageTextColor || '#ffffff'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="botMessageBackgroundColor">لون فقاعة البوت:</label>
                              <input type="color" id="botMessageBackgroundColor" name="botMessageBackgroundColor" value="${data.colors.botMessageBackground || '#e9ecef'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="botMessageTextColor">لون نص البوت:</label>
                              <input type="color" id="botMessageTextColor" name="botMessageTextColor" value="${data.colors.botMessageTextColor || '#000000'}">
                            </div>
                          </div>
                        </div>
                        <div class="section-with-settings">
                          <div id="previewSuggestedQuestions" class="suggested-questions" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};">
                            ${data.suggestedQuestions?.map(q => `<button class="suggested-question">${q}</button>`).join('') || ''}
                          </div>
                          <button class="settings-gear" data-target="suggested-questions-settings" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};" id="suggestedQuestionsGear">⚙️</button>
                          <div id="suggested-questions-settings" class="settings-popup" style="display: none;">
                            <div class="color-picker-wrapper">
                              <label for="buttonColor">لون الأزرار المقترحة:</label>
                              <input type="color" id="buttonColor" name="buttonColor" value="${data.colors.button}">
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
                            <div class="color-picker-wrapper">
                              <label for="backgroundColor">لون الخلفية:</label>
                              <input type="color" id="backgroundColor" name="backgroundColor" value="${data.colors.background}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="inputTextColor">لون نص مربع الإدخال:</label>
                              <input type="color" id="inputTextColor" name="inputTextColor" value="${data.colors.inputTextColor || '#333333'}">
                            </div>
                            <div class="color-picker-wrapper">
                              <label for="buttonColorInput">لون زر الإرسال:</label>
                              <input type="color" id="buttonColorInput" name="buttonColor" value="${data.colors.button}">
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="settings-section">
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

            function updatePreviewStyles() {
              previewChat.style.backgroundColor = document.getElementById('backgroundColor').value;
              previewChatHeader.style.backgroundColor = document.getElementById('headerColor').value;
              previewChatTitle.style.color = document.getElementById('titleColor').value;
              previewChatMessages.style.backgroundColor = document.getElementById('chatAreaBackgroundColor').value;
              previewChat.style.color = document.getElementById('textColor').value;
              previewSendMessageBtn.style.backgroundColor = document.getElementById('buttonColorInput').value;
              previewMessageInput.style.color = document.getElementById('inputTextColor').value;
              Array.from(previewSuggestedQuestions.children).forEach(btn => {
                btn.style.backgroundColor = document.getElementById('buttonColor').value;
              });
              userMessage.style.backgroundColor = document.getElementById('userMessageBackgroundColor').value;
              userMessage.style.color = document.getElementById('userMessageTextColor').value;
              botMessage.style.backgroundColor = document.getElementById('botMessageBackgroundColor').value;
              botMessage.style.color = document.getElementById('botMessageTextColor').value;
            }

            // Handle gear buttons to show/hide settings popups
            document.querySelectorAll('.settings-gear').forEach(gear => {
              gear.addEventListener('click', () => {
                const targetId = gear.getAttribute('data-target');
                const popup = document.getElementById(targetId);
                const isVisible = popup.style.display === 'block';
                // Hide all popups first
                document.querySelectorAll('.settings-popup').forEach(p => p.style.display = 'none');
                // Toggle the clicked popup
                popup.style.display = isVisible ? 'none' : 'block';
              });
            });

            // Add event listeners for real-time preview updates
            document.getElementById('titleColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('headerColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('backgroundColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('chatAreaBackgroundColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('textColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('buttonColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('buttonColorInput').addEventListener('input', updatePreviewStyles);
            document.getElementById('userMessageBackgroundColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('userMessageTextColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('botMessageBackgroundColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('botMessageTextColor').addEventListener('input', updatePreviewStyles);
            document.getElementById('inputTextColor').addEventListener('input', updatePreviewStyles);

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
                btn.style.backgroundColor = document.getElementById('buttonColor').value;
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
              formData.set('titleColor', document.getElementById('titleColor').value);
              formData.set('colors', JSON.stringify({
                header: document.getElementById('headerColor').value,
                background: document.getElementById('backgroundColor').value,
                chatAreaBackground: document.getElementById('chatAreaBackgroundColor').value,
                text: document.getElementById('textColor').value,
                button: document.getElementById('buttonColor').value || document.getElementById('buttonColorInput').value,
                userMessageBackground: document.getElementById('userMessageBackgroundColor').value,
                userMessageTextColor: document.getElementById('userMessageTextColor').value,
                botMessageBackground: document.getElementById('botMessageBackgroundColor').value,
                botMessageTextColor: document.getElementById('botMessageTextColor').value,
                inputTextColor: document.getElementById('inputTextColor').value,
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
                  throw new Error(`فشل في حفظ الإعدادات: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                if (result.logoUrl) {
                  document.querySelector('.logo-preview-container p').innerHTML = `الشعار الحالي: <img src="${result.logoUrl}" alt="Logo Preview" class="logo-preview-img" />`;
                  logoPreview.src = result.logoUrl;
                  logoPreview.style.display = 'block';
                  previewChatLogo.src = result.logoUrl;
                  previewChatLogo.style.display = 'block';
                }
                alert('تم حفظ الإعدادات بنجاح!');
              } catch (err) {
                console.error('خطأ في حفظ الإعدادات:', err);
                alert('فشل في حفظ الإعدادات، حاول مرة أخرى');
              }
            });

            // Initial preview update
            updatePreviewStyles();
          } else {
            createChatPageBtn.style.display = 'block';
          }
        } catch (err) {
          console.error('خطأ في جلب صفحة الدردشة:', err);
          createChatPageBtn.style.display = 'block';
        }
      }
    });
  } else {
    console.error('botId select element not found in DOM');
  }

  if (createChatPageBtn) {
    createChatPageBtn.addEventListener('click', async () => {
      const selectedBotId = botIdSelect.value;
      if (!selectedBotId) {
        alert('يرجى اختيار بوت أولاً');
        return;
      }

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

        const data = await response.json();
        content.innerHTML = `
          <h2>تخصيص صفحة الدردشة</h2>
          <div class="chat-page-settings">
            <div class="form-group">
              <label for="chatLink">رابط صفحة الدردشة:</label>
              <div class="input-group">
                <input type="text" id="chatLink" value="${data.link}" readonly>
                <button id="copyLinkBtn" class="submit-btn">نسخ الرابط</button>
              </div>
            </div>
            <div class="preview-settings-container">
              <div class="preview-section">
                <h3>معاينة صفحة الدردشة</h3>
                <div class="chat-preview-container">
                  <div id="previewChat" class="chat-container">
                    <div class="section-with-settings">
                      <div id="previewChatHeader" class="chat-header">
                        <img id="previewChatLogo" class="chat-logo" style="display: none;" alt="Logo">
                        <h1 id="previewChatTitle" class="chat-title">صفحة دردشة</h1>
                      </div>
                      <button class="settings-gear" data-target="header-settings">⚙️</button>
                      <div id="header-settings" class="settings-popup" style="display: none;">
                        <div class="color-picker-wrapper">
                          <label for="titleColor">لون نص العنوان:</label>
                          <input type="color" id="titleColor" name="titleColor" value="#ffffff">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="headerColor">لون الهيدر:</label>
                          <input type="color" id="headerColor" name="headerColor" value="#007bff">
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
                        <div class="color-picker-wrapper">
                          <label for="chatAreaBackgroundColor">لون خلفية مربع الدردشة:</label>
                          <input type="color" id="chatAreaBackgroundColor" name="chatAreaBackgroundColor" value="#ffffff">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="textColor">لون النص العام:</label>
                          <input type="color" id="textColor" name="textColor" value="#333333">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="userMessageBackgroundColor">لون فقاعة المستخدم:</label>
                          <input type="color" id="userMessageBackgroundColor" name="userMessageBackgroundColor" value="#007bff">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="userMessageTextColor">لون نص المستخدم:</label>
                          <input type="color" id="userMessageTextColor" name="userMessageTextColor" value="#ffffff">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="botMessageBackgroundColor">لون فقاعة البوت:</label>
                          <input type="color" id="botMessageBackgroundColor" name="botMessageBackgroundColor" value="#e9ecef">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="botMessageTextColor">لون نص البوت:</label>
                          <input type="color" id="botMessageTextColor" name="botMessageTextColor" value="#000000">
                        </div>
                      </div>
                    </div>
                    <div class="section-with-settings">
                      <div id="previewSuggestedQuestions" class="suggested-questions" style="display: none;"></div>
                      <button class="settings-gear" data-target="suggested-questions-settings" style="display: none;" id="suggestedQuestionsGear">⚙️</button>
                      <div id="suggested-questions-settings" class="settings-popup" style="display: none;">
                        <div class="color-picker-wrapper">
                          <label for="buttonColor">لون الأزرار المقترحة:</label>
                          <input type="color" id="buttonColor" name="buttonColor" value="#007bff">
                        </div>
                      </div>
                    </div>
                    <div class="section-with-settings">
                      <div class="chat-input">
                        <input type="text" id="previewMessageInput" placeholder="اكتب رسالتك...">
                        <input type="file" id="previewImageInput" accept="image/*" style="display: none;">
                        <button id="previewSendMessageBtn">إرسال</button>
                      </div>
                      <button class="settings-gear" data-target="input-settings">⚙️</button>
                      <div id="input-settings" class="settings-popup" style="display: none;">
                        <div class="color-picker-wrapper">
                          <label for="backgroundColor">لون الخلفية:</label>
                          <input type="color" id="backgroundColor" name="backgroundColor" value="#f8f9fa">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="inputTextColor">لون نص مربع الإدخال:</label>
                          <input type="color" id="inputTextColor" name="inputTextColor" value="#333333">
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="buttonColorInput">لون زر الإرسال:</label>
                          <input type="color" id="buttonColorInput" name="buttonColor" value="#007bff">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-section">
                <form id="customizationForm" class="settings-group" enctype="multipart/form-data">
                  <div class="form-group">
                    <label for="title">عنوان الصفحة:</label>
                    <input type="text" id="title" name="title" value="صفحة دردشة" required placeholder="أدخل عنوان الصفحة">
                  </div>
                  <div class="form-group logo-section">
                    <label for="logo">شعار الصفحة (PNG):</label>
                    <input type="file" id="logo" name="logo" accept="image/png">
                    <div class="logo-preview-container">
                      <p style="font-size: 0.8em; margin-bottom: 5px;">يفضل شعار بدون خلفية أو بنفس خلفية الهيدر</p>
                    </div>
                    <img id="logoPreview" class="logo-preview-img" style="display: none;" alt="Logo Preview" />
                  </div>
                  <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" id="suggestedQuestionsEnabled" name="suggestedQuestionsEnabled">
                      تفعيل الأسئلة المقترحة
                    </label>
                    <div id="suggestedQuestionsContainer" class="suggested-questions-container" style="display: none;">
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
                      <input type="checkbox" id="imageUploadEnabled" name="imageUploadEnabled">
                      تفعيل إرفاق الصور
                    </label>
                  </div>
                  <button type="submit" class="submit-btn">حفظ الإعدادات</button>
                </form>
              </div>
            </div>
          </div>
        `;

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

        function updatePreviewStyles() {
          previewChat.style.backgroundColor = document.getElementById('backgroundColor').value;
          previewChatHeader.style.backgroundColor = document.getElementById('headerColor').value;
          previewChatTitle.style.color = document.getElementById('titleColor').value;
          previewChatMessages.style.backgroundColor = document.getElementById('chatAreaBackgroundColor').value;
          previewChat.style.color = document.getElementById('textColor').value;
          previewSendMessageBtn.style.backgroundColor = document.getElementById('buttonColorInput').value;
          previewMessageInput.style.color = document.getElementById('inputTextColor').value;
          Array.from(previewSuggestedQuestions.children).forEach(btn => {
            btn.style.backgroundColor = document.getElementById('buttonColor').value;
          });
          userMessage.style.backgroundColor = document.getElementById('userMessageBackgroundColor').value;
          userMessage.style.color = document.getElementById('userMessageTextColor').value;
          botMessage.style.backgroundColor = document.getElementById('botMessageBackgroundColor').value;
          botMessage.style.color = document.getElementById('botMessageTextColor').value;
        }

        document.querySelectorAll('.settings-gear').forEach(gear => {
          gear.addEventListener('click', () => {
            const targetId = gear.getAttribute('data-target');
            const popup = document.getElementById(targetId);
            const isVisible = popup.style.display === 'block';
            document.querySelectorAll('.settings-popup').forEach(p => p.style.display = 'none');
            popup.style.display = isVisible ? 'none' : 'block';
          });
        });

        document.getElementById('titleColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('headerColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('backgroundColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('chatAreaBackgroundColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('textColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('buttonColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('buttonColorInput').addEventListener('input', updatePreviewStyles);
        document.getElementById('userMessageBackgroundColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('userMessageTextColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('botMessageBackgroundColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('botMessageTextColor').addEventListener('input', updatePreviewStyles);
        document.getElementById('inputTextColor').addEventListener('input', updatePreviewStyles);

        document.getElementById('title').addEventListener('input', (e) => {
          previewChatTitle.textContent = e.target.value || 'صفحة الدردشة';
        });

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

        const suggestedQuestionsEnabledCheckbox = document.getElementById('suggestedQuestionsEnabled');
        const suggestedQuestionsContainer = document.getElementById('suggestedQuestionsContainer');
        const suggestedQuestionsGear = document.getElementById('suggestedQuestionsGear');
        suggestedQuestionsEnabledCheckbox.addEventListener('change', () => {
          suggestedQuestionsContainer.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
          previewSuggestedQuestions.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
          suggestedQuestionsGear.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
        });

        let questions = [];
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
            btn.style.backgroundColor = document.getElementById('buttonColor').value;
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

        document.getElementById('imageUploadEnabled').addEventListener('change', (e) => {
          previewImageInput.style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('customizationForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          formData.set('title', formData.get('title'));
          formData.set('titleColor', document.getElementById('titleColor').value);
          formData.set('colors', JSON.stringify({
            header: document.getElementById('headerColor').value,
            background: document.getElementById('backgroundColor').value,
            chatAreaBackground: document.getElementById('chatAreaBackgroundColor').value,
            text: document.getElementById('textColor').value,
            button: document.getElementById('buttonColor').value || document.getElementById('buttonColorInput').value,
            userMessageBackground: document.getElementById('userMessageBackgroundColor').value,
            userMessageTextColor: document.getElementById('userMessageTextColor').value,
            botMessageBackground: document.getElementById('botMessageBackgroundColor').value,
            botMessageTextColor: document.getElementById('botMessageTextColor').value,
            inputTextColor: document.getElementById('inputTextColor').value,
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
              throw new Error(`فشل في حفظ الإعدادات: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.logoUrl) {
              document.querySelector('.logo-preview-container p').innerHTML = `الشعار الحالي: <img src="${result.logoUrl}" alt="Logo Preview" class="logo-preview-img" />`;
              logoPreview.src = result.logoUrl;
              logoPreview.style.display = 'block';
              previewChatLogo.src = result.logoUrl;
              previewChatLogo.style.display = 'block';
            }
            alert('تم حفظ الإعدادات بنجاح!');
          } catch (err) {
            console.error('خطأ في حفظ الإعدادات:', err);
            alert('فشل في حفظ الإعدادات، حاول مرة أخرى');
          }
        });

        updatePreviewStyles();
      } catch (err) {
        console.error('خطأ في إنشاء صفحة الدردشة:', err);
        content.innerHTML = `
          <p style="color: red;">تعذر إنشاء صفحة الدردشة، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    });
  } else {
    console.error('createChatPageBtn not found in DOM');
  }
}
