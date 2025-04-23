// public/js/assistantBot.js
document.addEventListener('DOMContentLoaded', () => {
  const assistantButton = document.getElementById('assistantButton');
  const assistantChatModal = document.getElementById('assistantChatModal');
  const closeAssistantChatBtn = document.getElementById('closeAssistantChatBtn');
  const assistantMessageInput = document.getElementById('assistantMessageInput');
  const assistantSendMessageBtn = document.getElementById('assistantSendMessageBtn');
  const assistantChatMessages = document.getElementById('assistantChatMessages');

  const ASSISTANT_BOT_ID = '68087d93c0124c9fe05a6996'; // ObjectId للبوت المساعد
  let userId = localStorage.getItem('userId') || 'dashboard_user_' + Date.now();
  let pendingAction = null; // لتخزين الإجراءات المعلقة (مثل حفظ قاعدة)

  // فتح/إغلاق الشات
  assistantButton.addEventListener('click', () => {
    assistantChatModal.style.display = assistantChatModal.style.display === 'none' ? 'flex' : 'none';
    assistantButton.style.transform = assistantChatModal.style.display === 'flex' ? 'scale(1.1)' : 'scale(1)';
    if (assistantChatModal.style.display === 'flex') {
      assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
    }
  });

  closeAssistantChatBtn.addEventListener('click', () => {
    assistantChatModal.style.display = 'none';
    assistantButton.style.transform = 'scale(1)';
  });

  // إرسال رسالة
  assistantSendMessageBtn.addEventListener('click', sendMessage);
  assistantMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  async function sendMessage() {
    const message = assistantMessageInput.value.trim();
    if (!message) return;

    // إضافة رسالة المستخدم
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `
      <p>${message}</p>
      <small>${new Date().toLocaleString('ar-EG')}</small>
    `;
    assistantChatMessages.appendChild(userMessageDiv);
    assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
    assistantMessageInput.value = '';

    // معالجة الرسالة
    await processMessage(message);
  }

  async function processMessage(message) {
    try {
      // التحقق من الأوامر الخاصة (مثل "احفظ")
      if (pendingAction && (message.includes('احفظ') || message.includes('حفظ'))) {
        await executePendingAction();
        return;
      } else if (pendingAction && (message.includes('لا') || message.includes('مراجعة'))) {
        addBotMessage('حسنًا، يمكنك مراجعة الإعدادات بنفسك. أنا هنا إذا احتجت مساعدة!');
        pendingAction = null;
        return;
      }

      // إرسال الرسالة للـ Backend
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          botId: ASSISTANT_BOT_ID,
          message,
          userId,
        }),
      });

      if (!response.ok) throw new Error('فشل في معالجة الرسالة');

      const data = await response.json();
      let reply = data.reply || 'عذرًا، لم أفهم طلبك. حاول مرة أخرى!';

      // تحليل الرد لتحديد الإجراء
      if (reply.includes('انتقل إلى صفحة')) {
        handleNavigation(reply);
      } else if (reply.includes('أضف قاعدة')) {
        handleAddRule(reply);
      } else if (reply.includes('ابحث عن قاعدة')) {
        handleSearchRule(reply);
      } else if (reply.includes('صفّي الرسائل')) {
        handleFilterMessages(reply);
      } else if (reply.includes('عدل رد البوت')) {
        handleEditBotReply(reply);
      } else {
        addBotMessage(reply);
      }
    } catch (err) {
      console.error('خطأ في معالجة الرسالة:', err);
      addBotMessage('عذرًا، حدث خطأ أثناء معالجة طلبك.');
    }
  }

  function addBotMessage(content) {
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'message bot-message';
    botMessageDiv.innerHTML = `
      <p>${content}</p>
      <small>${new Date().toLocaleString('ar-EG')}</small>
    `;
    assistantChatMessages.appendChild(botMessageDiv);
    assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
  }

  // التنقل بين الصفحات
  function handleNavigation(reply) {
    if (reply.includes('القواعد')) {
      window.location.hash = 'rules';
      addBotMessage('تم الانتقال إلى صفحة القواعد.');
    } else if (reply.includes('الرسائل')) {
      window.location.hash = 'messages';
      addBotMessage('تم الانتقال إلى صفحة الرسائل.');
    } else if (reply.includes('التقييمات')) {
      window.location.hash = 'feedback';
      addBotMessage('تم الانتقال إلى صفحة التقييمات.');
    } else if (reply.includes('إعدادات فيسبوك')) {
      window.location.hash = 'facebook';
      addBotMessage('تم الانتقال إلى صفحة إعدادات فيسبوك.');
    } else if (reply.includes('البوتات')) {
      window.location.hash = 'bots';
      addBotMessage('تم الانتقال إلى صفحة البوتات.');
    } else if (reply.includes('التحليلات')) {
      window.location.hash = 'analytics';
      addBotMessage('تم الانتقال إلى صفحة التحليلات.');
    } else if (reply.includes('تخصيص الدردشة')) {
      window.location.hash = 'chat-page';
      addBotMessage('تم الانتقال إلى صفحة تخصيص الدردشة.');
    } else {
      addBotMessage('لم أتعرف على الصفحة المطلوبة. حاول مرة أخرى!');
    }
  }

  // إضافة قاعدة جديدة
  async function handleAddRule(reply) {
    const ruleContentMatch = reply.match(/أضف قاعدة جديدة: (.*)/);
    if (!ruleContentMatch) {
      addBotMessage('لم أستطع فهم محتوى القاعدة. حاول مرة أخرى!');
      return;
    }

    const ruleContent = ruleContentMatch[1];
    const botIdSelect = document.getElementById('botId');
    if (!botIdSelect || !botIdSelect.value) {
      window.location.hash = 'rules';
      addBotMessage('يرجى اختيار بوت أولاً من صفحة القواعد.');
      return;
    }

    const botId = botIdSelect.value;
    pendingAction = {
      type: 'addRule',
      data: {
        botId,
        type: 'general',
        content: ruleContent,
      },
    };

    addBotMessage(`جهزت لك قاعدة عامة جديدة: "${ruleContent}". هل أحفظها الآن أم تريد المراجعة؟ (قل "احفظ" أو "لا")`);
  }

  // البحث عن قاعدة
  async function handleSearchRule(reply) {
    const searchMatch = reply.match(/ابحث عن قاعدة تحتوي على (.*)/);
    if (!searchMatch) {
      addBotMessage('لم أستطع فهم كلمة البحث. حاول مرة أخرى!');
      return;
    }

    const searchTerm = searchMatch[1];
    const botIdSelect = document.getElementById('botId');
    if (!botIdSelect || !botIdSelect.value) {
      window.location.hash = 'rules';
      addBotMessage('يرجى اختيار بوت أولاً من صفحة القواعد.');
      return;
    }

    const botId = botIdSelect.value;
    const response = await fetch(`/api/rules?botId=${botId}&search=${encodeURIComponent(searchTerm)}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      addBotMessage('فشل في البحث عن القاعدة. حاول مرة أخرى!');
      return;
    }

    const { rules } = await response.json();
    if (rules.length === 0) {
      addBotMessage(`لم أجد أي قاعدة تحتوي على "${searchTerm}".`);
      return;
    }

    const rule = rules[0];
    let contentDisplay = '';
    if (rule.type === 'general') contentDisplay = `المحتوى: ${rule.content}`;
    else if (rule.type === 'products') contentDisplay = `المنتج: ${rule.content.product}، السعر: ${rule.content.price} ${rule.content.currency}`;
    else if (rule.type === 'qa') contentDisplay = `السؤال: ${rule.content.question}، الإجابة: ${rule.content.answer}`;
    else if (rule.type === 'api') contentDisplay = `مفتاح API: ${rule.content.apiKey}`;
    else if (rule.type === 'global') contentDisplay = `المحتوى الموحد: ${rule.content}`;

    addBotMessage(`وجدت قاعدة: نوع القاعدة: ${rule.type}، ${contentDisplay}. هل تريد تعديلها؟ (قل "نعم" أو "لا")`);

    pendingAction = {
      type: 'editRule',
      data: { ruleId: rule._id },
    };
  }

  // تصفية الرسائل
  async function handleFilterMessages(reply) {
    const dateMatch = reply.match(/صفّي الرسائل من تاريخ (\d{4}-\d{2}-\d{2}) إلى تاريخ (\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      addBotMessage('لم أستطع فهم التواريخ. حاول مرة أخرى (مثال: صفّي الرسائل من تاريخ 2025-04-01 إلى تاريخ 2025-04-10)');
      return;
    }

    const startDate = dateMatch[1];
    const endDate = dateMatch[2];
    const botSelect = document.getElementById('botSelectMessages');
    if (!botSelect || !botSelect.value) {
      window.location.hash = 'messages';
      addBotMessage('يرجى اختيار بوت أولاً من صفحة الرسائل.');
      return;
    }

    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    startDateFilter.value = startDate;
    endDateFilter.value = endDate;
    applyFilterBtn.click();

    addBotMessage(`تم تصفية الرسائل من ${startDate} إلى ${endDate}.`);
  }

  // تعديل رد البوت
  async function handleEditBotReply(reply) {
    const userMatch = reply.match(/عدل رد البوت في محادثة مع (.*)/);
    if (!userMatch) {
      addBotMessage('لم أستطع فهم المستخدم. حاول مرة أخرى (مثال: عدل رد البوت في محادثة مع مستخدم 1)');
      return;
    }

    const userName = userMatch[1];
    const botSelect = document.getElementById('botSelectMessages');
    if (!botSelect || !botSelect.value) {
      window.location.hash = 'messages';
      addBotMessage('يرجى اختيار بوت أولاً من صفحة الرسائل.');
      return;
    }

    const botId = botSelect.value;
    const response = await fetch(`/api/messages/${botId}?type=web`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      addBotMessage('فشل في جلب المحادثات. حاول مرة أخرى!');
      return;
    }

    const conversations = await response.json();
    const userConversation = conversations.find(conv => conv.userId.includes(userName));
    if (!userConversation) {
      addBotMessage(`لم أجد محادثة مع "${userName}".`);
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'chat-modal';
    modal.innerHTML = `
      <div class="chat-modal-content">
        <div class="chat-header">
          <h3>${userName}</h3>
          <button id="closeEditChatBtn" class="chat-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="chat-messages"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const chatMessages = modal.querySelector('.chat-messages');
    const closeEditChatBtn = document.querySelector('#closeEditChatBtn');
    let messages = userConversation.messages;

    messages.forEach((msg, index) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
      let messageContent = `
        <p>${msg.content}</p>
        <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
      `;
      if (msg.role === 'assistant') {
        messageContent += `
          <button class="edit-btn" data-message-index="${index}" style="margin-left: 10px; padding: 5px 10px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">تعديل</button>
        `;
      }
      messageDiv.innerHTML = messageContent;
      chatMessages.appendChild(messageDiv);

      if (msg.role === 'assistant') {
        const editBtn = messageDiv.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
          const messageP = messageDiv.querySelector('p');
          const originalContent = messageP.textContent;
          messageP.innerHTML = `
            <textarea class="edit-textarea" style="width: 100%; min-height: 100px;">${originalContent}</textarea>
            <button class="save-rule-btn" style="margin-top: 10px; padding: 5px 10px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">حفظ قاعدة جديدة</button>
          `;
          editBtn.style.display = 'none';

          const saveRuleBtn = messageDiv.querySelector('.save-rule-btn');
          saveRuleBtn.addEventListener('click', async () => {
            const textarea = messageDiv.querySelector('.edit-textarea');
            const newContent = textarea.value.trim();
            if (!newContent) {
              addBotMessage('يرجى إدخال محتوى صالح للقاعدة.');
              return;
            }

            let question = '';
            for (let i = index - 1; i >= 0; i--) {
              if (messages[i].role === 'user') {
                question = messages[i].content;
                break;
              }
            }
            if (!question) {
              addBotMessage('لم يتم العثور على سؤال من المستخدم لهذا الرد.');
              return;
            }

            pendingAction = {
              type: 'addRule',
              data: {
                botId,
                type: 'qa',
                content: { question, answer: newContent },
              },
            };

            addBotMessage(`جهزت قاعدة جديدة بناءً على التعديل: السؤال: "${question}"، الإجابة: "${newContent}". هل أحفظها الآن أم تريد المراجعة؟ (قل "احفظ" أو "لا")`);
            modal.remove();
          });
        });
      }
    });

    closeEditChatBtn.addEventListener('click', () => modal.remove());
  }

  // تنفيذ الإجراء المعلق
  async function executePendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === 'addRule') {
      const { botId, type, content } = pendingAction.data;
      try {
        const response = await fetch('/api/rules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ botId, type, content }),
        });
        if (!response.ok) throw new Error('فشل في إضافة القاعدة');
        addBotMessage('تم حفظ القاعدة بنجاح!');
      } catch (err) {
        addBotMessage('فشل في حفظ القاعدة. حاول مرة أخرى!');
      }
    }

    pendingAction = null;
  }
});
