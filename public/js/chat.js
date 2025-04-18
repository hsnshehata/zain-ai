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
      .chat-container { background-color: ${settings.colors?.background || '#f8f9fa'}; color: ${settings.colors?.text || '#333333'}; }
      #chatHeader { background-color: ${settings.colors?.header || '#007bff'}; }
      #chatTitle { color: ${settings.titleColor || '#ffffff'}; }
      #sendMessageBtn, .suggested-question { background-color: ${settings.colors?.button || '#007bff'}; }
      ${settings.darkModeEnabled ? 'body { background-color: #333; color: #fff; }' : ''}
    `;

    // Show suggested questions if enabled
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

    // Show image upload if enabled
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

  async function sendMessage(message, isImage = false) {
    if (!message && !isImage) return;

    // Display user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.textContent = message || 'صورة مرفقة';
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
          message: isImage ? 'صورة مرفقة' : message,
          isImage,
        }),
      });

      if (!response.ok) {
        throw new Error(`فشل في إرسال الرسالة: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.textContent = data.reply || 'رد البوت';
      chatMessages.appendChild(botMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
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

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      sendMessage(null, true);
      imageInput.value = '';
    }
  });
});
