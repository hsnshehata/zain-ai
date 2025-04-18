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
      createChatPageBtn.style.display = selectedBotId ? 'block' : 'none'; // Show button only if a bot is selected
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
                <form id="customizationForm" class="settings-group" enctype="multipart/form-data">
                  <div class="form-group">
                    <label for="title">عنوان الصفحة:</label>
                    <input type="text" id="title" name="title" value="${data.title}" required placeholder="أدخل عنوان الصفحة">
                  </div>
                  <div class="form-group color-picker-section">
                    <label for="titleColor">لون نص العنوان:</label>
                    <div class="color-picker-wrapper">
                      <input type="color" id="titleColor" name="titleColor" value="${data.titleColor || '#ffffff'}">
                    </div>
                  </div>
                  <div class="form-group color-picker-section">
                    <h3>إعدادات الألوان:</h3>
                    <div class="color-picker-wrapper">
                      <label for="headerColor">لون الهيدر:</label>
                      <input type="color" id="headerColor" name="headerColor" value="${data.colors.header}">
                    </div>
                    <div class="color-picker-wrapper">
                      <label for="backgroundColor">لون الخلفية:</label>
                      <input type="color" id="backgroundColor" name="backgroundColor" value="${data.colors.background}">
                    </div>
                    <div class="color-picker-wrapper">
                      <label for="textColor">لون النص:</label>
                      <input type="color" id="textColor" name="textColor" value="${data.colors.text}">
                    </div>
                    <div class="color-picker-wrapper">
                      <label for="buttonColor">لون الأزرار:</label>
                      <input type="color" id="buttonColor" name="buttonColor" value="${data.colors.button}">
                    </div>
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
                      <input type="checkbox" id="darkModeEnabled" name="darkModeEnabled" ${data.darkModeEnabled ? 'checked' : ''}>
                      تفعيل الوضع الليلي
                    </label>
                  </div>
                  <button type="submit" class="submit-btn">حفظ الإعدادات</button>
                </form>
                <p style="font-size: 0.8em;">جميع الحقوق محفوظة © ghazal bost</p>
              </div>
            `;

            const darkModeEnabledCheckbox = document.getElementById('darkModeEnabled');
            if (darkModeEnabledCheckbox) {
              document.body.classList.toggle('light', !data.darkModeEnabled);
              darkModeEnabledCheckbox.addEventListener('change', () => {
                document.body.classList.toggle('light', !darkModeEnabledCheckbox.checked);
              });
            }

            const logoInput = document.getElementById('logo');
            const logoPreview = document.getElementById('logoPreview');
            logoInput.addEventListener('change', () => {
              const file = logoInput.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  logoPreview.src = e.target.result;
                  logoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
              } else {
                logoPreview.style.display = 'none';
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
            suggestedQuestionsEnabledCheckbox.addEventListener('change', () => {
              suggestedQuestionsContainer.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
            });

            let questions = data.suggestedQuestions || [];
            document.getElementById('addQuestionBtn').addEventListener('click', () => {
              const newQuestionInput = document.getElementById('newQuestion');
              const question = newQuestionInput.value.trim();
              if (question) {
                questions.push(question);
                newQuestionInput.value = '';
                updateQuestionsList();
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

            window.editQuestion = (index) => {
              const newQuestion = prompt('أدخل السؤال الجديد:', questions[index]);
              if (newQuestion && newQuestion.trim()) {
                questions[index] = newQuestion.trim();
                updateQuestionsList();
              }
            };

            window.deleteQuestion = (index) => {
              if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                questions.splice(index, 1);
                updateQuestionsList();
              }
            };

            updateQuestionsList();

            document.getElementById('customizationForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              formData.set('title', formData.get('title'));
              formData.set('titleColor', formData.get('titleColor'));
              formData.set('colors', JSON.stringify({
                header: formData.get('headerColor'),
                background: formData.get('backgroundColor'),
                text: formData.get('textColor'),
                button: formData.get('buttonColor'),
              }));
              formData.set('suggestedQuestionsEnabled', formData.get('suggestedQuestionsEnabled') === 'on' ? 'true' : 'false');
              formData.set('suggestedQuestions', JSON.stringify(questions));
              formData.set('imageUploadEnabled', formData.get('imageUploadEnabled') === 'on' ? 'true' : 'false');
              formData.set('darkModeEnabled', formData.get('darkModeEnabled') === 'on' ? 'true' : 'false');

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
                }
                alert('تم حفظ الإعدادات بنجاح!');
              } catch (err) {
                console.error('خطأ في حفظ الإعدادات:', err);
                alert('فشل في حفظ الإعدادات، حاول مرة أخرى');
              }
            });
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
            <form id="customizationForm" class="settings-group" enctype="multipart/form-data">
              <div class="form-group">
                <label for="title">عنوان الصفحة:</label>
                <input type="text" id="title" name="title" value="صفحة دردشة" required placeholder="أدخل عنوان الصفحة">
              </div>
              <div class="form-group color-picker-section">
                <label for="titleColor">لون نص العنوان:</label>
                <div class="color-picker-wrapper">
                  <input type="color" id="titleColor" name="titleColor" value="#ffffff">
                </div>
              </div>
              <div class="form-group color-picker-section">
                <h3>إعدادات الألوان:</h3>
                <div class="color-picker-wrapper">
                  <label for="headerColor">لون الهيدر:</label>
                  <input type="color" id="headerColor" name="headerColor" value="#007bff">
                </div>
                <div class="color-picker-wrapper">
                  <label for="backgroundColor">لون الخلفية:</label>
                  <input type="color" id="backgroundColor" name="backgroundColor" value="#f8f9fa">
                </div>
                <div class="color-picker-wrapper">
                  <label for="textColor">لون النص:</label>
                  <input type="color" id="textColor" name="textColor" value="#333333">
                </div>
                <div class="color-picker-wrapper">
                  <label for="buttonColor">لون الأزرار:</label>
                  <input type="color" id="buttonColor" name="buttonColor" value="#007bff">
                </div>
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
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="darkModeEnabled" name="darkModeEnabled">
                  تفعيل الوضع الليلي
                </label>
              </div>
              <button type="submit" class="submit-btn">حفظ الإعدادات</button>
            </form>
            <p style="font-size: 0.8em;">جميع الحقوق محفوظة © ghazal bost</p>
          </div>
        `;

        const darkModeEnabledCheckbox = document.getElementById('darkModeEnabled');
        if (darkModeEnabledCheckbox) {
          document.body.classList.toggle('light', !darkModeEnabledCheckbox.checked);
          darkModeEnabledCheckbox.addEventListener('change', () => {
            document.body.classList.toggle('light', !darkModeEnabledCheckbox.checked);
          });
        }

        const logoInput = document.getElementById('logo');
        const logoPreview = document.getElementById('logoPreview');
        logoInput.addEventListener('change', () => {
          const file = logoInput.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              logoPreview.src = e.target.result;
              logoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
          } else {
            logoPreview.style.display = 'none';
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
        suggestedQuestionsEnabledCheckbox.addEventListener('change', () => {
          suggestedQuestionsContainer.style.display = suggestedQuestionsEnabledCheckbox.checked ? 'block' : 'none';
        });

        let questions = [];
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
          const newQuestionInput = document.getElementById('newQuestion');
          const question = newQuestionInput.value.trim();
          if (question) {
            questions.push(question);
            newQuestionInput.value = '';
            updateQuestionsList();
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

        window.editQuestion = (index) => {
          const newQuestion = prompt('أدخل السؤال الجديد:', questions[index]);
          if (newQuestion && newQuestion.trim()) {
            questions[index] = newQuestion.trim();
            updateQuestionsList();
          }
        };

        window.deleteQuestion = (index) => {
          if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            questions.splice(index, 1);
            updateQuestionsList();
          }
        };

        document.getElementById('customizationForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          formData.set('title', formData.get('title'));
          formData.set('titleColor', formData.get('titleColor'));
          formData.set('colors', JSON.stringify({
            header: formData.get('headerColor'),
            background: formData.get('backgroundColor'),
            text: formData.get('textColor'),
            button: formData.get('buttonColor'),
          }));
          formData.set('suggestedQuestionsEnabled', formData.get('suggestedQuestionsEnabled') === 'on' ? 'true' : 'false');
          formData.set('suggestedQuestions', JSON.stringify(questions));
          formData.set('imageUploadEnabled', formData.get('imageUploadEnabled') === 'on' ? 'true' : 'false');
          formData.set('darkModeEnabled', formData.get('darkModeEnabled') === 'on' ? 'true' : 'false');

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
            }
            alert('تم حفظ الإعدادات بنجاح!');
          } catch (err) {
            console.error('خطأ في حفظ الإعدادات:', err);
            alert('فشل في حفظ الإعدادات، حاول مرة أخرى');
          }
        });
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
