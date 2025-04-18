document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  if (!localStorage.getItem('token')) {
    window.location.href = '/';
    return;
  }

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

  document.getElementById('analyticsBtn').addEventListener('click', () => {
    window.location.hash = 'analytics';
    loadPageBasedOnHash();
  });

  document.getElementById('chatPageBtn').addEventListener('click', () => {
    window.location.hash = 'chat-page';
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
    } else if (hash === '#analytics') {
      await loadAnalyticsPage();
    } else if (hash === '#chat-page') {
      await loadChatPage();
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

  async function loadChatPage() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    content.innerHTML = `
      <h2>تخصيص صفحة الدردشة</h2>
      <div id="chatPageContent">
        <p>جاري تحميل البوتات...</p>
      </div>
    `;

    const chatPageContent = document.getElementById('chatPageContent');

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
      chatPageContent.innerHTML = `
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
      <button id="createChatPageBtn" disabled>إنشاء صفحة دردشة</button>
    `;

    chatPageContent.innerHTML = html;

    const botIdSelect = document.getElementById('botId');
    const createChatPageBtn = document.getElementById('createChatPageBtn');

    if (botIdSelect) {
      botIdSelect.addEventListener('change', () => {
        const selectedBotId = botIdSelect.value;
        createChatPageBtn.disabled = !selectedBotId; // تفعيل الزرار بس لما يختار بوت
      });
    }

    if (createChatPageBtn) {
      createChatPageBtn.addEventListener('click', async () => {
        const selectedBotId = botIdSelect.value;
        if (!selectedBotId) {
          alert('يرجى اختيار بوت أولاً');
          return;
        }
        content.innerHTML = `
          <h2>تخصيص صفحة الدردشة</h2>
          <p>تم إنشاء صفحة الدردشة للبوت المحدد! جاري تحميل خيارات التخصيص...</p>
        `;
        // الخيارات زي الرابط وتعديل الألوان هتتحط هنا في المراحل الجاية
      });
    }
  }

  loadPageBasedOnHash();

  window.addEventListener('hashchange', () => {
    loadPageBasedOnHash();
  });

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
});
