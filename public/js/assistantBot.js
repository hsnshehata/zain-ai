document.addEventListener('DOMContentLoaded', () => {
  const assistantButton = document.getElementById('assistantButton');
  const assistantChatModal = document.getElementById('assistantChatModal');
  const closeAssistantChatBtn = document.getElementById('closeAssistantChatBtn');
  const assistantMessageInput = document.getElementById('assistantMessageInput');
  const assistantSendMessageBtn = document.getElementById('assistantSendMessageBtn');
  const assistantChatMessages = document.getElementById('assistantChatMessages');

  const ASSISTANT_BOT_ID = '68087d93c0124c9fe05a6996';
  const selectedBotId = localStorage.getItem('selectedBotId');
  let userId = localStorage.getItem('userId') || 'dashboard_user_' + Date.now();
  let conversationHistory = [];

  if (!selectedBotId) {
    assistantChatMessages.innerHTML = `
      <div class="message bot-message">
        <p>يرجى اختيار بوت من لوحة التحكم أولاً لتنفيذ العمليات.</p>
        <small>${new Date().toLocaleString('ar-EG')}</small>
      </div>
    `;
    return;
  }

  const welcomeTimestamp = document.getElementById('welcomeTimestamp');
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

    await processMessage(message, lastMessageTimestamp);
  }

  async function processMessage(message, lastMessageTimestamp) {
    try {
      // التحقق من الأوامر البسيطة مباشرة في الكود
      let internalCommand = parseSimpleCommand(message);

      if (!internalCommand) {
        // لو الأمر مش بسيط، بنستخدم الذكاء الاصطناعي
        const systemPrompt = `
أنت بوت ذكي اسمه "المساعد الذكي" (ID: ${ASSISTANT_BOT_ID}). مهمتك تنفيذ تعليمات المستخدم بناءً على الأوامر اللي بيطلبها في الداشبورد. الداشبورد عبارة عن صفحات متعددة لإدارة البوتات، وكل صفحة فيها وظائف معينة. البوت المختار حاليًا (اللي هتنفذ الأوامر عليه) هو: ${selectedBotId}. المستخدم مش محتاج يحدد البوت لأنه مختار بالفعل من الداشبورد.

### تعليمات التعامل مع الأوامر:
#### 1. **التنقل بين الصفحات**:
- لو المستخدم طلب "انتقل إلى صفحة" أو "افتح صفحة" (مثال: "انتقل إلى صفحة التقييمات"):
  - حدد اسم الصفحة المطلوبة (مثل "التقييمات").
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "navigate",
      "page": "اسم الصفحة (rules, messages, feedback, facebook, bots, analytics, chat-page)",
      "secretCode": "EXECUTE_NOW"
    }

#### 2. **إضافة قاعدة جديدة (صفحة القواعد)**:
- لو المستخدم طلب "أضف قاعدة" أو "ضيف قاعدة" (مثال: "أضف قاعدة إن مفيش عندنا منتجات للاسترجاع"):
  - لو القاعدة نص عام (زي "مفيش عندنا منتجات للاسترجاع")، أضفها كـ قاعدة عامة (general).
  - لو القاعدة فيها سؤال وإجابة (مثال: "السؤال: ما هو سعر الكمبيوتر؟ الإجابة: 1000 جنيه")، أضفها كـ قاعدة سؤال وجواب (qa).
  - لو القاعدة فيها منتج وسعر (مثال: "منتج كمبيوتر بسعر 1000 جنيه")، أضفها كـ قاعدة أسعار (products).
  - لو القاعدة فيها مفتاح API (مثال: "أضف مفتاح API: xyz123")، أضفها كـ قاعدة API (api).
  - لو القاعدة موحدة (global)، أضفها كـ قاعدة موحدة (لكن هنا المستخدم ممكن ميحددش إنها موحدة، فحاول تفهم من السياق).
  - لو فيه بيانات ناقصة (مثل العملة في قاعدة أسعار)، اطلب من المستخدم البيانات الناقصة.
  - لإضافة القاعدة، ارجع الأمر مصاغ بشكل صحيح للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "addRule",
      "botId": "${selectedBotId}",
      "type": "نوع القاعدة (general, qa, products, api, global)",
      "content": المحتوى (نص أو كائن JSON بناءً على نوع القاعدة),
      "secretCode": "EXECUTE_NOW"
    }

#### 3. **البحث في القواعد (صفحة القواعد)**:
- لو المستخدم طلب "ابحث عن قاعدة" أو "دور على قاعدة" (مثال: "ابحث عن قاعدة تحتوي على كمبيوتر"):
  - ابحث عن القاعدة بناءً على النص المطلوب (مثل "كمبيوتر").
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "searchRule",
      "botId": "${selectedBotId}",
      "searchTerm": "النص المطلوب البحث عنه",
      "secretCode": "EXECUTE_NOW"
    }

#### 4. **البحث في الرسائل (صفحة الرسائل)**:
- لو المستخدم طلب "ابحث عن رسائل" أو "دور على رسائل" (مثال: "ابحث عن رسائل من تاريخ 2025-04-01 إلى 2025-04-10"):
  - استخرج التواريخ من الأمر (مثل من 2025-04-01 إلى 2025-04-10).
  - لو فيه نوع رسائل محدد (فيسبوك، ويب، واتساب)، حدده (مثال: "ابحث عن رسائل فيسبوك").
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "searchMessages",
      "botId": "${selectedBotId}",
      "type": "نوع الرسائل (facebook, web, whatsapp) أو all لو مش محدد",
      "startDate": "تاريخ البداية (ISO format)",
      "endDate": "تاريخ النهاية (ISO format)",
      "secretCode": "EXECUTE_NOW"
    }

#### 5. **البحث في التقييمات (صفحة التقييمات)**:
- لو المستخدم طلب "ابحث عن تقييمات" أو "دور على تقييمات" (مثال: "ابحث عن تقييمات إيجابية"):
  - حدد نوع التقييم (إيجابي أو سلبي).
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "searchFeedback",
      "botId": "${selectedBotId}",
      "type": "نوع التقييم (positive أو negative)",
      "secretCode": "EXECUTE_NOW"
    }

#### 6. **تعديل رد البوت في صفحة الرسائل**:
- لو المستخدم طلب "عدل رد البوت" (مثال: "عدل رد البوت في محادثة مع مستخدم 1 إلى الرد: السعر 2000 جنيه"):
  - استخرج اسم المستخدم (مثل "مستخدم 1") والرد الجديد (مثل "السعر 2000 جنيه").
  - ابحث عن آخر سؤال من المستخدم في المحادثة لربطه بالرد الجديد.
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "editBotReply",
      "botId": "${selectedBotId}",
      "userName": "اسم المستخدم",
      "newReply": "الرد الجديد",
      "type": "نوع الرسائل (facebook, web, whatsapp) أو all لو مش محدد",
      "secretCode": "EXECUTE_NOW"
    }

#### 7. **تعديل إعدادات صفحة الدردشة (صفحة تخصيص الدردشة)**:
- لو المستخدم طلب تفعيل خاصية (مثال: "فعّل إرفاق الصور" أو "فعّل الأسئلة المقترحة"):
  - لو طلب تفعيل إرفاق الصور، فعّل imageUploadEnabled (true).
  - لو طلب تفعيل الأسئلة المقترحة، فعّل suggestedQuestionsEnabled (true) وأضف الأسئلة المقترحة لو المستخدم حددها (مثال: "فعّل الأسئلة المقترحة بأسئلة: ما هو السعر؟، كيف أطلب؟").
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "updateChatPageSettings",
      "botId": "${selectedBotId}",
      "settings": {
        "imageUploadEnabled": true/false,
        "suggestedQuestionsEnabled": true/false,
        "suggestedQuestions": ["سؤال1", "سؤال2"]
      },
      "secretCode": "EXECUTE_NOW"
    }

- لو المستخدم طلب تغيير الألوان (مثال: "غيّر لون فقاعة المستخدم إلى #FF0000"):
  - الألوان المتاحة في صفحة الدردشة:
    - titleColor: لون نص العنوان (مثال: #333333).
    - headerColor: لون الهيدر (مثال: #f8f9fa).
    - chatAreaBackgroundColor: لون خلفية مربع الدردشة (مثال: #ffffff).
    - textColor: لون النص العام (مثال: #333333).
    - userMessageBackgroundColor: لون فقاعة المستخدم (مثال: #007bff).
    - userMessageTextColor: لون نص المستخدم (مثال: #ffffff).
    - botMessageBackgroundColor: لون فقاعة البوت (مثال: #e9ecef).
    - botMessageTextColor: لون نص البوت (مثال: #333333).
    - buttonColor: لون الأزرار المقترحة (مثال: #007bff).
    - backgroundColor: لون الخلفية (مثال: #f8f9fa).
    - inputTextColor: لون نص مربع الإدخال (مثال: #333333).
    - sendButtonColor: لون زر الإرسال (مثال: #007bff).
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "updateChatPageColors",
      "botId": "${selectedBotId}",
      "colors": {
        "userMessageBackgroundColor": "#FF0000"
      },
      "secretCode": "EXECUTE_NOW"
    }

#### 8. **تعديل إعدادات فيسبوك (صفحة إعدادات فيسبوك)**:
- لو المستخدم طلب تفعيل إعداد (مثال: "فعّل رسائل الترحيب"):
  - لو "رسائل الترحيب"، فعّل messagingOptinsEnabled (true).
  - لو "التفاعل مع ردود الفعل"، فعّل messageReactionsEnabled (true).
  - لو "تتبع مصدر المستخدمين"، فعّل messagingReferralsEnabled (true).
  - لو "التعامل مع تعديلات الرسائل"، فعّل messageEditsEnabled (true).
  - لو "تصنيف المحادثات"، فعّل inboxLabelsEnabled (true).
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "updateFacebookSettings",
      "botId": "${selectedBotId}",
      "settingKey": "messagingOptinsEnabled",
      "value": true,
      "secretCode": "EXECUTE_NOW"
    }

#### 9. **إنشاء بوت جديد (صفحة البوتات)**:
- لو المستخدم طلب "أنشئ بوت جديد" (مثال: "أنشئ بوت جديد باسم بوت التسويق"):
  - استخرج اسم البوت (مثل "بوت التسويق").
  - اطلب من المستخدم اختيار المستخدم المرتبط بالبوت لو مش محدد.
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "createBot",
      "name": "اسم البوت",
      "userId": "معرف المستخدم (لو مش محدد، اطلب من المستخدم)",
      "facebookApiKey": "رقم API لفيسبوك (اختياري، لو مش محدد استخدم قيمة فارغة)",
      "facebookPageId": "معرف صفحة فيسبوك (اختياري، لو مش محدد استخدم قيمة فارغة)",
      "secretCode": "EXECUTE_NOW"
    }

#### 10. **عرض الإحصائيات (صفحة التحليلات)**:
- لو المستخدم طلب "اعرض إحصائيات" (مثال: "اعرض إحصائيات البوت"):
  - ارجع الأمر للبوت الداخلي في صيغة JSON مع رمز سري للتنفيذ:
    {
      "action": "showAnalytics",
      "botId": "${selectedBotId}",
      "secretCode": "EXECUTE_NOW"
    }

#### 11. **عام**:
- لو المستخدم طلب أمر مش واضح، اطلب توضيح (مثال: "من فضلك، وضّح الأمر أكتر").
- لو الأمر يتطلب بيانات ناقصة، اطلب البيانات الناقصة (مثال: "يرجى تحديد العملة للسعر").
- لو الأمر خارج نطاق الصفحات، رد بـ "عذرًا، هذا الأمر غير متاح حاليًا."
- دائمًا رجّع الأوامر في صيغة JSON مع الرمز السري "EXECUTE_NOW" عشان النظام الداخلي ينفذ الأمر.

### معلومات إضافية:
- الصفحات المتاحة: القواعد (#rules)، الرسائل (#messages)، التقييمات (#feedback)، إعدادات فيسبوك (#facebook)، البوتات (#bots)، التحليلات (#analytics)، تخصيص الدردشة (#chat-page).
- البوت المختار: ${selectedBotId}.
- حافظ على ذاكرة المحادثة (conversationHistory) عشان تفهم سياق الأوامر.
- ارجع الأمر للبوت الداخلي دائمًا في صيغة JSON مع الرمز السري "EXECUTE_NOW".

### الآن، نفّذ الأمر التالي بناءً على التعليمات أعلاه:
الأمر: "${message}"
`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
        ];

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
            history: conversationHistory,
          }),
        });

        if (!response.ok) {
          throw new Error('فشل في معالجة الرسالة');
        }

        const data = await response.json();
        internalCommand = JSON.parse(data.reply);
      }

      // التحقق من الرمز السري
      if (internalCommand.secretCode !== 'EXECUTE_NOW') {
        throw new Error('الأمر غير صالح: الرمز السري غير موجود أو غير صحيح');
      }

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const executionResult = await executeInternalCommand(internalCommand);
          const botMessageDiv = document.createElement('div');
          botMessageDiv.className = 'message bot-message';
          botMessageDiv.innerHTML = `
            <p>${executionResult.message}</p>
            <small>${new Date().toLocaleString('ar-EG')}</small>
          `;
          assistantChatMessages.appendChild(botMessageDiv);
          assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
          conversationHistory.push({ role: 'assistant', content: executionResult.message });
          break;
        } catch (err) {
          retryCount++;
          if (retryCount === maxRetries) {
            const errorMessage = `فشلت في تنفيذ الأمر بعد ${maxRetries} محاولات: ${err.message}`;
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'message bot-message';
            botMessageDiv.innerHTML = `
              <p>${errorMessage}</p>
              <small>${new Date().toLocaleString('ar-EG')}</small>
            `;
            assistantChatMessages.appendChild(botMessageDiv);
            assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
            conversationHistory.push({ role: 'assistant', content: errorMessage });
            break;
          }

          internalCommand = await retryCommandWithAI(internalCommand, err.message);
        }
      }
    } catch (err) {
      console.error('خطأ في معالجة الرسالة:', err);
      const errorMessage = 'عذرًا، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى!';
      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.innerHTML = `
        <p>${errorMessage}</p>
        <small>${new Date().toLocaleString('ar-EG')}</small>
      `;
      assistantChatMessages.appendChild(botMessageDiv);
      assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
      conversationHistory.push({ role: 'assistant', content: errorMessage });
    }
  }

  // دالة لتحليل الأوامر البسيطة مباشرة
  function parseSimpleCommand(message) {
    const navigateMatch = message.match(/(?:انتقل إلى|افتح) صفحة (القواعد|الرسائل|التقييمات|إعدادات فيسبوك|البوتات|التحليلات|تخصيص الدردشة)/);
    if (navigateMatch) {
      const pageMap = {
        'القواعد': 'rules',
        'الرسائل': 'messages',
        'التقييمات': 'feedback',
        'إعدادات فيسبوك': 'facebook',
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
      let type = 'general'; // افتراضيًا القاعدة عامة
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
        const addRuleResp = await fetch('/api/rules', {
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
        });
        if (!addRuleResp.ok) {
          throw new Error('فشل في إضافة قاعدة: ' + (await addRuleResp.text()));
        }
        window.location.hash = 'rules';
        if (typeof window.loadRulesPage === 'function') {
          window.loadRulesPage();
        }
        return { message: 'تم إضافة القاعدة بنجاح' };

      case 'searchRule':
        if (!command.botId || !command.searchTerm) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsearchTerm');
        }
        const searchRuleResponse = await fetch(`/api/rules?botId=${command.botId}&search=${encodeURIComponent(command.searchTerm)}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!searchRuleResponse.ok) {
          throw new Error('فشل في البحث عن القاعدة: ' + (await searchRuleResponse.text()));
        }
        const { rules } = await searchRuleResponse.json();
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
        const searchMessagesResponse = await fetch(`/api/messages/${command.botId}?type=${command.type || 'all'}&startDate=${command.startDate}&endDate=${command.endDate}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!searchMessagesResponse.ok) {
          throw new Error('فشل في البحث عن الرسائل: ' + (await searchMessagesResponse.text()));
        }
        const messagesData = await searchMessagesResponse.json();
        const messagesCount = messagesData.length;
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
        const searchFeedbackResponse = await fetch(`/api/bots/${command.botId}/feedback`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!searchFeedbackResponse.ok) {
          throw new Error('فشل في البحث عن التقييمات: ' + (await searchFeedbackResponse.text()));
        }
        const feedbackData = await searchFeedbackResponse.json();
        const filteredFeedback = feedbackData.filter(item => item.feedback === command.type);
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
        const messagesResponse = await fetch(`/api/messages/${command.botId}?type=${command.type}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!messagesResponse.ok) {
          throw new Error('فشل في جلب المحادثات: ' + (await messagesResponse.text()));
        }
        const messageConversations = await messagesResponse.json();
        const userConversation = messageConversations.find(conv => conv.userId.includes(command.userName));
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
        const editRuleResp = await fetch('/api/rules', {
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
        });
        if (!editRuleResp.ok) {
          throw new Error('فشل في تعديل رد البوت: ' + (await editRuleResp.text()));
        }
        window.location.hash = 'messages';
        if (typeof window.loadMessagesPage === 'function') {
          window.loadMessagesPage();
        }
        return { message: `تم تعديل رد البوت في محادثة "${command.userName}" إلى "${command.newReply}"` };

      case 'updateChatPageSettings':
        if (!command.botId || !command.settings) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsettings');
        }
        const chatPageResponse = await fetch(`/api/chat-page/bot/${command.botId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!chatPageResponse.ok) {
          throw new Error('فشل في جلب بيانات صفحة الدردشة: ' + (await chatPageResponse.text()));
        }
        const chatPageData = await chatPageResponse.json();
        const chatPageId = chatPageData.chatPageId;
        const updateSettingsResponse = await fetch(`/api/chat-page/${chatPageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(command.settings),
        });
        if (!updateSettingsResponse.ok) {
          throw new Error('فشل في تعديل إعدادات صفحة الدردشة: ' + (await updateSettingsResponse.text()));
        }
        window.location.hash = 'chat-page';
        if (typeof window.loadChatPage === 'function') {
          window.loadChatPage();
        }
        return { message: 'تم تعديل إعدادات صفحة الدردشة بنجاح' };

      case 'updateChatPageColors':
        if (!command.botId || !command.colors) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وcolors');
        }
        const chatPageColorResponse = await fetch(`/api/chat-page/bot/${command.botId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!chatPageColorResponse.ok) {
          throw new Error('فشل في جلب بيانات صفحة الدردشة: ' + (await chatPageColorResponse.text()));
        }
        const chatPageColorData = await chatPageColorResponse.json();
        const chatPageColorId = chatPageColorData.chatPageId;
        const updateColorsResponse = await fetch(`/api/chat-page/${chatPageColorId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ colors: command.colors }),
        });
        if (!updateColorsResponse.ok) {
          throw new Error('فشل في تعديل ألوان صفحة الدردشة: ' + (await updateColorsResponse.text()));
        }
        window.location.hash = 'chat-page';
        if (typeof window.loadChatPage === 'function') {
          window.loadChatPage();
        }
        return { message: 'تم تغيير الألوان بنجاح' };

      case 'updateFacebookSettings':
        if (!command.botId || !command.settingKey || command.value === undefined) {
          throw new Error('الأمر غير صالح: يجب تحديد botId وsettingKey وvalue');
        }
        const updateFacebookResponse = await fetch(`/api/bots/${command.botId}/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ [command.settingKey]: command.value }),
        });
        if (!updateFacebookResponse.ok) {
          throw new Error('فشل في تعديل إعدادات فيسبوك: ' + (await updateFacebookResponse.text()));
        }
        window.location.hash = 'facebook';
        if (typeof window.loadFacebookPage === 'function') {
          window.loadFacebookPage();
        }
        return { message: 'تم تفعيل الإعداد بنجاح' };

      case 'createBot':
        if (!command.name) {
          throw new Error('الأمر غير صالح: يجب تحديد name');
        }
        const createBotResponse = await fetch('/api/bots', {
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
        });
        if (!createBotResponse.ok) {
          throw new Error('فشل في إنشاء البوت: ' + (await createBotResponse.text()));
        }
        window.location.hash = 'bots';
        if (typeof window.loadBotsPage === 'function') {
          window.loadBotsPage();
        }
        return { message: 'تم إنشاء البوت بنجاح' };

      case 'showAnalytics':
        if (!command.botId) {
          throw new Error('الأمر غير صالح: يجب تحديد botId');
        }
        const analyticsResponse = await fetch(`/api/bots/${command.botId}/analytics`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!analyticsResponse.ok) {
          throw new Error('فشل في جلب الإحصائيات: ' + (await analyticsResponse.text()));
        }
        const analyticsData = await analyticsResponse.json();
        window.location.hash = 'analytics';
        if (typeof window.loadAnalyticsPage === 'function') {
          window.loadAnalyticsPage();
        }
        return { message: `إحصائيات البوت:\nعدد الرسائل: ${analyticsData.messagesCount}\nالقواعد النشطة: ${analyticsData.activeRules}` };

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

    const retryResponse = await fetch('/api/bot', {
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
    });

    if (!retryResponse.ok) {
      throw new Error('فشل في إعادة صياغة الأمر');
    }

    const retryData = await retryResponse.json();
    return JSON.parse(retryData.reply);
  }
});
