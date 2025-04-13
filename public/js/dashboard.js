document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  if (!localStorage.getItem('token')) {
    window.location.href = '/';
    return;
  }

  // إعداد الأزرار مع التحقق من دور المستخدم
  const botsBtn = document.getElementById('botsBtn');
  if (role !== 'superadmin') {
    if (botsBtn) {
      botsBtn.style.display = 'none';
    }
  } else {
    if (botsBtn) {
      botsBtn.addEventListener('click', () => {
        window.location.hash = 'bots';
        loadPageBasedOnHash();
      });
    }
  }

  document.getElementById('rulesBtn').addEventListener('click', () => {
    window.location.hash = 'rules';
    loadPageBasedOnHash();
  });

  document.getElementById('whatsappBtn').addEventListener('click', () => {
    window.location.hash = 'whatsapp';
    loadPageBasedOnHash();
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      console.log('📤 Sending logout request for username:', localStorage.getItem('username'));
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: localStorage.getItem('username') }),
      });

      const data = await response.json();
      console.log('📥 Logout response:', data);

      if (response.ok && data.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        console.log('✅ Logout successful, localStorage cleared');
        window.location.href = '/';
      } else {
        console.log('❌ Logout failed:', data.message);
        alert('فشل تسجيل الخروج، حاول مرة أخرى');
      }
    } catch (err) {
      console.error('❌ Error during logout:', err);
      alert('حدث خطأ أثناء تسجيل الخروج');
    }
  });

  // دالة جلب القواعد
  const loadRules = async (botId, rulesList, token) => {
    try {
      const response = await fetch(`/api/rules?botId=${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('فشل في جلب القواعد');
      }
      const rules = await response.json();
      rulesList.innerHTML = '';
      if (rules.length === 0) {
        rulesList.innerHTML = '<li>لا توجد قواعد لهذا البوت.</li>';
      } else {
        rules.forEach(rule => {
          const li = document.createElement('li');
          let contentDisplay = '';
          if (rule.type === 'general') {
            contentDisplay = `المحتوى العام: ${rule.content}`;
          } else if (rule.type === 'global') {
            contentDisplay = `المحتوى الموحد: ${rule.content}`;
          } else if (rule.type === 'products') {
            contentDisplay = `المنتج: ${rule.content.product} | السعر: ${rule.content.price} ${rule.content.currency}`;
          } else if (rule.type === 'qa') {
            contentDisplay = `السؤال: ${rule.content.question} | الإجابة: ${rule.content.answer}`;
          } else if (rule.type === 'api') {
            contentDisplay = `مفتاح API: ${rule.content.apiKey}`;
          }
          li.innerHTML = `
            نوع القاعدة: ${rule.type} | ${contentDisplay}
            <button onclick="editRule('${rule._id}')">تعديل</button>
            <button onclick="deleteRule('${rule._id}')">حذف</button>
          `;
          rulesList.appendChild(li);
        });
      }
    } catch (err) {
      console.error('خطأ في جلب القواعد:', err);
      rulesList.innerHTML = '<li style="color: red;">تعذر جلب القواعد، حاول مرة أخرى لاحقًا.</li>';
    }
  };

  // تحميل الصفحة بناءً على الـ Hash
  const loadPageBasedOnHash = async () => {
    const hash = window.location.hash;
    const userRole = localStorage.getItem('role');

    if (userRole !== 'superadmin' && !hash) {
      window.location.hash = 'rules';
      await loadRulesPage();
    } else if (hash === '#bots') {
      if (userRole === 'superadmin') {
        await loadBotsPage();
      } else {
        window.location.hash = 'rules';
        await loadRulesPage();
      }
    } else if (hash === '#rules') {
      await loadRulesPage();
    } else if (hash === '#whatsapp') {
      await loadWhatsAppPage();
    } else {
      if (userRole === 'superadmin') {
        window.location.hash = 'bots';
        await loadBotsPage();
      } else {
        window.location.hash = 'rules';
        await loadRulesPage();
      }
    }
  };

  // تحميل الصفحة بناءً على الـ Hash عند تحميل الصفحة
  loadPageBasedOnHash();

  // تحديث الصفحة إذا تغير الـ Hash
  window.addEventListener('hashchange', () => {
    loadPageBasedOnHash();
  });

  // دالة لتحميل صفحة القواعد ديناميكيًا
  async function loadRulesPage() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    content.innerHTML = `
      <h2>إدارة القواعد</h2>
      <div id="rulesContent">
        <p>جاري تحميل البوتات...</p>
      </div>
    `;

    const rulesContent = document.getElementById('rulesContent');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    let bots = [];
    try {
      const response = await fetch('/api/bots', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`فشل في جلب البوتات: ${response.status} ${response.statusText}`);
      }
      bots = await response.json();
    } catch (err) {
      console.error('خطأ في جلب البوتات:', err);
      rulesContent.innerHTML = `
        <p style="color: red;">تعذر جلب البوتات، حاول مرة أخرى لاحقًا.</p>
      `;
      return;
    }

    let html = `
      <div>
        <label for="botId">اختر البوت:</label>
        <select id="botId" name="botId" required>
          <option value="">اختر بوت</option>
    `;

    const userBots = userRole === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
    userBots.forEach(bot => {
      html += `<option value="${bot._id}">${bot.name}</option>`;
    });

    html += `
        </select>
      </div>
      <div id="ruleTypeButtons">
        <button class="rule-type-btn" data-type="general">قواعد عامة</button>
        <button class="rule-type-btn" data-type="products">قائمة الأسعار</button>
        <button class="rule-type-btn" data-type="qa">سؤال وجواب</button>
        <button class="rule-type-btn" data-type="api">ربط API للمتجر</button>
    `;

    if (userRole === 'superadmin') {
      html += `<button class="rule-type-btn" data-type="global">قواعد موحدة</button>`;
    }

    html += `
      </div>
      <div id="ruleFormContainer" style="display: none;">
        <form id="ruleForm">
          <div id="contentFields"></div>
          <button type="submit">إضافة القاعدة</button>
        </form>
      </div>
      <h3>القواعد الحالية</h3>
      <ul id="rulesList"></ul>
    `;

    rulesContent.innerHTML = html;

    const botIdSelect = document.getElementById('botId');
    const ruleTypeButtons = document.querySelectorAll('.rule-type-btn');
    const contentFields = document.getElementById('contentFields');
    const ruleFormContainer = document.getElementById('ruleFormContainer');
    const ruleForm = document.getElementById('ruleForm');
    const rulesList = document.getElementById('rulesList');

    if (botIdSelect && userBots.length > 0) {
      botIdSelect.value = userBots[0]._id;
      loadRules(userBots[0]._id, rulesList, token);
      console.log(`✅ تم اختيار البوت الأول تلقائيًا وتحميل القواعد: ${userBots[0].name}`);
    }

    const loadContentFields = (type) => {
      contentFields.innerHTML = '';
      ruleFormContainer.style.display = 'block';

      if (type === 'general') {
        contentFields.innerHTML = `
          <label for="generalContent">المحتوى (خاص بالبوت المحدد):</label>
          <textarea id="generalContent" name="generalContent" required placeholder="أدخل المحتوى العام لهذا البوت"></textarea>
        `;
        console.log(`📋 تم تحميل حقل المحتوى العام لنوع general`);
      } else if (type === 'global') {
        contentFields.innerHTML = `
          <label for="globalContent">المحتوى (موحد لكل البوتات):</label>
          <textarea id="globalContent" name="globalContent" required placeholder="أدخل المحتوى الموحد لكل البوتات"></textarea>
        `;
        console.log(`📋 تم تحميل حقل المحتوى الموحد لنوع global`);
      } else if (type === 'products') {
        contentFields.innerHTML = `
          <label for="product">المنتج:</label>
          <input type="text" id="product" name="product" required placeholder="اسم المنتج">
          <label for="price">السعر:</label>
          <input type="number" id="price" name="price" required placeholder="السعر" min="0" step="0.01">
          <label for="currency">العملة:</label>
          <select id="currency" name="currency" required>
            <option value="">اختر العملة</option>
            <option value="جنيه">جنيه</option>
            <option value="دولار">دولار</option>
          </select>
        `;
      } else if (type === 'qa') {
        contentFields.innerHTML = `
          <label for="question">السؤال:</label>
          <input type="text" id="question" name="question" required placeholder="أدخل السؤال">
          <label for="answer">الإجابة:</label>
          <textarea id="answer" name="answer" required placeholder="أدخل الإجابة"></textarea>
        `;
      } else if (type === 'api') {
        contentFields.innerHTML = `
          <label for="apiKey">مفتاح API:</label>
          <input type="text" id="apiKey" name="apiKey" required placeholder="أدخل مفتاح API">
        `;
      }
    };

    ruleTypeButtons.forEach(button => {
      button.addEventListener('click', () => {
        ruleTypeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const type = button.getAttribute('data-type');
        loadContentFields(type);
      });
    });

    if (botIdSelect) {
      botIdSelect.addEventListener('change', () => {
        const selectedBotId = botIdSelect.value;
        if (selectedBotId) loadRules(selectedBotId, rulesList, token);
      });
    } else {
      console.error('العنصر botIdSelect غير موجود في الـ DOM');
    }

    if (ruleForm) {
      ruleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const botId = botIdSelect?.value;
        const type = document.querySelector('.rule-type-btn.active')?.getAttribute('data-type');
        let content;

        if (!botId || !type) {
          alert('يرجى اختيار بوت ونوع القاعدة');
          return;
        }

        if (type === 'general') {
          const generalContentElement = document.getElementById('generalContent');
          if (!generalContentElement) {
            alert('خطأ: حقل المحتوى العام غير موجود، حاول مرة أخرى');
            console.error('❌ حقل generalContent غير موجود في الـ DOM');
            return;
          }
          content = generalContentElement.value;
          if (!content || content.trim() === '') {
            alert('يرجى إدخال المحتوى العام');
            return;
          }
          console.log(`📝 المحتوى العام المُدخل: ${content}`);
        } else if (type === 'global') {
          const globalContentElement = document.getElementById('globalContent');
          if (!globalContentElement) {
            alert('خطأ: حقل المحتوى الموحد غير موجود، حاول مرة أخرى');
            console.error('❌ حقل globalContent غير موجود في الـ DOM');
            return;
          }
          content = globalContentElement.value;
          if (!content || content.trim() === '') {
            alert('يرجى إدخال المحتوى الموحد');
            return;
          }
          console.log(`📝 المحتوى الموحد المُدخل: ${content}`);
        } else if (type === 'products') {
          const product = document.getElementById('product')?.value;
          const price = parseFloat(document.getElementById('price')?.value);
          const currency = document.getElementById('currency')?.value;
          if (!product || isNaN(price) || price <= 0 || !currency) {
            alert('يرجى إدخال جميع الحقول (المنتج، السعر، العملة) بشكل صحيح');
            return;
          }
          content = { product, price, currency };
        } else if (type === 'qa') {
          const question = document.getElementById('question')?.value;
          const answer = document.getElementById('answer')?.value;
          if (!question || !answer || question.trim() === '' || answer.trim() === '') {
            alert('يرجى إدخال السؤال والإجابة');
            return;
          }
          content = { question, answer };
        } else if (type === 'api') {
          const apiKey = document.getElementById('apiKey')?.value;
          if (!apiKey || apiKey.trim() === '') {
            alert('يرجى إدخال مفتاح API');
            return;
          }
          content = { apiKey };
        }

        try {
          console.log('📤 إرسال قاعدة جديدة:', { botId, type, content });
          const response = await fetch('/api/rules', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ botId, type, content }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في إضافة القاعدة');
          }
          alert('تم إضافة القاعدة بنجاح');
          loadRules(botId, rulesList, token);
        } catch (err) {
          console.error('خطأ في إضافة القاعدة:', err);
          alert(`خطأ في إضافة القاعدة: ${err.message}`);
        }
      });
    }

    window.editRule = async (ruleId) => {
      try {
        const response = await fetch(`/api/rules/${ruleId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('فشل في جلب القاعدة');
        }
        const rule = await response.json();
        if (rule.type === 'global' && userRole !== 'superadmin') {
          alert('غير مسموح لك بتعديل القواعد الموحدة');
          return;
        }

        let newContent;
        if (rule.type === 'general') {
          newContent = prompt('أدخل المحتوى العام الجديد:', rule.content);
          if (!newContent || newContent.trim() === '') {
            alert('يرجى إدخال محتوى عام صالح');
            return;
          }
        } else if (rule.type === 'global') {
          newContent = prompt('أدخل المحتوى الموحد الجديد:', rule.content);
          if (!newContent || newContent.trim() === '') {
            alert('يرجى إدخال محتوى موحد صالح');
            return;
          }
        } else if (rule.type === 'products') {
          const product = prompt('أدخل اسم المنتج الجديد:', rule.content.product);
          const price = parseFloat(prompt('أدخل السعر الجديد:', rule.content.price));
          const currency = prompt('أدخل العملة الجديدة (جنيه أو دولار):', rule.content.currency);
          if (!product || isNaN(price) || price <= 0 || !['جنيه', 'دولار'].includes(currency)) {
            alert('يرجى إدخال بيانات صحيحة');
            return;
          }
          newContent = { product, price, currency };
        } else if (rule.type === 'qa') {
          const question = prompt('أدخل السؤال الجديد:', rule.content.question);
          const answer = prompt('أدخل الإجابة الجديدة:', rule.content.answer);
          if (!question || !answer || question.trim() === '' || answer.trim() === '') {
            alert('يرجى إدخال سؤال وإجابة صالحين');
            return;
          }
          newContent = { question, answer };
        } else if (rule.type === 'api') {
          const apiKey = prompt('أدخل مفتاح API الجديد:', rule.content.apiKey);
          if (!apiKey || apiKey.trim() === '') {
            alert('يرجى إدخال مفتاح API صالح');
            return;
          }
          newContent = { apiKey };
        }

        if (newContent) {
          const updateResponse = await fetch(`/api/rules/${ruleId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: rule.type, content: newContent }),
          });
          if (!updateResponse.ok) {
            throw new Error('فشل في تعديل القاعدة');
          }
          alert('تم تعديل القاعدة بنجاح');
          loadRules(botIdSelect.value, rulesList, token);
        }
      } catch (err) {
        console.error('خطأ في تعديل القاعدة:', err);
        alert('خطأ في تعديل القاعدة، حاول مرة أخرى لاحقًا');
      }
    };

    window.deleteRule = async (ruleId) => {
      try {
        const response = await fetch(`/api/rules/${ruleId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('فشل في جلب القاعدة');
        }
        const rule = await response.json();
        if (rule.type === 'global' && userRole !== 'superadmin') {
          alert('غير مسموح لك بحذف القواعد الموحدة');
          return;
        }
        if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
          const deleteResponse = await fetch(`/api/rules/${ruleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!deleteResponse.ok) {
            throw new Error('فشل في حذف القاعدة');
          }
          alert('تم حذف القاعدة بنجاح');
          loadRules(botIdSelect.value, rulesList, token);
        }
      } catch (err) {
        console.error('خطأ في حذف القاعدة:', err);
        alert('خطأ في حذف القاعدة، حاول مرة أخرى لاحقًا');
      }
    };
  }

  // دالة لتحميل صفحة واتساب
  async function loadWhatsAppPage() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    content.innerHTML = `
      <h2>إعداد بوت واتساب</h2>
      <div id="whatsappContent">
        <p>جاري تحميل البوتات...</p>
      </div>
    `;

    const whatsappContent = document.getElementById('whatsappContent');

    // جلب البوتات
    let bots = [];
    try {
      const response = await fetch('/api/bots', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`فشل في جلب البوتات: ${response.status} ${response.statusText}`);
      }
      bots = await response.json();
    } catch (err) {
      console.error('خطأ في جلب البوتات:', err);
      whatsappContent.innerHTML = `
        <p style="color: red;">تعذر جلب البوتات، حاول مرة أخرى لاحقًا.</p>
      `;
      return;
    }

    let html = `
      <div>
        <label for="botId">اختر البوت:</label>
        <select id="botId" name="botId" required>
          <option value="">اختر بوت</option>
    `;

    const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
    userBots.forEach(bot => {
      html += `<option value="${bot._id}">${bot.name}</option>`;
    });

    html += `
        </select>
      </div>
      <div id="connectionStatus" style="margin-top: 10px;">
        <p>حالة الاتصال: <span id="connectionState">غير متصل</span></p>
        <p id="connectionDuration" style="display: none;">مدة الاتصال: <span id="durationTime">0</span></p>
        <button id="endSessionBtn" style="display: none;">إنهاء الجلسة</button>
      </div>
      <div id="connectionMethods">
        <h3>اختر طريقة الاتصال:</h3>
        <button id="connectWithNumber" class="connection-btn">الاتصال باستخدام الرقم</button>
        <button id="connectWithAPI" class="connection-btn">الاتصال باستخدام API</button>
        <button id="connectWithQR" class="connection-btn">الاتصال باستخدام كود QR</button>
      </div>
      <div id="connectionDetails" style="display: none;">
        <h3>تفاصيل الاتصال:</h3>
        <div id="qrCodeContainer"></div>
        <div id="connectionForm">
          <label for="whatsappNumber">رقم واتساب:</label>
          <input type="text" id="whatsappNumber" name="whatsappNumber" placeholder="أدخل رقم واتساب (مثال: +201234567890)" required>
          <button id="startConnection">بدء الاتصال</button>
        </div>
      </div>
      <h3>القواعد الحالية للبوت</h3>
      <ul id="whatsappRulesList"></ul>
    `;

    whatsappContent.innerHTML = html;

    const botIdSelect = document.getElementById('botId');
    const connectionState = document.getElementById('connectionState');
    const connectionDuration = document.getElementById('connectionDuration');
    const durationTime = document.getElementById('durationTime');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const connectWithNumber = document.getElementById('connectWithNumber');
    const connectWithAPI = document.getElementById('connectWithAPI');
    const connectWithQR = document.getElementById('connectWithQR');
    const connectionDetails = document.getElementById('connectionDetails');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const connectionForm = document.getElementById('connectionForm');
    const whatsappNumber = document.getElementById('whatsappNumber');
    const startConnection = document.getElementById('startConnection');
    const whatsappRulesList = document.getElementById('whatsappRulesList');

    let selectedBotId = null;
    let connectionStartTime = null;
    let durationInterval = null;

    // دالة لتحديث حالة الاتصال ومدة الجلسة
    const updateConnectionStatus = async (botId) => {
      try {
        const response = await fetch(`/api/whatsapp/session?botId=${botId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('فشل في جلب حالة الاتصال');
        }
        const session = await response.json();
        if (session && session.connected) {
          connectionState.textContent = 'متصل';
          connectionState.style.color = 'green';
          connectionDuration.style.display = 'block';
          endSessionBtn.style.display = 'block';
          connectionStartTime = new Date(session.startTime);
          if (durationInterval) clearInterval(durationInterval);
          durationInterval = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now - connectionStartTime) / 1000);
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;
            durationTime.textContent = `${hours} ساعة، ${minutes} دقيقة، ${seconds} ثانية`;
          }, 1000);
        } else {
          connectionState.textContent = 'غير متصل';
          connectionState.style.color = 'red';
          connectionDuration.style.display = 'none';
          endSessionBtn.style.display = 'none';
          if (durationInterval) clearInterval(durationInterval);
        }
      } catch (err) {
        console.error('خطأ في جلب حالة الاتصال:', err);
        connectionState.textContent = 'غير متصل';
        connectionState.style.color = 'red';
        connectionDuration.style.display = 'none';
        endSessionBtn.style.display = 'none';
        if (durationInterval) clearInterval(durationInterval);
      }
    };

    // اختيار أول بوت تلقائيًا وتحميل القواعد وحالة الاتصال
    if (botIdSelect && userBots.length > 0) {
      botIdSelect.value = userBots[0]._id;
      selectedBotId = userBots[0]._id;
      loadRules(selectedBotId, whatsappRulesList, token);
      updateConnectionStatus(selectedBotId);
      console.log(`✅ تم اختيار البوت الأول تلقائيًا: ${userBots[0].name}`);
    }

    // تحميل القواعد عند تغيير البوت
    botIdSelect.addEventListener('change', () => {
      selectedBotId = botIdSelect.value;
      if (selectedBotId) {
        loadRules(selectedBotId, whatsappRulesList, token);
        updateConnectionStatus(selectedBotId);
        connectionDetails.style.display = 'none';
        qrCodeContainer.innerHTML = '';
      }
    });

    // إظهار نموذج الاتصال عند اختيار طريقة
    connectWithNumber.addEventListener('click', () => {
      connectionDetails.style.display = 'block';
      connectionForm.style.display = 'block';
      qrCodeContainer.style.display = 'none';
      qrCodeContainer.innerHTML = '';
    });

    connectWithAPI.addEventListener('click', () => {
      connectionDetails.style.display = 'block';
      connectionForm.style.display = 'block';
      qrCodeContainer.style.display = 'none';
      qrCodeContainer.innerHTML = '';
    });

    connectWithQR.addEventListener('click', () => {
      connectionDetails.style.display = 'block';
      connectionForm.style.display = 'none';
      qrCodeContainer.style.display = 'block';
      qrCodeContainer.innerHTML = '<p>جاري إنشاء كود QR...</p>';
      startQRConnection();
    });

    // بدء الاتصال
    startConnection.addEventListener('click', async () => {
      const number = whatsappNumber.value;
      if (!number || !number.startsWith('+') || number.length < 10) {
        alert('يرجى إدخال رقم واتساب صالح (مثال: +201234567890)');
        return;
      }

      try {
        const response = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ botId: selectedBotId, whatsappNumber: number }),
        });
        if (!response.ok) {
          throw new Error('فشل في بدء الاتصال');
        }
        alert('تم بدء الاتصال بنجاح! يرجى الانتظار بضع ثوانٍ.');
        updateConnectionStatus(selectedBotId);
      } catch (err) {
        console.error('خطأ في بدء الاتصال:', err);
        alert('حدث خطأ أثناء بدء الاتصال، حاول مرة أخرى.');
      }
    });

    // إنهاء الجلسة
    endSessionBtn.addEventListener('click', async () => {
      if (confirm('هل أنت متأكد أنك تريد إنهاء الجلسة الحالية؟')) {
        try {
          const response = await fetch(`/api/whatsapp/disconnect?botId=${selectedBotId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) {
            throw new Error('فشل في إنهاء الجلسة');
          }
          alert('تم إنهاء الجلسة بنجاح');
          updateConnectionStatus(selectedBotId);
          connectionDetails.style.display = 'none';
          qrCodeContainer.innerHTML = '';
        } catch (err) {
          console.error('خطأ في إنهاء الجلسة:', err);
          alert('حدث خطأ أثناء إنهاء الجلسة، حاول مرة أخرى.');
        }
      }
    });

    // دالة لبدء الاتصال باستخدام كود QR
    const startQRConnection = async () => {
      try {
        const response = await fetch(`/api/whatsapp/connect-qr?botId=${selectedBotId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('فشل في إنشاء كود QR');
        }
        const { qrCode } = await response.json();
        qrCodeContainer.innerHTML = `<img src="${qrCode}" alt="كود QR" />`;
        alert('يرجى مسح كود QR باستخدام تطبيق واتساب لربط البوت.');
        updateConnectionStatus(selectedBotId);
      } catch (err) {
        console.error('خطأ في إنشاء كود QR:', err);
        qrCodeContainer.innerHTML = '<p style="color: red;">فشل في إنشاء كود QR، حاول مرة أخرى.</p>';
      }
    };
  }
});
