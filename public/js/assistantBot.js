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

      // تحديد السياق بناءً على الصفحة الحالية
      const currentPage = window.location.hash || '#rules'; // الافتراضي للمستخدم العادي
      const contextMessage = message + ` (أنا في صفحة ${currentPage.replace('#', '')})`;

      // إرسال الرسالة للـ Backend
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          botId: ASSISTANT_BOT_ID,
          message: contextMessage,
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
      } else if (reply.includes('أنشئ بوت جديد')) {
        handleCreateBot(reply);
      } else if (reply.includes('اعرض التقييمات')) {
        handleShowFeedback(reply);
      } else if (reply.includes('فعّل')) {
        handleFacebookSettings(reply);
      } else if (reply.includes('اعرض إحصائيات')) {
        handleShowAnalytics(reply);
      } else if (reply.includes('في صفحة')) {
        handleContextSuggestions(reply);
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
      addBotMessage('تم الانتقال إلى صفحة القواعد. هل تريد إضافة قاعدة جديدة أو البحث عن قاعدة؟');
    } else if (reply.includes('الرسائل')) {
      window.location.hash = 'messages';
      addBotMessage('تم الانتقال إلى صفحة الرسائل. هل تريد تصفية الرسائل أو تعديل رد معين؟');
    } else if (reply.includes('التقييمات')) {
      window.location.hash = 'feedback';
      addBotMessage('تم الانتقال إلى صفحة التقييمات. هل تريد عرض التقييمات الإيجابية أو السلبية؟');
    } else if (reply.includes('إعدادات فيسبوك')) {
      window.location.hash = 'facebook';
      addBotMessage('تم الانتقال إلى صفحة إعدادات فيسبوك. هل تريد تفعيل رسائل الترحيب أو تتبع المصادر؟');
    } else if (reply.includes('البوتات')) {
      window.location.hash = 'bots';
      addBotMessage('تم الانتقال إلى صفحة البوتات. هل تريد إنشاء بوت جديد أو تعديل بوت موجود؟');
    } else if (reply.includes('التحليلات')) {
      window.location.hash = 'analytics';
      addBotMessage('تم الانتقال إلى صفحة التحليلات. هل تريد عرض إحصائيات بوت معين؟');
    } else if (reply.includes('تخصيص الدردشة')) {
      window.location.hash = 'chat-page';
      addBotMessage('تم الانتقال إلى صفحة تخصيص الدردشة. هل تريد تغيير العنوان أو الألوان؟');
    } else {
      addBotMessage('لم أتعرف على الصفحة المطلوبة. حاول مرة أخرى!');
    }
  }

  // إضافة قاعدة جديدة
  async function handleAddRule(reply) {
    const ruleMatch = reply.match(/أضف قاعدة (عامة|موحدة|أسعار|سؤال وجواب|API): (.*)/);
    if (!ruleMatch) {
      addBotMessage('لم أستطع فهم محتوى القاعدة. حاول مرة أخرى (مثال: أضف قاعدة عامة: مفيش استرجاع للمنتجات بعد 7 أيام)');
      return;
    }

    const ruleType = ruleMatch[1];
    const ruleContent = ruleMatch[2];
    const botIdSelect = document.getElementById('botId');
    if (!botIdSelect || !botIdSelect.value) {
      window.location.hash = 'rules';
      addBotMessage('يرجى اختيار بوت أولاً من صفحة القواعد.');
      return;
    }

    const botId = botIdSelect.value;
    let content;

    if (ruleType === 'عامة') {
      content = ruleContent;
    } else if (ruleType === 'موحدة') {
      if (localStorage.getItem('role') !== 'superadmin') {
        addBotMessage('عذرًا، لا يمكنك إضافة قاعدة موحدة لأنك لست سوبر أدمن.');
        return;
      }
      content = ruleContent;
    } else if (ruleType === 'أسعار') {
      const productMatch = ruleContent.match(/(.*) بسعر (\d+) (جنيه|دولار)/);
      if (!productMatch) {
        addBotMessage('يرجى إدخال تفاصيل المنتج بشكل صحيح (مثال: منتج كمبيوتر بسعر 1000 جنيه)');
        return;
      }
      content = {
        product: productMatch[1],
        price: parseFloat(productMatch[2]),
        currency: productMatch[3],
      };
    } else if (ruleType === 'سؤال وجواب') {
      const qaMatch = ruleContent.match(/السؤال: (.*)، الإجابة: (.*)/);
      if (!qaMatch) {
        addBotMessage('يرجى إدخال السؤال والإجابة بشكل صحيح (مثال: السؤال: ما هو سعر الكمبيوتر؟، الإجابة: 1000 جنيه)');
        return;
      }
      content = {
        question: qaMatch[1],
        answer: qaMatch[2],
      };
    } else if (ruleType === 'API') {
      content = { apiKey: ruleContent };
    }

    pendingAction = {
      type: 'addRule',
      data: {
        botId,
        type: ruleType === 'عامة' ? 'general' : ruleType === 'موحدة' ? 'global' : ruleType === 'أسعار' ? 'products' : ruleType === 'سؤال وجواب' ? 'qa' : 'api',
        content,
      },
    };

    addBotMessage(`جهزت لك قاعدة ${ruleType}: "${ruleContent}". هل أحفظها الآن أم تريد المراجعة؟ (قل "احفظ" أو "لا")`);
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
      addBotMessage(`لم أجد أي قاعدة تحتوي على "${searchTerm}". هل تريد إضافة قاعدة جديدة؟`);
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

    addBotMessage(`تم تصفية الرسائل من ${startDate} إلى ${endDate}. هل تريد تعديل رد معين في المحادثات؟`);
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

  // إنشاء بوت جديد
  async function handleCreateBot(reply) {
    if (localStorage.getItem('role') !== 'superadmin') {
      addBotMessage('عذرًا، لا يمكنك إنشاء بوت جديد لأنك لست سوبر أدمن.');
      return;
    }

    const botNameMatch = reply.match(/أنشئ بوت جديد باسم (.*)/);
    if (!botNameMatch) {
      addBotMessage('لم أستطع فهم اسم البوت. حاول مرة أخرى (مثال: أنشئ بوت جديد باسم بوت التسويق)');
      return;
    }

    const botName = botNameMatch[1];
    window.location.hash = 'bots';
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = `
      <h3>إنشاء بوت جديد</h3>
      <form id="createBotForm">
        <div class="form-group">
          <input type="text" id="botName" required placeholder=" " value="${botName}">
          <label for="botName">اسم البوت</label>
        </div>
        <div class="form-group">
          <input type="text" id="facebookApiKey" placeholder=" ">
          <label for="facebookApiKey">رقم API لفيسبوك (اختياري)</label>
        </div>
        <div id="facebookPageIdContainer" style="display: none;">
          <div class="form-group">
            <input type="text" id="facebookPageId" placeholder=" ">
            <label for="facebookPageId">معرف صفحة الفيسبوك</label>
          </div>
        </div>
        <div class="form-group">
          <input type="text" id="userSearch" placeholder=" ">
          <label for="userSearch">ابحث عن المستخدم...</label>
          <select id="userId" required></select>
        </div>
        <button type="submit">إنشاء</button>
      </form>
      <p id="botError" style="color: red;"></p>
    `;

    const facebookApiKeyInput = document.getElementById('facebookApiKey');
    const facebookPageIdContainer = document.getElementById('facebookPageIdContainer');
    facebookApiKeyInput.addEventListener('input', () => {
      facebookPageIdContainer.style.display = facebookApiKeyInput.value ? 'block' : 'none';
    });

    const userSearch = document.getElementById('userSearch');
    const userSelect = document.getElementById('userId');
    let allUsers = [];

    const usersResponse = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    allUsers = await usersResponse.json();
    allUsers.forEach((user) => {
      userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
    });

    userSearch.addEventListener('input', () => {
      const searchTerm = userSearch.value.toLowerCase();
      userSelect.innerHTML = '';
      allUsers
        .filter((user) => user.username.toLowerCase().includes(searchTerm))
        .forEach((user) => {
          userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
        });
    });

    pendingAction = {
      type: 'createBot',
      data: { botName },
    };

    addBotMessage(`جهزت لك نموذج إنشاء بوت جديد باسم "${botName}". يرجى اختيار المستخدم من القائمة. هل أحفظ البوت الآن أم تريد المراجعة؟ (قل "احفظ" أو "لا")`);
  }

  // عرض التقييمات
  async function handleShowFeedback(reply) {
    const feedbackMatch = reply.match(/اعرض التقييمات (الإيجابية|السلبية) لبوت (.*)/);
    if (!feedbackMatch) {
      addBotMessage('لم أستطع فهم نوع التقييم أو اسم البوت. حاول مرة أخرى (مثال: اعرض التقييمات الإيجابية لبوت التسويق)');
      return;
    }

    const feedbackType = feedbackMatch[1];
    const botName = feedbackMatch[2];
    window.location.hash = 'feedback';

    const botSelect = document.getElementById('botSelectFeedback');
    if (!botSelect) {
      addBotMessage('يرجى الانتظار حتى يتم تحميل صفحة التقييمات.');
      return;
    }

    const botOption = Array.from(botSelect.options).find(opt => opt.text === botName);
    if (!botOption) {
      addBotMessage(`لم أجد بوت باسم "${botName}".`);
      return;
    }

    botSelect.value = botOption.value;
    botSelect.dispatchEvent(new Event('change'));

    const feedbackList = feedbackType === 'الإيجابية' ? document.getElementById('positiveFeedbackList') : document.getElementById('negativeFeedbackList');
    if (feedbackList.children.length === 0) {
      addBotMessage(`لا توجد تقييمات ${feedbackType} لبوت "${botName}".`);
      return;
    }

    const feedbackItems = Array.from(feedbackList.children).slice(0, 3).map(item => {
      const user = item.querySelector('p:nth-child(1)').textContent;
      const message = item.querySelector('p:nth-child(2)').textContent;
      return `${user} - ${message}`;
    }).join('\n');

    addBotMessage(`إليك أول 3 تقييمات ${feedbackType} لبوت "${botName}":\n${feedbackItems}\nهل تريد حذف تقييم معين أو تنزيل التقييمات؟`);
  }

  // تفعيل إعدادات فيسبوك
  async function handleFacebookSettings(reply) {
    const settingMatch = reply.match(/فعّل (رسائل الترحيب|التفاعل مع ردود الفعل|تتبع مصدر المستخدمين|التعامل مع تعديلات الرسائل|تصنيف المحادثات) لبوت (.*)/);
    if (!settingMatch) {
      addBotMessage('لم أستطع فهم الإعداد المطلوب. حاول مرة أخرى (مثال: فعّل رسائل الترحيب لبوت التسويق)');
      return;
    }

    const setting = settingMatch[1];
    const botName = settingMatch[2];
    window.location.hash = 'facebook';

    const botSelect = document.getElementById('botSelectFacebook');
    if (!botSelect) {
      addBotMessage('يرجى الانتظار حتى يتم تحميل صفحة إعدادات فيسبوك.');
      return;
    }

    const botOption = Array.from(botSelect.options).find(opt => opt.text === botName);
    if (!botOption) {
      addBotMessage(`لم أجد بوت باسم "${botName}".`);
      return;
    }

    botSelect.value = botOption.value;
    botSelect.dispatchEvent(new Event('change'));

    let settingKey;
    if (setting === 'رسائل الترحيب') settingKey = 'messagingOptinsToggle';
    else if (setting === 'التفاعل مع ردود الفعل') settingKey = 'messageReactionsToggle';
    else if (setting === 'تتبع مصدر المستخدمين') settingKey = 'messagingReferralsToggle';
    else if (setting === 'التعامل مع تعديلات الرسائل') settingKey = 'messageEditsToggle';
    else if (setting === 'تصنيف المحادثات') settingKey = 'inboxLabelsToggle';

    const toggle = document.getElementById(settingKey);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));

    addBotMessage(`تم تفعيل ${setting} لبوت "${botName}". هل تريد تفعيل إعداد آخر؟`);
  }

  // عرض إحصائيات بوت
  async function handleShowAnalytics(reply) {
    const botMatch = reply.match(/اعرض إحصائيات بوت (.*)/);
    if (!botMatch) {
      addBotMessage('لم أستطع فهم اسم البوت. حاول مرة أخرى (مثال: اعرض إحصائيات بوت التسويق)');
      return;
    }

    const botName = botMatch[1];
    window.location.hash = 'analytics';

    const botSelect = document.getElementById('botSelect');
    if (!botSelect) {
      addBotMessage('يرجى الانتظار حتى يتم تحميل صفحة التحليلات.');
      return;
    }

    const botOption = Array.from(botSelect.options).find(opt => opt.text === botName);
    if (!botOption) {
      addBotMessage(`لم أجد بوت باسم "${botName}".`);
      return;
    }

    botSelect.value = botOption.value;
    botSelect.dispatchEvent(new Event('change'));

    const messagesCount = document.getElementById('messagesCount').textContent;
    const activeRules = document.getElementById('activeRules').textContent;

    addBotMessage(`إحصائيات بوت "${botName}":\n${messagesCount}\n${activeRules}\nهل تريد عرض إحصائيات بوت آخر؟`);
  }

  // اقتراحات بناءً على السياق
  function handleContextSuggestions(reply) {
    const pageMatch = reply.match(/في صفحة (.*)/);
    if (!pageMatch) return;

    const page = pageMatch[1];
    if (page.includes('القواعد')) {
      addBotMessage('أنت في صفحة القواعد! يمكنك: إضافة قاعدة جديدة (مثل قاعدة عامة أو سؤال وجواب)، البحث عن قاعدة موجودة، تعديل قاعدة، تصدير أو استيراد القواعد. هل تريد مساعدة في حاجة معينة؟');
    } else if (page.includes('الرسائل')) {
      addBotMessage('أنت في صفحة الرسائل! يمكنك: تصفية الرسائل حسب التاريخ، تعديل ردود البوت، حذف المحادثات، أو تنزيل الرسائل. هل تريد مساعدة في حاجة معينة؟');
    } else if (page.includes('التقييمات')) {
      addBotMessage('أنت في صفحة التقييمات! يمكنك: عرض التقييمات الإيجابية أو السلبية، حذف التقييمات، أو تنزيلها كـ CSV. هل تريد مساعدة في حاجة معينة؟');
    }
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
        addBotMessage('تم حفظ القاعدة بنجاح! هل تريد إضافة قاعدة أخرى أو البحث عن قاعدة؟');
      } catch (err) {
        addBotMessage('فشل في حفظ القاعدة. حاول مرة أخرى!');
      }
    } else if (pendingAction.type === 'createBot') {
      const createBotForm = document.getElementById('createBotForm');
      if (createBotForm) createBotForm.dispatchEvent(new Event('submit'));
      addBotMessage('تم إنشاء البوت بنجاح! هل تريد إنشاء بوت آخر؟');
    }

    pendingAction = null;
  }
});
