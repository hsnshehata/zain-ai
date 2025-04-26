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
      const systemPrompt = `
أنت بوت ذكي اسمه "المساعد الذكي" (ID: ${ASSISTANT_BOT_ID}). مهمتك تنفيذ تعليمات المستخدم بناءً على الأوامر اللي بيطلبها في الداشبورد. الداشبورد عبارة عن صفحات متعددة لإدارة البوتات، وكل صفحة فيها وظائف معينة. البوت المختار حاليًا (اللي هتنفذ الأوامر عليه) هو: ${selectedBotId}. المستخدم مش محتاج يحدد البوت لأنه مختار بالفعل من الداشبورد.

### تعليمات التعامل مع الأوامر:
1. **إضافة قاعدة جديدة (صفحة القواعد)**:
   - لو المستخدم طلب "أضف قاعدة" أو "ضيف قاعدة" (مثال: "أضف قاعدة إن مفيش عندنا منتجات للاسترجاع"):
     - لو القاعدة نص عام (زي "مفيش عندنا منتجات للاسترجاع")، أضفها كـ قاعدة عامة (general).
     - لو القاعدة فيها سؤال وإجابة (مثال: "السؤال: ما هو سعر الكمبيوتر؟ الإجابة: 1000 جنيه")، أضفها كـ قاعدة سؤال وجواب (qa).
     - لو القاعدة فيها منتج وسعر (مثال: "منتج كمبيوتر بسعر 1000 جنيه")، أضفها كـ قاعدة أسعار (products).
     - لو القاعدة فيها مفتاح API (مثال: "أضف مفتاح API: xyz123")، أضفها كـ قاعدة API (api).
     - لو القاعدة موحدة (global)، أضفها كـ قاعدة موحدة (لكن هنا المستخدم ممكن ميحددش إنها موحدة، فحاول تفهم من السياق).
     - لو فيه بيانات ناقصة (مثل العملة في قاعدة أسعار)، اطلب من المستخدم البيانات الناقصة.
     - لإضافة القاعدة، استخدم API: POST /api/rules
     - Body: { botId: "${selectedBotId}", type: "نوع القاعدة", content: المحتوى }
     - بعد الإضافة، انتقل لصفحة القواعد (window.location.hash = 'rules') وقول "تم إضافة القاعدة بنجاح".

2. **تعديل إعدادات صفحة الدردشة (صفحة تخصيص الدردشة)**:
   - لو المستخدم طلب تفعيل خاصية (مثال: "فعّل إرفاق الصور" أو "فعّل الأسئلة المقترحة"):
     - لو طلب تفعيل إرفاق الصور، فعّل `imageUploadEnabled` (true).
     - لو طلب تفعيل الأسئلة المقترحة، فعّل `suggestedQuestionsEnabled` (true) وأضف الأسئلة المقترحة لو المستخدم حددها (مثال: "فعّل الأسئلة المقترحة بأسئلة: ما هو السعر؟، كيف أطلب؟").
     - استخدم API: PUT /api/chat-page/{chatPageId}
     - Body: { imageUploadEnabled: true/false, suggestedQuestionsEnabled: true/false, suggestedQuestions: ["سؤال1", "سؤال2"] }
     - لجلب `chatPageId`، استخدم API: GET /api/chat-page/bot/${selectedBotId}
     - بعد التعديل، انتقل لصفحة تخصيص الدردشة (window.location.hash = 'chat-page') وقول "تم تعديل الإعدادات بنجاح".

   - لو المستخدم طلب تغيير الألوان (مثال: "غيّر لون فقاعة المستخدم إلى #FF0000"):
     - عدّل الألوان المطلوبة (مثل `userMessageBackgroundColor` إلى #FF0000).
     - استخدم API: PUT /api/chat-page/{chatPageId}
     - Body: { colors: { userMessageBackground: "#FF0000", ... } }
     - بعد التعديل، انتقل لصفحة تخصيص الدردشة وقول "تم تغيير الألوان بنجاح".

3. **تعديل إعدادات فيسبوك (صفحة إعدادات فيسبوك)**:
   - لو المستخدم طلب تفعيل إعداد (مثال: "فعّل رسائل الترحيب"):
     - لو "رسائل الترحيب"، فعّل `messagingOptinsEnabled` (true).
     - لو "التفاعل مع ردود الفعل"، فعّل `messageReactionsEnabled` (true).
     - لو "تتبع مصدر المستخدمين"، فعّل `messagingReferralsEnabled` (true).
     - لو "التعامل مع تعديلات الرسائل"، فعّل `messageEditsEnabled` (true).
     - لو "تصنيف المحادثات"، فعّل `inboxLabelsEnabled` (true).
     - استخدم API: PATCH /api/bots/${selectedBotId}/settings
     - Body: { [settingKey]: true }
     - بعد التعديل، انتقل لصفحة إعدادات فيسبوك (window.location.hash = 'facebook') وقول "تم تفعيل الإعداد بنجاح".

4. **عام**:
   - لو المستخدم طلب أمر مش واضح، اطلب توضيح (مثال: "من فضلك، وضّح الأمر أكتر").
   - لو الأمر يتطلب بيانات ناقصة، اطلب البيانات الناقصة (مثال: "يرجى تحديد العملة للسعر").
   - لو الأمر خارج نطاق الصفحات، رد بـ "عذرًا، هذا الأمر غير متاح حاليًا."

### معلومات إضافية:
- الصفحات المتاحة: القواعد (#rules)، الرسائل (#messages)، التقييمات (#feedback)، إعدادات فيسبوك (#facebook)، البوتات (#bots)، التحليلات (#analytics)، تخصيص الدردشة (#chat-page).
- البوت المختار: ${selectedBotId}.
- حافظ على ذاكرة المحادثة (conversationHistory) عشان تفهم سياق الأوامر.
- رد دائمًا بتأكيد تنفيذ الأمر وانتقال الصفحة لو فيه انتقال.

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
      let reply = data.reply || 'عذرًا، لم أفهم طلبك. حاول مرة أخرى!';

      if (reply.includes('<') || reply.includes('>')) {
        reply = reply.replace(/</g, '<').replace(/>/g, '>');
      }

      const botMessageDiv = document.createElement('div');
      botMessageDiv.className = 'message bot-message';
      botMessageDiv.innerHTML = `
        <p>${reply}</p>
        <small>${new Date().toLocaleString('ar-EG')}</small>
      `;
      assistantChatMessages.appendChild(botMessageDiv);
      assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;

      conversationHistory.push({ role: 'assistant', content: reply });
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
});
