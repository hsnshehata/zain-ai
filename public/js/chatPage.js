async function loadChatPage() {
  // Load the vanilla-picker library
  const pickerScript = document.createElement('script');
  pickerScript.src = '/js/vanilla-picker.min.js';
  document.head.appendChild(pickerScript);

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
    <div class="form-group bot-selector">
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
    <div id="chatPageSettings" class="chat-page-settings-content"></div>
  `;

  chatPageContent.innerHTML = html;

  const botIdSelect = document.getElementById('botId');
  const chatPageSettings = document.getElementById('chatPageSettings');

  if (botIdSelect) {
    // Function to load chat page settings based on selected bot
    async function loadChatPageSettings(selectedBotId) {
      if (!selectedBotId) {
        chatPageSettings.innerHTML = '';
        return;
      }

      try {
        const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          chatPageSettings.innerHTML = `
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
                          <span class="color-preview" id="titleColorPreview" data-color-id="titleColor" style="background-color: ${data.titleColor || '#ffffff'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="headerColor">لون الهيدر:</label>
                          <span class="color-preview" id="headerColorPreview" data-color-id="headerColor" style="background-color: ${data.colors.header};"></span>
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
                          <span class="color-preview" id="chatAreaBackgroundColorPreview" data-color-id="chatAreaBackgroundColor" style="background-color: ${data.colors.chatAreaBackground || '#ffffff'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="textColor">لون النص العام:</label>
                          <span class="color-preview" id="textColorPreview" data-color-id="textColor" style="background-color: ${data.colors.text};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="userMessageBackgroundColor">لون فقاعة المستخدم:</label>
                          <span class="color-preview" id="userMessageBackgroundColorPreview" data-color-id="userMessageBackgroundColor" style="background-color: ${data.colors.userMessageBackground || '#007bff'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="userMessageTextColor">لون نص المستخدم:</label>
                          <span class="color-preview" id="userMessageTextColorPreview" data-color-id="userMessageTextColor" style="background-color: ${data.colors.userMessageTextColor || '#ffffff'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="botMessageBackgroundColor">لون فقاعة البوت:</label>
                          <span class="color-preview" id="botMessageBackgroundColorPreview" data-color-id="botMessageBackgroundColor" style="background-color: ${data.colors.botMessageBackground || '#e9ecef'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="botMessageTextColor">لون نص البوت:</label>
                          <span class="color-preview" id="botMessageTextColorPreview" data-color-id="botMessageTextColor" style="background-color: ${data.colors.botMessageTextColor || '#000000'};"></span>
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
                          <span class="color-preview" id="buttonColorPreview" data-color-id="buttonColor" style="background-color: ${data.colors.button};"></span>
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
                          <span class="color-preview" id="backgroundColorPreview" data-color-id="backgroundColor" style="background-color: ${data.colors.background};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="inputTextColor">لون نص مربع الإدخال:</label>
                          <span class="color-preview" id="inputTextColorPreview" data-color-id="inputTextColor" style="background-color: ${data.colors.inputTextColor || '#333333'};"></span>
                        </div>
                        <div class="color-picker-wrapper">
                          <label for="buttonColorInput">لون زر الإرسال:</label>
                          <span class="color-preview" id="buttonColorInputPreview" data-color-id="buttonColorInput" style="background-color: ${data.colors.button};"></span>
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
          const colorValues = {
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
            buttonColorInput: data.colors.button,
          };

          function updatePreviewStyles() {
            previewChat.style.backgroundColor = colorValues.backgroundColor;
            previewChatHeader.style.backgroundColor = colorValues.headerColor;
            previewChatTitle.style.color = colorValues.titleColor;
            previewChatMessages.style.backgroundColor = colorValues.chatAreaBackgroundColor;
            previewChat.style.color = colorValues.textColor;
            previewSendMessageBtn.style.backgroundColor = colorValues.buttonColorInput;
            previewMessageInput.style.color = colorValues.inputTextColor;
            Array.from(previewSuggestedQuestions.children).forEach(btn => {
              btn.style.backgroundColor = colorValues.buttonColor;
            });
            userMessage.style.backgroundColor = colorValues.userMessageBackgroundColor;
            userMessage.style.color = colorValues.userMessageTextColor;
            botMessage.style.backgroundColor = colorValues.botMessageBackgroundColor;
            botMessage.style.color = colorValues.botMessageTextColor;

            // Update color previews
            document.getElementById('titleColorPreview').style.backgroundColor = colorValues.titleColor;
            document.getElementById('headerColorPreview').style.backgroundColor = colorValues.headerColor;
            document.getElementById('chatAreaBackgroundColorPreview').style.backgroundColor = colorValues.chatAreaBackgroundColor;
            document.getElementById('textColorPreview').style.backgroundColor = colorValues.textColor;
            document.getElementById('userMessageBackgroundColorPreview').style.backgroundColor = colorValues.userMessageBackgroundColor;
            document.getElementById('userMessageTextColorPreview').style.backgroundColor = colorValues.userMessageTextColor;
            document.getElementById('botMessageBackgroundColorPreview').style.backgroundColor = colorValues.botMessageBackgroundColor;
            document.getElementById('botMessageTextColorPreview').style.backgroundColor = colorValues.botMessageTextColor;
            document.getElementById('buttonColorPreview').style.backgroundColor = colorValues.buttonColor;
            document.getElementById('backgroundColorPreview').style.backgroundColor = colorValues.backgroundColor;
            document.getElementById('inputTextColorPreview').style.backgroundColor = colorValues.inputTextColor;
            document.getElementById('buttonColorInputPreview').style.backgroundColor = colorValues.buttonColorInput;
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

          // Wait for vanilla-picker to load before initializing color pickers
          pickerScript.onload = () => {
            if (!window.VanillaPicker) {
              console.error('Failed to load vanilla-picker: window.VanillaPicker is undefined');
              alert('تعذر تحميل مكتبة الألوان، تأكد من وجود ملف vanilla-picker.min.js في مجلد /js');
              return;
            }
            console.log('vanilla-picker loaded successfully');

            // Ensure DOM is fully rendered before attaching listeners
            setTimeout(() => {
              const colorPickers = {};

              const previews = document.querySelectorAll('.color-preview');
              console.log(`Found ${previews.length} color-preview elements`);
              previews.forEach(preview => {
                const colorId = preview.getAttribute('data-color-id');
                const initialColor = colorValues[colorId];
                console.log(`Initializing color picker for ${colorId} with initial color ${initialColor}`);

                // Create a container for the color picker
                const pickerContainer = document.createElement('div');
                pickerContainer.className = 'color-picker-container';
                pickerContainer.style.position = 'absolute';
                pickerContainer.style.zIndex = '1004';
                pickerContainer.style.display = 'none';
                preview.parentNode.appendChild(pickerContainer);
                console.log(`Created pickerContainer for ${colorId}`);

                // Initialize vanilla-picker
                try {
                  const colorPicker = new VanillaPicker({
                    parent: pickerContainer,
                    color: initialColor,
                    popup: 'top',
                    alpha: false,
                    onChange: (color) => {
                      const hex = color.hex.substring(0, 7); // Remove alpha if present
                      colorValues[colorId] = hex;
                      updatePreviewStyles();
                      console.log(`Color changed for ${colorId}: ${hex}`);
                    },
                  });

                  colorPickers[colorId] = { picker: colorPicker, container: pickerContainer };
                  console.log(`Color picker initialized for ${colorId}`);

                  // Show/hide color picker on click
                  preview.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log(`Color preview clicked: ${colorId}`);
                    const isVisible = pickerContainer.style.display === 'block';
                    // Hide all other pickers
                    Object.values(colorPickers).forEach(({ container }) => {
                      container.style.display = 'none';
                    });
                    // Toggle the clicked picker
                    if (!isVisible) {
                      pickerContainer.style.display = 'block';
                      const rect = preview.getBoundingClientRect();
                      const scrollY = window.scrollY || window.pageYOffset;
                      const scrollX = window.scrollX || window.pageXOffset;
                      const top = rect.bottom + scrollY + 5;
                      const left = Math.max(10, Math.min(rect.left + scrollX, window.innerWidth - 170));
                      pickerContainer.style.top = `${top}px`;
                      pickerContainer.style.left = `${left}px`;
                      console.log(`Showing picker for ${colorId} at top: ${top}px, left: ${left}px`);
                      colorPicker.openHandler(); // Open the picker
                    } else {
                      pickerContainer.style.display = 'none';
                      console.log(`Hiding picker for ${colorId}`);
                    }
                  });

                  // Hide picker when clicking outside
                  document.addEventListener('click', (event) => {
                    if (!pickerContainer.contains(event.target) && !preview.contains(event.target)) {
                      pickerContainer.style.display = 'none';
                      console.log(`Document click: Hiding picker for ${colorId}`);
                    }
                  }, { capture: true });
                } catch (err) {
                  console.error(`Failed to initialize color picker for ${colorId}:`, err);
                }
              });
            }, 0); // Ensure DOM is fully rendered
          };

          // Handle vanilla-picker load failure
          pickerScript.onerror = () => {
            console.error('Failed to load vanilla-picker from /js/vanilla-picker.min.js');
            alert('تعذر تحميل مكتبة الألوان، تأكد من وجود ملف vanilla-picker.min.js في مجلد /js');
          };

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
          // If no chat page exists for the selected bot, show the "Create Chat Page" button
          chatPageSettings.innerHTML = `
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
                loadChatPageSettings(selectedBotId);
              } catch (err) {
                console.error('خطأ في إنشاء صفحة الدردشة:', err);
                chatPageSettings.innerHTML = `
                  <p style="color: red;">تعذر إنشاء صفحة الدردشة، حاول مرة أخرى لاحقًا.</p>
                `;
              }
            });
          }
        }
      } catch (err) {
        console.error('خطأ في جلب صفحة الدردشة:', err);
        chatPageSettings.innerHTML = `
          <p style="color: red;">تعذر جلب صفحة الدردشة، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }

    // Automatically load settings for the first bot if available
    if (userBots.length > 0) {
      botIdSelect.value = userBots[0]._id;
      await loadChatPageSettings(userBots[0]._id);
    }

    // Add change event listener to reload settings when a different bot is selected
    botIdSelect.addEventListener('change', async () => {
      const selectedBotId = botIdSelect.value;
      await loadChatPageSettings(selectedBotId);
    });
  } else {
    console.error('botId select element not found in DOM');
  }
}
