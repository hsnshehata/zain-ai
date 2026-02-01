// public/js/assistantBot.js
document.addEventListener('DOMContentLoaded', () => {
  const assistantButton = document.getElementById('assistantButton');
  const assistantChatModal = document.getElementById('assistantChatModal');
  const closeAssistantChatBtn = document.getElementById('closeAssistantChatBtn');
  const assistantMessageInput = document.getElementById('assistantMessageInput');
  const assistantSendMessageBtn = document.getElementById('assistantSendMessageBtn');
  const assistantChatMessages = document.getElementById('assistantChatMessages');
  const welcomeTimestamp = document.getElementById('welcomeTimestamp');

  // Check if required elements exist
  if (!assistantButton || !assistantChatModal || !closeAssistantChatBtn || !assistantMessageInput || !assistantSendMessageBtn || !assistantChatMessages) {
    console.error('One or more required elements for assistant chat are missing in the DOM');
    return;
  }

  // Ensure the modal is hidden initially
  assistantChatModal.style.display = 'none';

  const selectedBotId = localStorage.getItem('selectedBotId');
  const assistantBotId = '688ebdc24f6bd5cf70cb071d'; // معرف البوت الثابت للمساعد
  const storedStoreId = localStorage.getItem('storeId'); // قد يكون محفوظ من المتجر
  let userId = localStorage.getItem('userId') || 'dashboard_user_' + Date.now();
  let conversationHistory = JSON.parse(localStorage.getItem(`conversationHistory_${userId}`)) || [];
  let pendingAction = null; // لتخزين أمر حساس بانتظار التأكيد
  const PAGE_GUIDE = {
    rules: {
      title: 'القواعد',
      desc: 'صفحة إدارة قواعد ردود البوت: إضافة/تعديل/حذف قاعدة، واستيراد أو تصدير القواعد كـ JSON. استخدمها لتدريب البوت على إجاباتك المخصصة.',
    },
    'chat-page': {
      title: 'واجهة الدردشة',
      desc: 'تخصيص واجهة الدردشة العامة: الرابط أو الزر العائم/التضمين، الشعار، الألوان، الأسئلة المقترحة، رفع الصور، إخفاء الهيدر، ومعاينة مباشرة.',
    },
    messages: {
      title: 'الرسائل',
      desc: 'سجل المحادثات متعددة القنوات مع فلاتر وتصفح وفتح محادثة في نافذة جانبية أو مودال.',
    },
    'orders-center': {
      title: 'متابعة الطلبات',
      desc: 'عرض الطلبات الواردة من الدردشة والمتجر في مكان واحد مع إبراز الطلبات الجديدة.',
    },
    'store-manager': {
      title: 'المتجر الذكي',
      desc: 'لوحة إدارة المتجر بتبويبات المنتجات والطلبات والعملاء والموردين والتصميم والإعدادات.',
    },
    channels: {
      title: 'قنوات البوت',
      desc: 'بوابة إدارة القنوات مع تبويبات فيسبوك/إنستجرام/واتساب وإعدادات الربط لكل قناة.',
    },
    facebook: {
      title: 'إعدادات فيسبوك',
      desc: 'ربط أو تبديل حساب فيسبوك، ضبط webhook، وكلمة الإيقاف المؤقت.',
    },
    instagram: {
      title: 'إعدادات إنستجرام',
      desc: 'ربط إنستجرام ومراجعة حالة الربط وقنوات التراسل.',
    },
    whatsapp: {
      title: 'إعدادات واتساب',
      desc: 'إرشادات ربط واتساب عبر تطبيق سطح المكتب وQR.',
    },
    bots: {
      title: 'إدارة المنصة',
      desc: 'تحكم شامل في المستخدمين، البوتات، الاشتراكات، والتشغيل/الإيقاف من مكان واحد (للسوبر أدمن).',
    },
    feedback: {
      title: 'التقييمات',
      desc: 'عرض التقييمات الإيجابية/السلبية، تنزيل CSV أو تحويل تقييم إلى قاعدة.',
    },
    settings: {
      title: 'الإعدادات',
      desc: 'إعدادات الحساب وتحديث كلمة المرور واسم البوت والإحصاءات السريعة.',
    },
    wasenderpro: {
      title: 'Wasender Pro',
      desc: 'دليل ثابت وروابط تحميل وفيديو شرح للأداة.',
    },
  };

  if (!selectedBotId) {
    assistantChatMessages.innerHTML = `
      <div class="message bot-message">
        <p>يرجى اختيار بوت من لوحة التحكم أولاً لتنفيذ العمليات.</p>
        <small>${new Date().toLocaleString('ar-EG')}</small>
      </div>
    `;
  }

  function normalizePageKey(page) {
    return (page || '').toString().trim().toLowerCase().replace(/\s+/g, '-');
  }

  function describePage(pageKey) {
    const entry = PAGE_GUIDE[pageKey];
    if (!entry) {
      return `لا أملك دليلاً لصفحة "${pageKey || 'غير معروفة'}". جرّب طلب صفحة معروفة مثل القواعد أو الرسائل.`;
    }
    if (entry.desc) return entry.desc;
    const req = entry.requirements ? `المتطلبات: ${entry.requirements}.` : '';
    const tasks = entry.tasks ? `المهام الأساسية: ${entry.tasks}.` : '';
    const notes = entry.notes ? `ملاحظات: ${entry.notes}.` : '';
    return `${entry.title}\n${req}\n${tasks}\n${notes}`.trim();
  }

  function extractPageMarker(text) {
    if (!text) return null;
    const match = text.match(/\[\[page:([a-z0-9\-]+)\]\]/i);
    return match ? normalizePageKey(match[1]) : null;
  }

  async function autoNavigateToPage(pageKey) {
    if (!pageKey) return;
    try {
      await executeInternalCommand({ action: 'navigate', page: pageKey });
      console.log('[assistantBot] auto-navigated to page', pageKey);
    } catch (err) {
      console.warn('فشل التنقل التلقائي للصفحة:', pageKey, err);
    }
  }

  function ensurePageMarker(message, plan, userMessage) {
    const userDetected = detectPageFromText(userMessage);
    let pageKey = extractPageMarker(message);
    if (userDetected) {
      if (!pageKey || pageKey !== userDetected) {
        pageKey = userDetected;
      }
    }
    if (!pageKey) {
      const candidate = normalizePageKey((plan?.params?.page || plan?.page || (plan?.intent === 'pageGuide' ? plan?.params?.page : '')) || '');
      let known = PAGE_GUIDE[candidate] ? candidate : null;
      if (!known) {
        known = detectPageFromText(message);
      }
      if (known) {
        pageKey = known;
      }
    }
    if (pageKey && !message.includes(`[[page:${pageKey}]]`)) {
      message = `[[page:${pageKey}]] ${message}`.trim();
    }
    return { message, pageKey };
  }

  function detectPageFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (/تخصيص\s+الدردشة|صفحة\s+الدردشة|واجهة\s+الدردشة|وجهه\s+الدردشة|وجهة\s+الدردشة|واجهه\s+الدردشة|chat\s*-?page/.test(lower)) return 'chat-page';
    if (/القواعد|rules/.test(lower)) return 'rules';
    if (/البوتات|bots/.test(lower)) return 'bots';
    if (/الرسائل|الرسايل|messages/.test(lower)) return 'messages';
    if (/التقييمات|feedback/.test(lower)) return 'feedback';
    if (/فيسبوك|facebook/.test(lower)) return 'facebook';
    if (/انستجرام|إنستجرام|instagram/.test(lower)) return 'instagram';
    if (/واتساب|whatsapp/.test(lower)) return 'whatsapp';
    if (/المتجر|store|catalog|orders|customers/.test(lower)) return 'store-manager';
    if (/متابعة الطلبات|orders-center/.test(lower)) return 'orders-center';
    if (/قنوات|channels/.test(lower)) return 'channels';
    if (/الاعدادات|الإعدادات|settings/.test(lower)) return 'settings';
    if (/wasender|واسندر|واتسندر/.test(lower)) return 'wasenderpro';
    return null;
  }

  // تحديث الـ cache بعد كل رسالة
  function updateConversationCache() {
    localStorage.setItem(`conversationHistory_${userId}`, JSON.stringify(conversationHistory.slice(-50))); // نحد 50 رسالة أخيرة
  }

  // تنظيف الـ cache لو المستخدم غير البوت
  if (selectedBotId && localStorage.getItem('lastSelectedBotId') !== selectedBotId) {
    conversationHistory = [];
    updateConversationCache();
  }
  localStorage.setItem('lastSelectedBotId', selectedBotId);

  if (welcomeTimestamp) {
    welcomeTimestamp.textContent = new Date().toLocaleString('ar-EG');
  }

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

  // إغلاق المساعد عند الضغط خارج الإطار أو زر Esc
  assistantChatModal.addEventListener('click', (e) => {
    // لو الخلفية هي اللي اتضغطت عليها (وليس محتوى الدردشة) نغلق
    if (e.target === assistantChatModal) {
      assistantChatModal.style.display = 'none';
      assistantButton.style.transform = 'scale(1)';
    }
  });

  document.addEventListener('click', (e) => {
    const clickedOutside = assistantChatModal.style.display === 'flex' && !assistantChatModal.contains(e.target) && !assistantButton.contains(e.target);
    if (assistantChatModal.style.display === 'flex' && clickedOutside) {
      assistantChatModal.style.display = 'none';
      assistantButton.style.transform = 'scale(1)';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && assistantChatModal.style.display === 'flex') {
      assistantChatModal.style.display = 'none';
      assistantButton.style.transform = 'scale(1)';
    }
  });

  assistantSendMessageBtn.addEventListener('click', sendMessage);
  assistantMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  async function sendMessage() {
    const message = assistantMessageInput.value.trim();
    if (!message) return;

    const lastMessageTimestamp = new Date();

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = `
      <p>${message}</p>
      <small>${lastMessageTimestamp.toLocaleString('ar-EG')}</small>
    `;
    assistantChatMessages.appendChild(userMessageDiv);
    assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
    assistantMessageInput.value = '';

    conversationHistory.push({ role: 'user', content: message });
    updateConversationCache();

    await processMessage(message, lastMessageTimestamp);
  }

  // إضافة رسالة روبوت للـ UI وللتاريخ
  function appendBotMessage(text) {
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'message bot-message';
    botMessageDiv.innerHTML = `
      <p>${text}</p>
      <small>${new Date().toLocaleString('ar-EG')}</small>
    `;
    assistantChatMessages.appendChild(botMessageDiv);
    assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
    conversationHistory.push({ role: 'assistant', content: text });
    updateConversationCache();
  }

  function isAffirmative(text) {
    return /^(?:نعم|اه|أيوه|ايوه|تمام|موافق|confirm|yes)$/i.test(text.trim());
  }

  function isNegative(text) {
    return /^(?:لا|لأ|مش|مش موافق|الغاء|إلغاء|cancel|no)$/i.test(text.trim());
  }

  function requiresConfirmation(intent) {
    const sensitiveIntents = ['deleteProduct', 'deleteRule', 'deleteBot', 'deleteMessage', 'removeUser'];
    return sensitiveIntents.includes(intent);
  }

  async function executePlannedIntent(plan) {
    const intent = plan.intent;
    const params = plan.params || {};

    switch (intent) {
      case 'navigate': {
        const pageKey = normalizePageKey(params.page || plan.page);
        const message = plan.responseMessage || `[[page:${pageKey}]] تم الانتقال إلى الصفحة.`;
        await executeInternalCommand({ action: 'navigate', page: pageKey });
        return { message };
      }
      case 'pageGuide': {
        const key = normalizePageKey(params.page || plan.page);
        const desc = describePage(key);
        return { message: `[[page:${key}]] ${desc}` };
      }
      case 'addRule': {
        const content = params.content || plan.responseMessage || 'رد عام';
        const type = params.type || 'general';
        const command = { action: 'addRule', botId: selectedBotId, type, content };
        const result = await executeInternalCommand(command);
        return result;
      }
      case 'deleteProduct': {
        const storeId = params.storeId || storedStoreId;
        const productId = params.productId;
        const productName = params.productName || 'المنتج';
        if (!storeId || !productId) {
          return { message: `أحتاج معرف المتجر والمنتج قبل الحذف. أرسل لي storeId ومعرف المنتج (أو اختَر المنتج من المتجر).` };
        }
        try {
          await handleApiRequest(`/api/products/${storeId}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          }, null, `فشل حذف ${productName}`);
          return { message: `تم حذف ${productName} بنجاح.` };
        } catch (err) {
          return { message: `تعذر حذف ${productName}: ${err.message}` };
        }
      }
      case 'chat':
      default:
        return { message: plan.responseMessage || 'حاضر.' };
    }
  }

  async function planUserIntent(message) {
    const plannerPrompt = `أنت مساعد تنفيذي في لوحة تحكم زين. حلّل طلب المستخدم وارجع JSON فقط بدون نص زائد.
  المفاتيح: intent (navigate | addRule | deleteProduct | pageGuide | chat)، params (object)، responseMessage (نص قصير)، requiresConfirmation (true/false).
  سياق:
  - القواعد: ليست كلمات مفتاحية؛ هي تعليمات/معلومات تُدمج في برومبت واحد يستهلكه الذكاء الاصطناعي للردود (تدريب للبوت). الأنواع: عامة، سؤال/جواب، أسعار، قنوات، وموحّدة للسوبر أدمن.
  - chat-page: صفحة تخصيص واجهة الدردشة العامة للعملاء؛ تسمح بتعديل رابط الصفحة وزر الدعم العائم/التضمين، رفع الشعار، تخصيص ألوان الهيدر/فقاعات المستخدم والبوت/الأزرار/الخلفيات، تفعيل رفع الصور، تفعيل وإدارة الأسئلة المقترحة، إخفاء الهيدر، ومعاينة التغييرات وأكواد التضمين الجاهزة.
  - messages: سجل الرسائل متعدد القنوات (فيسبوك/ويب/إنستجرام/واتساب) مع فلاتر وتصفح ومودال محادثة.
  - لا تشرح أكثر من صفحة في الرد الواحد. إذا احتاج الأمر ذكر صفحة، اذكر صفحة واحدة فقط.
  - أي طلب بصيغة اشرح/شرح/عرّف/ما هي/ممكن تفهمني/افهمني/فسر/ماهي صفحة X → استخدم intent=pageGuide واملأ params.page بالمفتاح الصحيح.
  - عند ذكر صفحة، أدرج وسمًا بالصيغة [[page:<key>]] حيث <key> من القائمة المسموحة، مرة واحدة فقط في الرد.
  - addRule: لو كان الطلب سؤال/إجابة، ضع type='qa' وcontent={question,answer}، وإلا type='general' مع النص.
  - navigate: الصفحات المسموحة bots, rules, chat-page, store-manager, orders-center, channels, facebook, instagram, whatsapp, messages, feedback, settings, wasenderpro.
  - pageGuide: استخدمه لشرح صفحة واحدة بناءً على السياق أعلاه.
  - deleteProduct: لو الاسم فقط متاح ضعه في productName واطلب storeId وproductId.
  - لو الطلب دردشة أو غير مدعوم، استخدم intent='chat' مع responseMessage مهذب.
  أعد JSON صالح فقط.`;

    const payloadMessage = selectedBotId ? `CTX_BOT:${selectedBotId}||${message}` : message;

    const aiResponse = await handleApiRequest('/api/bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        botId: assistantBotId,
        message: payloadMessage,
        userId,
        history: conversationHistory,
        systemPrompt: plannerPrompt,
      }),
    }, null, 'فشل في تحليل الطلب');

    try {
      if (!aiResponse || !aiResponse.reply) {
        return { intent: 'chat', responseMessage: 'أنا هنا، كيف أساعدك؟' };
      }
      return JSON.parse(aiResponse.reply || '{}');
    } catch (err) {
      // لو الرد نصّي وليس JSON، استخدمه كرسالة دردشة بدلاً من رسالة خطأ
      if (aiResponse && aiResponse.reply) {
        return { intent: 'chat', responseMessage: aiResponse.reply };
      }
      const fallbackPage = detectPageFromText(message);
      if (fallbackPage) {
        return { intent: 'pageGuide', params: { page: fallbackPage } };
      }
      return { intent: 'chat', responseMessage: 'لم أفهم الطلب، وضح أكثر.' };
    }
  }

  async function processMessage(message, lastMessageTimestamp) {
    try {
      // تأكيد أمر حساس معلق
      if (pendingAction) {
        if (isAffirmative(message)) {
          const result = await executePlannedIntent(pendingAction);
          appendBotMessage(result.message || 'تم التنفيذ.');
        } else if (isNegative(message)) {
          appendBotMessage('تم إلغاء الطلب بناءً على رغبتك.');
        } else {
          appendBotMessage('يرجى الرد بنعم أو لا لتأكيد الطلب المعلق.');
          return;
        }
        pendingAction = null;
        return;
      }

      // دائماً نخطط عبر الذكاء الاصطناعي ثم ننفذ
      const plan = await planUserIntent(message);

      if (requiresConfirmation(plan.intent) || plan.requiresConfirmation) {
        pendingAction = plan;
        const question = plan.confirmationMessage || `هل أنت متأكد أنك تريد تنفيذ الطلب: ${plan.responseMessage || plan.intent}? (نعم/لا)`;
        appendBotMessage(question);
        return;
      }

      const result = await executePlannedIntent(plan);
      let messageText = result.message || plan.responseMessage || 'تم التنفيذ.';
      // إذا كان المستخدم طلب شرح صفحة و AI لم يستخدم pageGuide، نُحوّل الرد للوصف الموثوق
      const enforced = ensurePageMarker(messageText, plan, message);
      messageText = enforced.message;
      if (enforced.pageKey) {
        await autoNavigateToPage(enforced.pageKey);
      }
      appendBotMessage(messageText);
    } catch (err) {
      console.error('خطأ في معالجة الرسالة:', err);
      const errorMessage = 'عذرًا، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى!';
      appendBotMessage(errorMessage);
    }
  }

  // دالة لتحليل الأوامر البسيطة مباشرة
  function parseSimpleCommand(message) {
    const navigateMatch = message.match(/(?:انتقل إلى|انتقل الي|افتح|افتح صفحة|مكمن تفتح) صفحة (القواعد|الرسايل|الرسائل|التقييمات|إعدادات فيسبوك|الفيسبوك|البوتات|التحليلات|تخصيص الدردشة)/i);
    if (navigateMatch) {
      const pageMap = {
        'القواعد': 'rules',
        'الرسايل': 'messages',
        'الرسائل': 'messages',
        'التقييمات': 'feedback',
        'إعدادات فيسبوك': 'facebook',
        'الفيسبوك': 'facebook',
        'البوتات': 'bots',
        'التحليلات': 'analytics',
        'تخصيص الدردشة': 'chat-page',
      };
      const page = pageMap[navigateMatch[1]];
      return {
        action: 'navigate',
        page,
        secretCode: 'EXECUTE_NOW',
      };
    }

    const addRuleMatch = message.match(/(?:أضف|ضيف) قاعدة(?: جديدة)?(?::\s*|\s+)(.+)/);
    if (addRuleMatch) {
      const content = addRuleMatch[1].trim();
      let type = 'general';
      if (content.includes('السؤال:') && content.includes('الإجابة:')) {
        type = 'qa';
      } else if (content.includes('بسعر')) {
        type = 'products';
      } else if (content.includes('مفتاح API:')) {
        type = 'api';
      } else if (content.includes('موحدة')) {
        type = 'global';
      }
      return {
        action: 'addRule',
        botId: selectedBotId,
        type,
        content,
        secretCode: 'EXECUTE_NOW',
      };
    }

    // نمط سريع لإضافة قاعدة سؤال/إجابة: "سؤال X ... يقوله Y"
    const qaMatch = message.match(/سؤال\s+(.+?)\s+(?:يقوله|يقول له|يرد عليه\s*ب?[:：]?|يرد عليه ب)\s*(.+)/i);
    if (qaMatch) {
      const question = qaMatch[1].trim();
      const answer = qaMatch[2].trim();
      if (question && answer) {
        return {
          action: 'addRule',
          botId: selectedBotId,
          type: 'qa',
          content: { question, answer },
          secretCode: 'EXECUTE_NOW',
        };
      }
    }

    return null;
  }

  async function executeInternalCommand(command) {
    if (!command.action) {
      throw new Error('الأمر غير صالح: يجب تحديد "action"');
    }

    switch (command.action) {
      case 'navigate':
        if (!command.page) {
          throw new Error('الأمر غير صالح: يجب تحديد page');
        }
        switch (command.page) {
          case 'rules':
            window.location.hash = 'rules';
            if (typeof window.loadRulesPage === 'function') {
              window.loadRulesPage();
            }
            return { message: 'تم الانتقال إلى صفحة القواعد' };
          case 'messages':
            window.location.hash = 'messages';
            if (typeof window.loadMessagesPage === 'function') {
              window.loadMessagesPage();
            }
            return { message: 'تم الانتقال إلى صفحة الرسائل' };
          case 'feedback':
            window.location.hash = 'feedback';
            if (typeof window.loadFeedbackPage === 'function') {
              window.loadFeedbackPage();
            }
            return { message: 'تم الانتقال إلى صفحة التقييمات' };
          case 'facebook':
            window.location.hash = 'facebook';
            if (typeof window.loadFacebookPage === 'function') {
              window.loadFacebookPage();
            }
            return { message: 'تم الانتقال إلى صفحة إعدادات فيسبوك' };
          case 'instagram':
            window.location.hash = 'instagram';
            if (typeof window.loadInstagramPage === 'function') {
              window.loadInstagramPage();
            }
            return { message: 'تم الانتقال إلى صفحة إعدادات إنستجرام' };
          case 'whatsapp':
            window.location.hash = 'whatsapp';
            if (typeof window.loadWhatsAppPage === 'function') {
              window.loadWhatsAppPage();
            }
            return { message: 'تم الانتقال إلى صفحة إعدادات واتساب' };
          case 'settings':
            window.location.hash = 'settings';
            if (typeof window.loadSettingsPage === 'function') {
              window.loadSettingsPage();
            }
            return { message: 'تم الانتقال إلى صفحة الإعدادات' };
          case 'wasenderpro':
            window.location.hash = 'wasenderpro';
            if (typeof window.loadWasenderProPage === 'function') {
              window.loadWasenderProPage();
            }
            return { message: 'تم الانتقال إلى Wasender Pro' };
          case 'channels':
            window.location.hash = 'channels';
            if (typeof window.loadChannelsPage === 'function') {
              window.loadChannelsPage();
            }
            return { message: 'تم الانتقال إلى قنوات البوت' };
          case 'orders-center':
            window.location.hash = 'orders-center';
            if (typeof window.loadOrdersCenterPage === 'function') {
              window.loadOrdersCenterPage();
            }
            return { message: 'تم الانتقال إلى متابعة الطلبات' };
          case 'store-manager':
            window.location.hash = 'store-manager';
            if (typeof window.loadStoreManagerPage === 'function') {
              window.loadStoreManagerPage();
            }
            return { message: 'تم الانتقال إلى مدير المتجر' };
          case 'bots':
            window.location.hash = 'bots';
            if (typeof window.loadBotsPage === 'function') {
              window.loadBotsPage();
            }
            return { message: 'تم الانتقال إلى صفحة البوتات' };
          case 'analytics':
            window.location.hash = 'analytics';
            if (typeof window.loadAnalyticsPage === 'function') {
              window.loadAnalyticsPage();
            }
            return { message: 'تم الانتقال إلى صفحة التحليلات' };
          case 'chat-page':
            window.location.hash = 'chat-page';
            if (typeof window.loadChatPage === 'function') {
              window.loadChatPage();
            }
            return { message: 'تم الانتقال إلى صفحة تخصيص الدردشة' };
          default:
            throw new Error('الصفحة غير مدعومة: ' + command.page);
        }

      case 'addRule':
        if (!command.botId || !command.type || !command.content) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وtype وcontent');
        }
        const addRuleResp = await handleApiRequest('/api/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            botId: command.botId,
            type: command.type,
            content: command.content,
          }),
        }, null, 'فشل في إضافة قاعدة');
        window.location.hash = 'rules';
        if (typeof window.loadRulesPage === 'function') {
          window.loadRulesPage();
        }
        return { message: 'تم إضافة القاعدة بنجاح' };

      case 'searchRule':
        if (!command.botId || !command.searchTerm) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsearchTerm');
        }
        const searchRuleResponse = await handleApiRequest(`/api/rules?botId=${command.botId}&search=${encodeURIComponent(command.searchTerm)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في البحث عن القاعدة');
        const { rules } = searchRuleResponse;
        if (rules.length === 0) {
          return { message: `لم أجد أي قاعدة تحتوي على "${command.searchTerm}"` };
        }
        const rule = rules[0];
        let contentDisplay = '';
        if (rule.type === 'general') contentDisplay = `المحتوى: ${rule.content}`;
        else if (rule.type === 'products') contentDisplay = `المنتج: ${rule.content.product}، السعر: ${rule.content.price} ${rule.content.currency}`;
        else if (rule.type === 'qa') contentDisplay = `السؤال: ${rule.content.question}، الإجابة: ${rule.content.answer}`;
        else if (rule.type === 'api') contentDisplay = `مفتاح API: ${rule.content.apiKey}`;
        else if (rule.type === 'global') contentDisplay = `المحتوى الموحد: ${rule.content}`;
        window.location.hash = 'rules';
        if (typeof window.loadRulesPage === 'function') {
          window.loadRulesPage();
        }
        return { message: `وجدت قاعدة: نوع القاعدة: ${rule.type}، ${contentDisplay}` };

      case 'searchMessages':
        if (!command.botId || !command.startDate || !command.endDate) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وstartDate وendDate');
        }
        const searchMessagesResponse = await handleApiRequest(`/api/messages/${command.botId}?type=${command.type || 'all'}&startDate=${command.startDate}&endDate=${command.endDate}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في البحث عن الرسائل');
        const messagesCount = searchMessagesResponse.length;
        window.location.hash = 'messages';
        if (typeof window.loadMessagesPage === 'function') {
          window.loadMessagesPage();
        }
        if (messagesCount === 0) {
          return { message: 'لم يتم العثور على رسائل في هذه الفترة' };
        }
        return { message: `تم العثور على ${messagesCount} رسالة في الفترة من ${command.startDate} إلى ${command.endDate}` };

      case 'searchFeedback':
        if (!command.botId || !command.type) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وtype');
        }
        const searchFeedbackResponse = await handleApiRequest(`/api/bots/${command.botId}/feedback`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في البحث عن التقييمات');
        const filteredFeedback = searchFeedbackResponse.filter(item => item.feedback === command.type);
        window.location.hash = 'feedback';
        if (typeof window.loadFeedbackPage === 'function') {
          window.loadFeedbackPage();
        }
        if (filteredFeedback.length === 0) {
          return { message: `لم يتم العثور على تقييمات ${command.type === 'positive' ? 'إيجابية' : 'سلبية'}` };
        }
        const feedbackItems = filteredFeedback.slice(0, 3).map(item => {
          const user = item.username || item.userId;
          const message = item.messageContent || 'غير متوفر';
          return `${user} - ${message}`;
        }).join('\n');
        return { message: `إليك أول 3 تقييمات ${command.type === 'positive' ? 'إيجابية' : 'سلبية'}:\n${feedbackItems}` };

      case 'editBotReply':
        if (!command.botId || !command.userName || !command.newReply || !command.type) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وuserName وnewReply وtype');
        }
        const messagesResponse = await handleApiRequest(`/api/messages/${command.botId}?type=${command.type}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في جلب المحادثات');
        const userConversation = messagesResponse.find(conv => conv.userId.includes(command.userName));
        if (!userConversation) {
          throw new Error(`لم يتم العثور على محادثة مع "${command.userName}"`);
        }
        const messages = userConversation.messages;
        let lastUserMessageIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
          }
        }
        if (lastUserMessageIndex === -1) {
          throw new Error('لم يتم العثور على سؤال من المستخدم في المحادثة');
        }
        const question = messages[lastUserMessageIndex].content;
        const editRuleResp = await handleApiRequest('/api/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            botId: command.botId,
            type: 'qa',
            content: { question, answer: command.newReply },
          }),
        }, null, 'فشل في تعديل رد البوت');
        window.location.hash = 'messages';
        if (typeof window.loadMessagesPage === 'function') {
          window.loadMessagesPage();
        }
        return { message: `تم تعديل رد البوت في محادثة "${command.userName}" إلى "${command.newReply}"` };

      case 'updateChatPageSettings':
        if (!command.botId || !command.settings) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsettings');
        }
        const chatPageResponse = await handleApiRequest(`/api/chat-page/bot/${command.botId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في جلب بيانات صفحة الدردشة');
        const chatPageId = chatPageResponse.chatPageId;
        const updateSettingsResponse = await handleApiRequest(`/api/chat-page/${chatPageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(command.settings),
        }, null, 'فشل في تعديل إعدادات صفحة الدردشة');
        window.location.hash = 'chat-page';
        if (typeof window.loadChatPage === 'function') {
          window.loadChatPage();
        }
        return { message: 'تم تعديل إعدادات صفحة الدردشة بنجاح' };

      case 'updateChatPageColors':
        if (!command.botId || !command.colors) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وcolors');
        }
        const chatPageColorResponse = await handleApiRequest(`/api/chat-page/bot/${command.botId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في جلب بيانات صفحة الدردشة');
        const chatPageColorId = chatPageColorResponse.chatPageId;
        const updateColorsResponse = await handleApiRequest(`/api/chat-page/${chatPageColorId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ colors: command.colors }),
        }, null, 'فشل في تعديل ألوان صفحة الدردشة');
        window.location.hash = 'chat-page';
        if (typeof window.loadChatPage === 'function') {
          window.loadChatPage();
        }
        return { message: 'تم تغيير الألوان بنجاح' };

      case 'updateFacebookSettings':
        if (!command.botId || !command.settingKey || command.value === undefined) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsettingKey وvalue');
        }
        const updateFacebookResponse = await handleApiRequest(`/api/bots/${command.botId}/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ [command.settingKey]: command.value }),
        }, null, 'فشل في تعديل إعدادات فيسبوك');
        window.location.hash = 'facebook';
        if (typeof window.loadFacebookPage === 'function') {
          window.loadFacebookPage();
        }
        return { message: 'تم تفعيل الإعداد بنجاح' };

      case 'createBot':
        if (!command.name) {
          throw new Error('الأمر غير صالح: يجب تحديد name');
        }
        const createBotResponse = await handleApiRequest('/api/bots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            name: command.name,
            userId: command.userId || localStorage.getItem('userId'),
            facebookApiKey: command.facebookApiKey || '',
            facebookPageId: command.facebookPageId || '',
          }),
        }, null, 'فشل في إنشاء البوت');
        window.location.hash = 'bots';
        if (typeof window.loadBotsPage === 'function') {
          window.loadBotsPage();
        }
        return { message: 'تم إنشاء البوت بنجاح' };

      case 'showAnalytics':
        if (!command.botId) {
          throw new Error('الأمر غير صالح: يجب تحديد botId');
        }
        const analyticsResponse = await handleApiRequest(`/api/bots/${command.botId}/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }, null, 'فشل في جلب الإحصائيات');
        window.location.hash = 'analytics';
        if (typeof window.loadAnalyticsPage === 'function') {
          window.loadAnalyticsPage();
        }
        return { message: `إحصائيات البوت:\nعدد الرسائل: ${analyticsResponse.messagesCount}\nالقواعد النشطة: ${analyticsResponse.activeRules}` };

      default:
        throw new Error('الأمر غير مدعوم: ' + command.action);
    }
  }

  async function retryCommandWithAI(command, errorMessage) {
    const retryPrompt = `
الأمر التالي فشل بسبب خطأ: ${errorMessage}
الأمر: ${JSON.stringify(command)}
حاول إعادة صياغة الأمر بشكل صحيح بناءً على الخطأ. ارجع الأمر الجديد في صيغة JSON مع إضافة "secretCode": "EXECUTE_NOW".
`;

    const retryData = await handleApiRequest('/api/bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        botId: ASSISTANT_BOT_ID,
        message: retryPrompt,
        userId,
        history: conversationHistory,
      }),
    }, null, 'فشل في إعادة صياغة الأمر');

    return JSON.parse(retryData.reply);
  }
});
