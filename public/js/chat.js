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

    const isInIframe = window.self !== window.top;

    customStyles.textContent = `
      body {
        background-color: ${settings?.colors?.outerBackgroundColor || '#000000'};
      }
      .chat-container {
        background-color: ${settings?.colors?.containerBackgroundColor || '#ffffff'};
        color: ${settings?.colors?.text || '#ffffff'};
      }
      #chatHeader {
        background-color: ${settings?.colors?.header || '#2D3436'};
      }
      #chatTitle {
        color: ${settings?.titleColor || '#ffffff'};
      }
      #chatMessages {
        background-color: ${settings?.colors?.chatAreaBackground || '#3B4A4E'};
      }
      #sendMessageBtn {
        background-color: ${settings?.colors?.sendButtonColor || '#6AB04C'};
      }
      .suggested-question {
        background-color: ${settings?.colors?.button || '#6AB04C'};
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
        background-color: ${settings?.colors?.inputAreaBackground || '#3B4A4E'};
      }
      #messageInput {
        color: ${settings?.colors?.inputTextColor || '#ffffff'};
      }
      #imageInput::file-selector-button {
        background-color: ${settings?.colors?.sendButtonColor || '#6AB04C'};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
      }
      #imageInput::file-selector-button:hover {
        background-color: ${settings?.colors?.sendButtonColor ? darkenColor(settings.colors.sendButtonColor, 10) : '#4A803A'};
        transform: translateY(-2px);
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
          userId: `web_${linkId}_${Date.now()}`,
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

  function hidePreviousFeedbackButtons() {
    if (lastFeedbackButtons) {
      lastFeedbackButtons.style.display = 'none';
      lastFeedbackButtons = null;
    }
  }

  function isCodeResponse(text) {
    // Enhanced code detection with stricter rules
    const trimmedText = text.trim();
    return (
      // Check for code block markers
      trimmedText.includes('```') ||
      // Check for HTML-like structures (but not just plain text with < or >)
      (trimmedText.startsWith('<') && trimmedText.includes('>') && trimmedText.match(/<[a-zA-Z][^>]*>/)) ||
      // Check for common code keywords (but ensure it's not just plain text)
      trimmedText.match(/\b(function|const|let|var|=>|class)\b/i) ||
      // Check for CSS-like patterns
      trimmedText.match(/{[^{}]*}/) &&
      trimmedText.match(/:/) ||
      // Check for code-like patterns (e.g., semicolon, curly braces, etc.)
      trimmedText.match(/[{}$$  $$;]/) &&
      trimmedText.match(/\b[a-zA-Z0-9_]+\s*=/)
    );
  }

  function extractCode(text) {
    // If the text contains a code block (e.g., ```code```), extract it
    const codeBlockMatch = text.match(/```[\s\S]*?```/g);
    if (codeBlockMatch) {
      // Extract code between ```
      return codeBlockMatch.map(block => block.replace(/```/g, '').trim()).join('\n');
    }
    // If no code block, return the whole text as code
    return text.trim();
  }

  async function sendMessage(message, isImage = false, imageData = null) {
    if (!message && !isImage) return;

    hidePreviousFeedbackButtons();

    const userMessageDiv紛: Element = document.createElement('div');
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
        // Handle code response
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

        // If there's additional non-code text, display it separately
        const nonCodeText = data.reply.replace(/```[\s\S]*?```/g, '').trim();
        if (nonCodeText && !isCodeResponse(nonCodeText)) {
          const nonCodeDiv = document.createElement('div');
          nonCodeDiv.appendChild(document.createTextNode(nonCodeText));
          botMessageDiv.appendChild(nonCodeDiv);
        }
      } else {
        // Handle regular text response
        botMessageDiv.appendChild(document.createTextNode(data.reply || 'رد البوت'));
      }

      // Create feedback buttons safely without innerHTML
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
