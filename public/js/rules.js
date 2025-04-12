document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const botIdSelect = document.getElementById('botId');
  const typeSelect = document.getElementById('type');
  const contentFields = document.getElementById('contentFields');
  const ruleForm = document.getElementById('ruleForm');
  const rulesList = document.getElementById('rulesList');

  // إذا كان المستخدم سوبر أدمن، أضف خيار Global
  if (userRole === 'superadmin') {
    const globalOption = document.createElement('option');
    globalOption.value = 'global';
    globalOption.textContent = 'موحدة (لكل البوتات)';
    typeSelect.appendChild(globalOption);
  }

  // جلب قايمة البوتات
  try {
    const response = await fetch('/api/bots', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const bots = await response.json();
    bots.forEach(bot => {
      const option = document.createElement('option');
      option.value = bot._id;
      option.textContent = bot.name;
      botIdSelect.appendChild(option);
    });
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
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

  // جلب القواعد
  const loadRules = async (botId) => {
    try {
      const response = await fetch(`/api/rules?botId=${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const rules = await response.json();
      rulesList.innerHTML = '';
      rules.forEach(rule => {
        const li = document.createElement('li');
        li.innerHTML = `
          نوع القاعدة: ${rule.type} | المحتوى: ${JSON.stringify(rule.content)}
          <button onclick="editRule('${rule._id}')">تعديل</button>
          <button onclick="deleteRule('${rule._id}')">حذف</button>
        `;
        // إذا كانت القاعدة موحدة (Global) ومستخدم عادي، يمنع التعديل والحذف
        if (rule.type === 'global' && userRole !== 'superadmin') {
          li.innerHTML = `نوع القاعدة: ${rule.type} | المحتوى: ${JSON.stringify(rule.content)} (غير مسموح بالتعديل)`;
        }
        rulesList.appendChild(li);
      });
    } catch (err) {
      console.error('خطأ في جلب القواعد:', err);
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
    }
  });

  // تعديل قاعدة
  window.editRule = async (ruleId) => {
    const response = await fetch(`/api/rules/${ruleId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rule = await response.json();
    if (rule.type === 'global' && userRole !== 'superadmin') {
      alert('غير مسموح لك بتعديل القواعد الموحدة');
      return;
    }
    // هنا ممكن تعمل نموذج تعديل بطريقة مشابهة للإضافة
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
      }
    }
  };

  // حذف قاعدة
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
      }
    }
  };
});
