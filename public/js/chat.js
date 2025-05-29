// public/js/chat.js
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
  let messageCounter = 0;
  let lastFeedbackButtons = null;

  // دالة لتوليد معرّف فريد باستخدام Fingerprint2
  async function generateUniqueId() {
    return new Promise((resolve) => {
      if (window.Fingerprint2) {
        setTimeout(() => {
          Fingerprint2.get((components) => {
            const values = components.map(component => component.value);
            const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
            console.log(`📋 Generated fingerprint: ${fingerprint}`);
            resolve(fingerprint);
          });
        }, 500); // نستنى 500ms عشان نضمن إن المتصفّح جاهز
      } else {
        console.warn('Fingerprint2 غير متوفّر، بستخدم fallback لتوليد UUID');
        resolve(`${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);
      }
    });
  }

  // جلب أو توليد userId
  let userId = localStorage.getItem('webUserId');
  if (!userId || !userId.startsWith('web_')) {
    const fingerprint = await generateUniqueId();
    userId = `web_${fingerprint}`;
    localStorage.setItem('webUserId', userId);
    console.log(`📋 تم توليد userId جديد وتخزينه في localStorage: ${userId}`);
  } else {
    console.log(`📋 جلب userId من localStorage: ${userId}`);
  }

  try {
    const response = await window.handleApiRequest(`/api/chat-page/${linkId}`);
    if (!response) {
      throw new Error('فشل في جلب إعدادات الصفحة');
    }
    settings = response;
    botId = settings.botId;

    console.log('🔍 Settings loaded:', settings);
    console.log('🎨 Title color:', settings.titleColor);

    chatTitle.textContent = settings.title || 'صفحة الدردشة';
    if (settings.logoUrl) {
      chatLogo.src = settings.logoUrl;
      chatLogo.style.display = 'block';
    } else {
      chatLogo.style.display = 'none';
    }

    if (settings.headerHidden) {
      chatHeader.style.display = 'none';
    }

    customStyles.textContent = `
      body {
        background-color: ${settings?.colors?.outerBackgroundColor || '#000000'};
      }
      .chat-container {
        background-color: ${settings?.colors?.containerBackgroundColor || '#ffffff'};
      }
      #chatHeader {
        background-color: ${settings?.colors?.header || '#2D3436'};
      }
      #chatTitle {
        color: ${settings?.colors?.titleColor || '#ffffff'};
      }
      #chatMessages {
        background-color: ${settings?.colors?.chatAreaBackground || '#3B4A4E'};
      }
      #sendMessageBtn {
        background-color: ${settings?.colors?.sendButtonColor || '#6AB04C'};
      }
      .suggested-question {
        background-color: ${settings?.colors?.button || '#6AB04C'};
        color: #ffffff;
      }
      .user-message {
        background-color: ${settings?.colors?.userMessageBackground || '#6AB04C'};
        color: ${settings?.colors?.userMessageTextColor || '#ffffff'};
      }
      .bot-message {
        background-color: ${settings?.colors?.botMessageBackground || '#2D3436'};
        color: ${settings?.colors?.botMessageTextColor || '#ffffff'};
      }
      .chat-input {
        background-color: ${settings?.colors?.containerBackgroundColor || '#ffffff'};
      }
      #messageInput {
        color: ${settings?.colors?.inputTextColor || '#ffffff'};
      }
      #imageInputBtn {
        background-color: ${settings?.colors?.sendButtonColor || '#6AB04C'};
      }
      .feedback-buttons {
        margin-top: 5px;
        display: flex;
        gap: 10px;
      }
      .feedback-btn {
        background: none;
        border: none;
        font-size: 1.2em;
        cursor: pointer;
      }
      .link-button {
        display: inline-block;
        background-color: #6AB04C;
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 4px;
        text-decoration: none;
        margin: 5px 0;
      }
      .link-button i {
        margin-left: 5px;
      }
    `;

    if (settings.suggestedQuestionsEnabled && settings.suggestedQuestions?.length > 1) {
      suggestedQuestions.style.display = 'block';
      
      const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      let questions = shuffleArray([...settings.suggestedQuestions]);
      let currentIndex = 0;

      const displayNextQuestion = () => {
        suggestedQuestions.innerHTML = '';
        if (questions.length === 0) return;

        const question = questions[currentIndex];
        const button = document.createElement('button');
        button.className = 'suggested-question';
        button.style.textAlign = 'center';
        button.style.margin = '0 auto';
        button.style.display = 'block';
        button.textContent = question;
        button.addEventListener('click', () => sendMessage(question));
        suggestedQuestions.appendChild(button);

        currentIndex = (currentIndex + 1) % questions.length;
      };

      displayNextQuestion();
      setInterval(displayNextQuestion, 3000);
    } else {
      suggestedQuestions.style.display = 'none';
    }

    if (settings.imageUploadEnabled) {
      imageInput.parentElement.style.display = 'block';
    } else {
      imageInput.parentElement.style.display = 'none';
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
      const response = await window.handleApiRequest('/api/upload', {
        method: 'POST',
        body: formData,
      });

      return response;
    } catch (err) {
      console.error('خطأ في رفع الصورة:', err);
      throw err;
    }
  }

  async function submitFeedback(messageId, messageContent, feedback) {
    try {
      const type = feedback === 'positive' ? 'like' : 'dislike';

      await window.handleApiRequest('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          userId,
          messageId,
          type,
          messageContent,
        }),
      });

      console.log(`✅ Feedback submitted: ${type} for message ID: ${messageId}`);
      alert(`تم تسجيل التقييم بنجاح: ${type === 'like' ? 'لايك' : 'ديسلايك'}`);
    } catch (err) {
      console.error('خطأ في إرسال التقييم:', err);
      alert('فشل في تسجيل التقييم، حاول مرة أخرى.');
    }
  }

  function hidePreviousFeedbackButtons() {
    if (lastFeedbackButtons) {
      lastFeedbackButtons.style.display = 'none';
      lastFeedbackButtons = null;
    }
  }

  function convertLinksToButtons(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" class="link-button">اضغط هنا <i class="fas fa-external-link-alt"></i></a>`;
    });
  }

  async function sendMessage(message, isImage = false, imageData = null) {
    if (!message && !isImage) return;

    hidePreviousFeedbackButtons();

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    if (isImage && imageData) {
      const img = document.createElement('img');
      img.src = imageData.thumbUrl;
      img.style.maxWidth = '100px';
      img.style.borderRadius = '8px';
      userMessageDiv.appendChild(img);
    } else {
      userMessageDiv.appendChild(document.createTextNode(message));
    }
    chatMessages.appendChild(userMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      console.log(`📤 Sending message with userId: ${userId}, botId: ${botId}`);
      const response = await window.handleApiRequest('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          userId,
          message: isImage ? imageData.imageUrl : message,
          isImage,
          channel: 'web'
        }),
      });

      const messageId = `msg_${messageCounter++}`;
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.setAttribute('data-message-id', messageId);

      const replyHtml = convertLinksToButtons(response.reply || 'رد البوت');
      botMessageDiv.innerHTML = replyHtml;

      const feedbackButtons = document.createElement('div');
      feedbackButtons.className = 'feedback-buttons';

      const goodBtn = document.createElement('button');
      goodBtn.className = 'feedback-btn good';
      goodBtn.setAttribute('data-message-id', messageId);
      goodBtn.setAttribute('data-message-content', response.reply || 'رد البوت');
      goodBtn.appendChild(document.createTextNode('👍'));

      const badBtn = document.createElement('button');
      badBtn.className = 'feedback-btn bad';
      badBtn.setAttribute('data-message-id', messageId);
      badBtn.setAttribute('data-message-content', response.reply || 'رد البوت');
      badBtn.appendChild(document.createTextNode('👎'));

      feedbackButtons.appendChild(goodBtn);
      feedbackButtons.appendChild(badBtn);
      botMessageDiv.appendChild(feedbackButtons);

      chatMessages.appendChild(botMessageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      lastFeedbackButtons = feedbackButtons;

      feedbackButtons.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const messageId = e.target.getAttribute('data-message-id');
          const messageContent = e.target.getAttribute('data-message-content');
          const feedback = e.target.classList.contains('good') ? 'positive' : 'negative';
          await submitFeedback(messageId, messageContent, feedback);
          feedbackButtons.style.display = 'none';
          lastFeedbackButtons = null;
        });
      });
    } catch (err) {
      console.error('خطأ في إرسال الرسالة:', err);
      const errorMessageDiv = document.createElement('div');
      errorMessageDiv.className = 'message bot-message';
      errorMessageDiv.appendChild(document.createTextNode('عذرًا، حدث خطأ أثناء معالجة رسالتك.'));
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
        errorMessageDiv.appendChild(document.createTextNode('عذرًا، حدث خطأ أثناء معالجة الصورة.'));
        chatMessages.appendChild(errorMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  });
});
