document.addEventListener('DOMContentLoaded', async () => {
  const linkId = window.location.pathname.split('/').pop();
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const imageInput = document.getElementById('imageInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const chatHeader = document.getElementById('chatHeader');
  const chatLogo = document.getElementById('chatLogo');
  const chatTitle = document.getElementById('chatTitle');
  const suggestedQuestions = document.getElementById('suggestedQuestions');
  const customStyles = document.getElementById('customStyles');

  let botId = '';
  let settings = {};
  let messageCounter = 0; // لتوليد معرفات فريدة للرسائل

  // Fetch chat page settings
  try {
    const response = await fetch(`/api/chat-page/${linkId}`);
    if (!response.ok) {
      throw new Error(`فشل في جلب إعدادات الصفحة: ${response.status} ${response.statusText}`);
    }
    settings = await response.json();
    botId = settings.botId;

    // Apply custom settings
    chatTitle.textContent = settings.title || 'صفحة الدردشة';
    if (settings.logoUrl) {
      chatLogo.src = settings.logoUrl;
      chatLogo.style.display = 'block';
    } else {
      chatLogo.style.display = 'none';
    }
    customStyles.textContent = `
      .chat-container { background-color: ${settings?.colors?.background || '#f8f9fa'}; color: ${settings?.colors?.text || '#333333'}; }
      #chatHeader { background-color: ${settings?.colors?.header || '#007bff'}; }
      #chatTitle { color: ${settings?.titleColor || '#ffffff'}; }
      #chatMessages { background-color: ${settings?.colors?.chatAreaBackground || '#ffffff'}; }
      #sendMessageBtn { background-color: ${settings?.colors?.sendButtonColor || '#007bff'}; }
      .suggested-question { background-color: ${settings?.colors?.button || '#007bff'}; }
      .user-message { background-color: ${settings?.colors?.userMessageBackground || '#007bff'}; color: ${settings?.colors?.userMessageTextColor || '#ffffff'}; }
      .bot-message { background-color: ${settings?.colors?.botMessageBackground || '#e9ecef'}; color: ${settings?.colors?.botMessageTextColor || '#000000'}; }
      #messageInput { color: ${settings?.colors?.inputTextColor || '#333333'}; }
      #imageInput::file-selector-button { background-color: ${settings?.colors?.sendButtonColor || '#007bff'}; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
      #imageInput::file-selector-button:hover { background-color: ${settings?.colors?.sendButtonColor ? darkenColor(settings.colors.sendButtonColor, 10) : '#0056b3'}; transform: translateY(-2px); }
      .feedback-buttons { margin-top: 5px; }
      .feedback-btn { margin: 0 5px; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer; }
      .feedback-btn.good { background-color: #28a745; color: white; }
      .feedback-btn.bad { background-color: #dc3545; color: white; }
    `;

    function darkenColor(hex, percent) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      r = Math.floor(r * (100 - percent) / 100);
      g = Math.floor(g * (100 - percent) / 100);
      b = Math.floor(b * (100 - percent) / 100);
      r = r < 0 ? 0 : r;
      g = g < 0 ? 0 : g;
      b = b < 0 ? 0 : b;
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    if (settings.suggestedQuestionsEnabled && settings.suggestedQuestions?.length > 0) {
      suggestedQuestions.style.display = 'block';
      settings.suggestedQuestions.forEach(question => {
        const button = document.createElement('button');
        button.className = 'suggested-question';
        button.textContent = question;
        button.addEventListener('click', () => sendMessage(question));
        suggestedQuestions.appendChild(button);
      });
    } else {
      suggestedQuestions.style.display = 'none';
    }

    if (settings.imageUploadEnabled) {
      imageInput.style.display = 'block';
    } else {
      imageInput.style.display = 'none';
    }
  } catch (err) {
    console.error('خطأ في جلب إعدادات الصفحة:', err);
    chatMessages.innerHTML = '<p style="color: red;">تعذر تحميل الصفحة، حاول مرة أخرى لاحقًا.</p>';
    return;
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`فشل في رفع الصورة: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { imageUrl: data.imageUrl, thumbUrl: data.thumbUrl };
    } catch (err) {
      console.error('خطأ في رفع الصورة:', err);
      throw err;
    }
  }

  async function submitFeedback(messageId, messageContent, feedback) {
    try {
      const response = await fetch('/api/chat-page/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          userId: `web_${linkId}_${Date.now()}`, // معرف فريد للمستخدم في الشات
          messageId,
          feedback,
          messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`فشل في إرسال التقييم: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ Feedback submitted: ${feedback} for message ID: ${messageId}`);
    } catch (err) {
      console.error('خطأ في إرسال التقييم:', err);
    }
  }

  async function sendMessage(message, isImage = false, imageData = null) {
    if (!message && !isImage) return;

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    if (isImage && imageData) {
      const img = document.createElement('img');
      img.src = imageData.thumbUrl;
      img.style.maxWidth = '100px';
      img.style.borderRadius = '8px';
      userMessageDiv.appendChild(img);
    } else {
      userMessageDiv.textContent = message;
    }
    chatMessages.appendChild(userMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          message: isImage ? imageData.imageUrl : message,
          isImage,
        }),
      });

      if (!response.ok) {
        throw new Error(`فشل في إرسال الرسالة: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const messageId = `msg_${messageCounter++}`; // معرف فريد للرسالة
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.setAttribute('data-message-id', messageId);
      botMessageDiv.textContent = data.reply || 'رد البوت';

      // إضافة أزرار التقييم
      const feedbackButtons = document.createElement('div');
      feedbackButtons.className = 'feedback-buttons';
      feedbackButtons.innerHTML = `
        <button class="feedback-btn good" data-message-id="${messageId}" data-message-content="${data.reply || 'رد البوت'}">👍 إيجابي</button>
        <button class="feedback-btn bad" data-message-id="${messageId}" data-message-content="${data.reply || 'رد البوت'}">👎 سلبي</button>
      `;
      botMessageDiv.appendChild(feedbackButtons);

      chatMessages.appendChild(botMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // إضافة مستمعات الأحداث لأزرار التقييم
      feedbackButtons.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const messageId = e.target.getAttribute('data-message-id');
          const messageContent = e.target.getAttribute('data-message-content');
          const feedback = e.target.classList.contains('good') ? 'positive' : 'negative';
          await submitFeedback(messageId, messageContent, feedback);
          // تعطيل الأزرار بعد التقييم
          feedbackButtons.querySelectorAll('.feedback-btn').forEach(b => b.disabled = true);
        });
      });
    } catch (err) {
      console.error('خطأ في إرسال الرسالة:', err);
      const errorMessageDiv = document.createElement('div');
      errorMessageDiv.className = 'message bot-message';
      errorMessageDiv.textContent = 'عذرًا، حدث خطأ أثناء معالجة رسالتك.';
      chatMessages.appendChild(errorMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  sendMessageBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      sendMessage(message);
      messageInput.value = '';
    }
  });

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessageBtn.click();
    }
  });

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    if (file) {
      try {
        const imageData = await uploadImage(file);
        sendMessage(null, true, imageData);
        imageInput.value = '';
      } catch (err) {
        console.error('خطأ في معالجة الصورة:', err);
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.className = 'message bot-message';
        errorMessageDiv.textContent = 'عذرًا، حدث خطأ أثناء معالجة الصورة.';
        chatMessages.appendChild(errorMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  });
});
