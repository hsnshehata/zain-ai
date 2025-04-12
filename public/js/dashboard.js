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

  content.innerHTML = `
    <h2>إدارة القواعد</h2>
    <div id="rulesContent">
      <p>جاري تحميل البوتات...</p>
    </div>
  `;

  const rulesContent = document.getElementById('rulesContent');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // جلب البوتات لملء القايمة المنسدلة
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
    return; // نوقف التنفيذ لو حصل خطأ
  }

  let html = `
    <div>
      <label for="botId">اختر البوت:</label>
      <select id="botId" name="botId" required>
        <option value="">اختر بوت</option>
  `;

  // للمستخدم العادي، نعرض فقط البوتات الخاصة به
  const userBots = userRole === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
  userBots.forEach(bot => {
    html += `<option value="${bot._id}">${bot.name}</option>`;
  });

  html += `
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

  rulesContent.innerHTML = html;

  const botIdSelect = document.getElementById('botId');
  const typeSelect = document.getElementById('type');
  const contentFields = document.getElementById('contentFields');
  const ruleForm = document.getElementById('ruleForm');
  const rulesList = document.getElementById('rulesList');

  // إضافة خيار القواعد الموحدة للسوبر أدمن فقط
  if (userRole === 'superadmin' && typeSelect) {
    const globalOption = document.createElement('option');
    globalOption.value = 'global';
    globalOption.textContent = 'موحدة (لكل البوتات)';
    typeSelect.appendChild(globalOption);
  }

  // تغيير الحقول بناءً على نوع القاعدة
  if (typeSelect) {
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
          <select id="currency" name="currency" required>
            <option value="">اختر العملة</option>
            <option value="جنيه">جنيه</option>
            <option value="دولار">دولار</option>
          </select>
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
  }

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
      rulesList.innerHTML = ''; // تنظيف القائمة قبل العرض
      if (rules.length === 0) {
        rulesList.innerHTML = '<li>لا توجد قواعد لهذا البوت.</li>';
      } else {
        rules.forEach(rule => {
          const li = document.createElement('li');
          let contentDisplay = '';
          if (rule.type === 'general' || rule.type === 'global') {
            contentDisplay = `المحتوى: ${rule.content}`;
          } else if (rule.type === 'products') {
            contentDisplay = `المنتج: ${rule.content.product} | السعر: ${rule.content.price} ${rule.content.currency}`;
          } else if (rule.type === 'qa') {
            contentDisplay = `السؤال: ${rule.content.question} | الإجابة: ${rule.content.answer}`;
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

  botIdSelect.addEventListener('change', () => {
    const selectedBotId = botIdSelect.value;
    if (selectedBotId) loadRules(selectedBotId);
  });

  // إضافة قاعدة جديدة
  ruleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botId = botIdSelect.value;
    const type = typeSelect.value;
    let content;

    if (type === 'general' || type === 'global') {
      content = document.getElementById('content')?.value;
      if (!content) {
        alert('يرجى إدخال المحتوى');
        return;
      }
    } else if (type === 'products') {
      const product = document.getElementById('product')?.value;
      const price = document.getElementById('price')?.value;
      const currency = document.getElementById('currency')?.value;
      if (!product || !price || !currency) {
        alert('يرجى إدخال جميع الحقول (المنتج، السعر، العملة)');
        return;
      }
      content = { product, price, currency };
    } else if (type === 'qa') {
      const question = document.getElementById('question')?.value;
      const answer = document.getElementById('answer')?.value;
      if (!question || !answer) {
        alert('يرجى إدخال السؤال والإجابة');
        return;
      }
      content = { question, answer };
    } else {
      alert('يرجى اختيار نوع القاعدة');
      return;
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في إضافة القاعدة');
      }
      const data = await response.json();
      alert('تم إضافة القاعدة بنجاح');
      loadRules(botId); // إعادة جلب القواعد بعد الحفظ
    } catch (err) {
      console.error('خطأ في إضافة القاعدة:', err);
      alert(`خطأ في إضافة القاعدة: ${err.message}`);
    }
  });

  // دالة تعديل القاعدة
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
      if (rule.type === 'general' || rule.type === 'global') {
        newContent = prompt('أدخل المحتوى الجديد:', rule.content);
      } else if (rule.type === 'products') {
        const product = prompt('أدخل اسم المنتج الجديد:', rule.content.product);
        const price = prompt('أدخل السعر الجديد:', rule.content.price);
        const currency = prompt('أدخل العملة الجديدة (جنيه أو دولار):', rule.content.currency);
        if (product && price && (currency === 'جنيه' || currency === 'دولار')) {
          newContent = JSON.stringify({ product, price, currency });
        } else {
          alert('يرجى إدخال بيانات صحيحة (العملة يجب أن تكون جنيه أو دولار)');
          return;
        }
      } else if (rule.type === 'qa') {
        const question = prompt('أدخل السؤال الجديد:', rule.content.question);
        const answer = prompt('أدخل الإجابة الجديدة:', rule.content.answer);
        if (question && answer) {
          newContent = JSON.stringify({ question, answer });
        } else {
          alert('يرجى إدخال سؤال وإجابة');
          return;
        }
      }
      if (newContent) {
        const updateResponse = await fetch(`/api/rules/${ruleId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: rule.type, content: JSON.parse(newContent) }),
        });
        if (!updateResponse.ok) {
          throw new Error('فشل في تعديل القاعدة');
        }
        alert('تم تعديل القاعدة بنجاح');
        loadRules(botIdSelect.value);
      }
    } catch (err) {
      console.error('خطأ في تعديل القاعدة:', err);
      alert('خطأ في تعديل القاعدة، حاول مرة أخرى لاحقًا');
    }
  };

  // دالة حذف القاعدة
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
        loadRules(botIdSelect.value);
      }
    } catch (err) {
      console.error('خطأ في حذف القاعدة:', err);
      alert('خطأ في حذف القاعدة، حاول مرة أخرى لاحقًا');
    }
  };
}
