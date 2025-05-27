// /public/js/chat.js
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

  // فحص تحميل Font Awesome
  const checkFontAwesome = () => {
    const testIcon = document.createElement('i');
    testIcon.className = 'fas fa-camera';
    document.body.appendChild(testIcon);
    const isLoaded = window.getComputedStyle(testIcon, ':before').getPropertyValue('content') !== 'none';
    document.body.removeChild(testIcon);
    return isLoaded;
  };

  // إذا لم يتم تحميل Font Awesome، أعد تحميله
  if (!checkFontAwesome()) {
    console.warn('Font Awesome لم يتحمل، جاري إعادة التحميل...');
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    fontAwesomeLink.integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2Lw==';
    fontAwesomeLink.crossOrigin = 'anonymous';
    fontAwesomeLink.referrerPolicy = 'no-referrer';
    document.head.appendChild(fontAwesomeLink);

    // انتظر حتى يتم تحميل Font Awesome
    fontAwesomeLink.onload = () => {
      console.log('Font Awesome تحمّل بنجاح');
      ensureButtonsVisibility();
    };
    fontAwesomeLink.onerror = () => {
      console.error('فشل في تحميل Font Awesome، سيتم عرض النصوص البديلة');
      ensureButtonsVisibility();
    };
  } else {
    ensureButtonsVisibility();
  }

  // دالة للتأكد من عرض الزراير بشكل صحيح
  function ensureButtonsVisibility() {
    const sendButtonIcon = sendMessageBtn.querySelector('i');
    const imageButtonIcon = document.getElementById('imageInputBtn')?.querySelector('i');

    // إذا لم تظهر الأيقونات، أظهر النص البديل فقط
    if (sendButtonIcon && window.getComputedStyle(sendButtonIcon, ':before').getPropertyValue('content') === 'none') {
      sendButtonIcon.style.display = 'none';
      sendMessageBtn.querySelector('.button-text').style.display = 'inline';
    } else {
      sendButtonIcon.style.display = 'inline';
      sendMessageBtn.querySelector('.button-text').style.display = 'none';
    }

    if (imageButtonIcon && window.getComputedStyle(imageButtonIcon, ':before').getPropertyValue('content') === 'none') {
      imageButtonIcon.style.display = 'none';
      document.getElementById('imageInputBtn').querySelector('.button-text').style.display = 'inline';
    } else if (imageButtonIcon) {
      imageButtonIcon.style.display = 'inline';
      document.getElementById('imageInputBtn').querySelector('.button-text').style.display = 'none';
    }
  }

  try {
    const response = await fetch(`/api/chat-page/${linkId}`);
    if (!response.ok) {
      throw new Error(`فشل في جلب إعدادات الصفحة: ${response.status} ${response.statusText}`);
    }
    settings = await response.json();
    botId = settings.botId;

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

    const isInIframe = window.self !== window.top;

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
      .button-text {
        display: none; /* النص البديل مخفي افتراضيًا */
        margin-right: 5px;
      }
    `;

    if (settings.suggestedQuestionsEnabled && settings.suggestedQuestions?.length > 0) {
      suggestedQuestions.style.display = 'block';
      
      // خلط الأسئلة بشكل عشوائي (Fisher-Yates shuffle)
      const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      let questions = shuffleArray([...settings.suggestedQuestions]);
      let currentIndex = 0;

      // دالة لعرض سؤال واحد
      const displayNextQuestion = () => {
        suggestedQuestions.innerHTML = ''; // تفريغ العنصر
        if (questions.length === 0) return; // لو مفيش أسئلة، نوقف

        const question = questions[currentIndex];
        const button = document.createElement('button');
        button.className = 'suggested-question';
        button.style.textAlign = 'center';
        button.style.margin = '0 auto';
        button.style.display = 'block';
        button.textContent = question;
        button.addEventListener('click', () => sendMessage(question));
        suggestedQuestions.appendChild(button);

        currentIndex = (currentIndex + 1) % questions.length; // الانتقال للسؤال التالي (دوري)
      };

      // عرض السؤال الأول فورًا
      displayNextQuestion();

      // تغيير السؤال كل 3 ثواني
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
      // تحويل feedback إلى type
      const type = feedback === 'positive' ? 'like' : 'dislike';
      const userId = `web_${linkId}`; // userId ثابت لتتبع المستخدم

      const response = await fetch('/api/feedback', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`فشل في إرسال التقييم: ${errorData.message || response.statusText}`);
      }

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

  function isCodeResponse(text) {
    const trimmedText = text.trim();
    return (
      trimmedText.includes('```') ||
      (trimmedText.startsWith('<') && trimmedText.includes('>') && trimmedText.match(/<[a-zA-Z][^>]*>/)) ||
      trimmedText.match(/\b(function|const|let|var|=>|class)\b/i) ||
      (trimmedText.match(/{[^{}]*}/) && trimmedText.match(/:/)) ||
      (trimmedText.match(/[{}$$                  $$;]/) && trimmedText.match(/\b[a-zA-Z0-9_]+\s*=/))
    );
  }

  function extractCode(text) {
    const codeBlockMatch = text.match(/```[\s\S]*?```/g);
    if (codeBlockMatch) {
      return codeBlockMatch.map(block => block.replace(/```/g, '').trim()).join('\n');
    }
    return text.trim();
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
      const messageId = `msg_${messageCounter++}`;
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.setAttribute('data-message-id', messageId);

      if (isCodeResponse(data.reply)) {
        const codeText = extractCode(data.reply);
        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-block-container';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'نسخ';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(codeText);
            copyBtn.textContent = 'تم النسخ!';
            setTimeout(() => (copyBtn.textContent = 'نسخ'), 2000);
          } catch (err) {
            console.error('خطأ في النسخ:', err);
          }
        });

        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.appendChild(document.createTextNode(codeText));
        pre.appendChild(code);
        codeContainer.appendChild(copyBtn);
        codeContainer.appendChild(pre);
        botMessageDiv.appendChild(codeContainer);

        const nonCodeText = data.reply.replace(/```[\s\S]*?```/g, '').trim();
        if (nonCodeText && !isCodeResponse(nonCodeText)) {
          const nonCodeDiv = document.createElement('div');
          nonCodeDiv.appendChild(document.createTextNode(nonCodeText));
          botMessageDiv.appendChild(nonCodeDiv);
        }
      } else {
        botMessageDiv.appendChild(document.createTextNode(data.reply || 'رد البوت'));
      }

      const feedbackButtons = document.createElement('div');
      feedbackButtons.className = 'feedback-buttons';

      const goodBtn = document.createElement('button');
      goodBtn.className = 'feedback-btn good';
      goodBtn.setAttribute('data-message-id', messageId);
      goodBtn.setAttribute('data-message-content', data.reply || 'رد البوت');
      goodBtn.appendChild(document.createTextNode('👍'));

      const badBtn = document.createElement('button');
      badBtn.className = 'feedback-btn bad';
      badBtn.setAttribute('data-message-id', messageId);
      badBtn.setAttribute('data-message-content', data.reply || 'رد البوت');
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
