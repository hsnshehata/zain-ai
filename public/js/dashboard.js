document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  if (!localStorage.getItem('token')) {
    window.location.href = '/';
    return;
  }

  // إعداد الأزرار
  document.getElementById('botsBtn').addEventListener('click', () => {
    window.location.hash = 'bots';
    loadPageBasedOnHash();
  });

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

  // تحميل الصفحة بناءً على الـ Hash
  const loadPageBasedOnHash = async () => {
    const hash = window.location.hash || '#bots'; // افتراضيًا البوتات
    if (hash === '#bots') {
      await loadBotsPage();
    } else if (hash === '#rules') {
      await loadRulesPage();
    } else if (hash === '#whatsapp') {
      loadWhatsAppPage();
    }
  };

  // تحميل الصفحة بناءً على الـ Hash عند تحميل الصفحة
  loadPageBasedOnHash();

  // تحديث الصفحة إذا تغير الـ Hash
  window.addEventListener('hashchange', () => {
    loadPageBasedOnHash();
  });
});

// دالة لتحميل صفحة القواعد ديناميكيًا
async function loadRulesPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  let html = `
    <h2>إدارة القواعد</h2>
    <div>
      <label for="botId">اختر البوت:</label>
      <select id="botId" name="botId" required>
        <option value="">اختر بوت</option>
      </select>
    </div>
    <form id="ruleForm">
      <div>
        <label for="type">نوع القاعدة:</label>
        <select id="type" name="type" required>
          <option value="">اختر نوع القاعدة</option>
          <option value="general">عامة</option>
          <option value="products">منتجات</option>
          <option value="qa">سؤال وجواب</option>
        </select>
      </div>
      <div id="contentFields"></div>
      <button type="submit">إضافة القاعدة</button>
    </form>
    <h3>القواعد الحالية</h3>
    <ul id="rulesList"></ul>
  `;

  content.innerHTML = html;

  // المنطق بتاع إدارة القواعد
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const botIdSelect = document.getElementById('botId');
  const typeSelect = document.getElementById('type');
  const contentFields = document.getElementById('contentFields');
  const ruleForm = document.getElementById('ruleForm');
  const rulesList = document.getElementById('rulesList');

  // إضافة خيار القواعد الموحدة للسوبر أدمن فقط
  if (userRole === 'superadmin') {
    const globalOption = document.createElement('option');
    globalOption.value = 'global';
    globalOption.textContent = 'موحدة (لكل البوتات)';
    typeSelect.appendChild(globalOption);
  }

  // جلب البوتات لملء القايمة المنسدلة
  try {
    const response = await fetch('/api/bots', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('فشل في جلب البوتات');
    }
    const bots = await response.json();
    botIdSelect.innerHTML = '<option value="">اختر بوت</option>'; // إعادة تعيين القايمة
    // للمستخدم العادي، نعرض فقط البوتات الخاصة به
    const userBots = userRole === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
    userBots.forEach(bot => {
      const option = document.createElement('option');
      option.value = bot._id;
      option.textContent = bot.name;
      botIdSelect.appendChild(option);
    });
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    alert('خطأ في جلب البوتات');
  }

  // تغيير الحقول بناءً على نوع القاعدة
  typeSelect.addEventListener('change', () => {
    contentFields.innerHTML = '';
    const type = typeSelect.value;
    if (type === 'general' || type === 'global') {
      contentFields.innerHTML = `
        <label for="content">المحتوى:</label>
        <textarea id="content" name="content" required></textarea>
      `;
    } else if (type === 'products') {
      contentFields.innerHTML = `
        <label for="product">المنتج:</label>
        <input type="text" id="product" name="product" required>
        <label for="price">السعر:</label>
        <input type="number" id="price" name="price" required>
        <label for="currency">العملة:</label>
        <input type="text" id="currency" name="currency" required>
      `;
    } else if (type === 'qa') {
      contentFields.innerHTML = `
        <label for="question">السؤال:</label>
        <input type="text" id="question" name="question" required>
        <label for="answer">الإجابة:</label>
        <textarea id="answer" name="answer" required></textarea>
      `;
    }
  });

  // دالة لجلب القواعد
  const loadRules = async (botId) => {
    try {
      const response = await fetch(`/api/rules?botId=${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('فشل في جلب القواعد');
      }
      const rules = await response.json();
      rulesList.innerHTML = '';
      rules.forEach(rule => {
        const li = document.createElement('li');
        // المستخدم العادي يقدر يعدل ويحذف القواعد الخاصة بيه فقط
        li.innerHTML = `
          نوع القاعدة: ${rule.type} | المحتوى: ${JSON.stringify(rule.content)}
          <button onclick="editRule('${rule._id}')">تعديل</button>
          <button onclick="deleteRule('${rule._id}')">حذف</button>
        `;
        // إذا كانت القاعدة موحدة، المستخدم العادي مش هيشوفها (ده شغال بالفعل في الـ Backend)
        rulesList.appendChild(li);
      });
    } catch (err) {
      console.error('خطأ في جلب القواعد:', err);
      alert('خطأ في جلب القواعد');
    }
  };

  botIdSelect.addEventListener('change', () => {
    const selectedBotId = botIdSelect.value;
    if (selectedBotId) loadRules(selectedBotId);
  });

  // إضافة قاعدة جديدة
  ruleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botId = botIdSelect.value;
    const type = typeSelect.value;
    let content = {};

    if (type === 'general' || type === 'global') {
      content = document.getElementById('content').value;
    } else if (type === 'products') {
      content = {
        product: document.getElementById('product').value,
        price: document.getElementById('price').value,
        currency: document.getElementById('currency').value,
      };
    } else if (type === 'qa') {
      content = {
        question: document.getElementById('question').value,
        answer: document.getElementById('answer').value,
      };
    }

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botId, type, content }),
      });
      if (response.ok) {
        alert('تم إضافة القاعدة بنجاح');
        loadRules(botId);
      } else {
        alert('خطأ في إضافة القاعدة');
      }
    } catch (err) {
      console.error('خطأ في إضافة القاعدة:', err);
      alert('خطأ في إضافة القاعدة');
    }
  });

  // دالة تعديل القاعدة
  window.editRule = async (ruleId) => {
    const response = await fetch(`/api/rules/${ruleId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rule = await response.json();
    if (rule.type === 'global' && userRole !== 'superadmin') {
      alert('غير مسموح لك بتعديل القواعد الموحدة');
      return;
    }
    const newContent = prompt('أدخل المحتوى الجديد:', JSON.stringify(rule.content));
    if (newContent) {
      try {
        const updateResponse = await fetch(`/api/rules/${ruleId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: rule.type, content: JSON.parse(newContent) }),
        });
        if (updateResponse.ok) {
          alert('تم تعديل القاعدة بنجاح');
          loadRules(botIdSelect.value);
        }
      } catch (err) {
        console.error('خطأ في تعديل القاعدة:', err);
        alert('خطأ في تعديل القاعدة');
      }
    }
  };

  // دالة حذف القاعدة
  window.deleteRule = async (ruleId) => {
    const response = await fetch(`/api/rules/${ruleId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rule = await response.json();
    if (rule.type === 'global' && userRole !== 'superadmin') {
      alert('غير مسموح لك بحذف القواعد الموحدة');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
      try {
        const deleteResponse = await fetch(`/api/rules/${ruleId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (deleteResponse.ok) {
          alert('تم حذف القاعدة بنجاح');
          loadRules(botIdSelect.value);
        }
      } catch (err) {
        console.error('خطأ في حذف القاعدة:', err);
        alert('خطأ في حذف القاعدة');
      }
    }
  };
}
