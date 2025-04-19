async function loadChatPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  content.innerHTML = `
    <h2>تخصيص صفحة الدردشة</h2>
    <div id="chatPageContent">
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
    <button id="createChatPageBtn" disabled>إنشاء صفحة دردشة</button>
  `;

  chatPageContent.innerHTML = html;

  const botIdSelect = document.getElementById('botId');
  const createChatPageBtn = document.getElementById('createChatPageBtn');

  if (botIdSelect) {
    botIdSelect.addEventListener('change', async () => {
      const selectedBotId = botIdSelect.value;
      createChatPageBtn.disabled = !selectedBotId;
      console.log(`Selected bot ID: ${selectedBotId}`);

      if (selectedBotId) {
        try {
          const response = await fetch(`/api/chat-page/bot/${selectedBotId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            // Display existing chat page settings
            content.innerHTML = `
              <h2>تخصيص صفحة الدردشة</h2>
              <div class="chat-page-settings">
                <div class="form-group">
                  <label for="chatLink">رابط صفحة الدردشة:</label>
                  <input type="text" id="chatLink" value="${data.link}" readonly>
                  <button id="copyLinkBtn">نسخ الرابط</button>
                </div>
                <form id="customizationForm" enctype="multipart/form-data">
                  <div class="form-group">
                    <label for="title">عنوان الصفحة:</label>
                    <input type="text" id="title" name="title" value="${data.title}" required>
                  </div>
                  <div class="form-group">
                    <label for="titleColor">لون نص العنوان:</label>
                    <input type="color" id="titleColor" name="titleColor" value="${data.titleColor || '#ffffff'}">
                  </div>
                  <div class="form-group">
                    <h3>إعدادات الألوان:</h3>
                    <label for="headerColor">لون الهيدر:</label>
                    <input type="color" id="headerColor" name="headerColor" value="${data.colors.header}">
                    <label for="backgroundColor">لون الخلفية:</label>
                    <input type="color" id="backgroundColor" name="backgroundColor" value="${data.colors.background}">
                    <label for="textColor">لون النص:</label>
                    <input type="color" id="textColor" name="textColor" value="${data.colors.text}">
                    <label for="buttonColor">لون الأزرار:</label>
                    <input type="color" id="buttonColor" name="buttonColor" value="${data.colors.button}">
                  </div>
                  <div class="form-group">
                    <label for="logo">شعار الصفحة (PNG):</label>
                    <input type="file" id="logo" name="logo" accept="image/png">
                    <p style="font-size: 0.8em;">الشعار الحالي: ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo Preview" style="max-width: 100px;" />` : 'لا يوجد'}</p>
                    <img id="logoPreview" style="max-width: 100px; display: none;" alt="Logo Preview" />
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="suggestedQuestionsEnabled" name="suggestedQuestionsEnabled" ${data.suggestedQuestionsEnabled ? 'checked' : ''}>
                      تفعيل الأسئلة المقترحة
                    </label>
                    <div id="suggestedQuestionsContainer" style="display: ${data.suggestedQuestionsEnabled ? 'block' : 'none'};">
                      <h3>إدارة الأسئلة المقترحة</h3>
                      <input type="text" id="newQuestion" placeholder="أدخل سؤالًا جديدًا">
                      <button type="button" id="addQuestionBtn">إضافة سؤال</button>
                      <ul id="questionsList"></ul>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="imageUploadEnabled" name="imageUploadEnabled" ${data.imageUploadEnabled ? 'checked' : ''}>
                      تفعيل إرفاق الصور
                    </label>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="darkModeEnabled" name="darkModeEnabled" ${data.darkModeEnabled ? 'checked' : ''}>
                      تفعيل الوضع الليلي
                    </label>
                  </div>
                  <button type="submit" class="submit-btn">حفظ الإعدادات</button>
                </form>
                <p style="font-size: 0.8em;">جميع الحقوق محفوظة © ghazal bost</p>
              </div>
            `;

            // Add logo preview on file selection
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
                  <button type="button" onclick="editQuestion(${index})">تعديل</button>
                  <button type="button" onclick="deleteQuestion(${index})">حذف</button>
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
                // Update logo preview if a new logo was uploaded
                if (result.logoUrl) {
                  document.querySelector('p[style="font-size: 0.8em;"]').innerHTML = `الشعار الحالي: <img src="${result.logoUrl}" alt="Logo Preview" style="max-width: 100px;" />`;
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
            // No chat page exists, allow creation
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
              <input type="text" id="chatLink" value="${data.link}" readonly>
              <button id="copyLinkBtn">نسخ الرابط</button>
            </div>
            <form id="customizationForm" enctype="multipart/form-data">
              <div class="form-group">
                <label for="title">عنوان الصفحة:</label>
                <input type="text" id="title" name="title" value="صفحة دردشة" required>
              </div>
              <div class="form-group">
                <label for="titleColor">لون نص العنوان:</label>
                <input type="color" id="titleColor" name="titleColor" value="#ffffff">
              </div>
              <div class="form-group">
                <h3>إعدادات الألوان:</h3>
                <label for="headerColor">لون الهيدر:</label>
                <input type="color" id="headerColor" name="headerColor" value="#007bff">
                <label for="backgroundColor">لون الخلفية:</label>
                <input type="color" id="backgroundColor" name="backgroundColor" value="#f8f9fa">
                <label for="textColor">لون النص:</label>
                <input type="color" id="textColor" name="textColor" value="#333333">
                <label for="buttonColor">لون الأزرار:</label>
                <input type="color" id="buttonColor" name="buttonColor" value="#007bff">
              </div>
              <div class="form-group">
                <label for="logo">شعار الصفحة (PNG):</label>
                <input type="file" id="logo" name="logo" accept="image/png">
                <p style="font-size: 0.8em;">يفضل شعار بدون خلفية أو بنفس خلفية الهيدر</p>
                <img id="logoPreview" style="max-width: 100px; display: none;" alt="Logo Preview" />
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="suggestedQuestionsEnabled" name="suggestedQuestionsEnabled">
                  تفعيل الأسئلة المقترحة
                </label>
                <div id="suggestedQuestionsContainer" style="display: none;">
                  <h3>إدارة الأسئلة المقترحة</h3>
                  <input type="text" id="newQuestion" placeholder="أدخل سؤالًا جديدًا">
                  <button type="button" id="addQuestionBtn">إضافة سؤال</button>
                  <ul id="questionsList"></ul>
                </div>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="imageUploadEnabled" name="imageUploadEnabled">
                  تفعيل إرفاق الصور
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="darkModeEnabled" name="darkModeEnabled">
                  تفعيل الوضع الليلي
                </label>
              </div>
              <button type="submit" class="submit-btn">حفظ الإعدادات</button>
            </form>
            <p style="font-size: 0.8em;">جميع الحقوق محفوظة © ghazal bost</p>
          </div>
        `;

        // Add logo preview on file selection
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
              <button type="button" onclick="editQuestion(${index})">تعديل</button>
              <button type="button" onclick="deleteQuestion(${index})">حذف</button>
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
            // Update logo preview if a new logo was uploaded
            if (result.logoUrl) {
              document.querySelector('p[style="font-size: 0.8em;"]').innerHTML = `الشعار الحالي: <img src="${result.logoUrl}" alt="Logo Preview" style="max-width: 100px;" />`;
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
