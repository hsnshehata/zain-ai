async function loadRulesPage() {
  const content = document.getElementById('content');
  const botId = getSelectedBotId();

  if (!botId) {
    content.innerHTML = '<p>يرجى اختيار بوت أولاً من صفحة البوتات</p>';
    return;
  }

  content.innerHTML = `
    <h2>إدارة القواعد</h2>
    <button onclick="showCreateRuleForm()">إنشاء قاعدة جديدة</button>
    <div id="formContainer"></div>
    <table>
      <thead>
        <tr>
          <th>نوع القاعدة</th>
          <th>المحتوى</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody id="rulesTable"></tbody>
    </table>
  `;

  await fetchRules(botId);
}

async function fetchRules(botId) {
  try {
    const res = await fetch(`/api/rules?botId=${botId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب القواعد');
    }
    const rules = await res.json();

    const tbody = document.getElementById('rulesTable');
    tbody.innerHTML = '';

    rules.forEach((rule) => {
      let contentDisplay = '';
      if (rule.type === 'global' || rule.type === 'general') {
        contentDisplay = rule.content;
      } else if (rule.type === 'products') {
        contentDisplay = `المنتج: ${rule.content.product}, السعر: ${rule.content.price} ${rule.content.currency}`;
      } else if (rule.type === 'qa') {
        contentDisplay = `السؤال: ${rule.content.question}, الإجابة: ${rule.content.answer}`;
      }

      const row = `
        <tr>
          <td>${rule.type === 'global' ? 'عام' : rule.type === 'general' ? 'عام' : rule.type === 'products' ? 'منتجات' : 'سؤال وجواب'}</td>
          <td>${contentDisplay}</td>
          <td>
            <button onclick="editRule('${rule._id}', '${rule.type}', '${JSON.stringify(rule.content).replace(/"/g, '&quot;')}')">تعديل</button>
            <button onclick="deleteRule('${rule._id}')">حذف</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error('خطأ في جلب القواعد:', err);
    alert('خطأ في جلب القواعد');
  }
}

function showCreateRuleForm() {
  const formContainer = document.getElementById('formContainer');
  formContainer.innerHTML = `
    <h3>إنشاء قاعدة جديدة</h3>
    <form id="createRuleForm">
      <div>
        <label for="ruleType">نوع القاعدة:</label>
        <select id="ruleType" onchange="updateRuleForm(this.value)" required>
          <option value="">اختر نوع القاعدة</option>
          <option value="general">عام</option>
          <option value="products">منتجات</option>
          <option value="qa">سؤال وجواب</option>
        </select>
      </div>
      <div id="ruleContent"></div>
      <button type="submit">إنشاء</button>
    </form>
    <p id="ruleError" style="color: red;"></p>
  `;

  document.getElementById('createRuleForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const botId = getSelectedBotId();
    const type = document.getElementById('ruleType').value;
    let content = {};

    if (type === 'general') {
      content = document.getElementById('generalContent').value;
    } else if (type === 'products') {
      content = {
        product: document.getElementById('productName').value,
        price: document.getElementById('productPrice').value,
        currency: document.getElementById('productCurrency').value,
      };
    } else if (type === 'qa') {
      content = {
        question: document.getElementById('question').value,
        answer: document.getElementById('answer').value,
      };
    }

    const errorEl = document.getElementById('ruleError');

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ botId, type, content }),
      });

      const data = await res.json();
      if (res.ok) {
        formContainer.innerHTML = '<p>تم إنشاء القاعدة بنجاح!</p>';
        await fetchRules(botId);
      } else {
        errorEl.textContent = data.message || 'فشل في إنشاء القاعدة';
      }
    } catch (err) {
      console.error('خطأ في إنشاء القاعدة:', err);
      errorEl.textContent = 'خطأ في السيرفر';
    }
  });
}

function updateRuleForm(type) {
  const ruleContent = document.getElementById('ruleContent');
  if (type === 'general') {
    ruleContent.innerHTML = `
      <div>
        <label for="generalContent">المحتوى:</label>
        <textarea id="generalContent" required></textarea>
      </div>
    `;
  } else if (type === 'products') {
    ruleContent.innerHTML = `
      <div>
        <label for="productName">اسم المنتج:</label>
        <input type="text" id="productName" required>
      </div>
      <div>
        <label for="productPrice">السعر:</label>
        <input type="number" id="productPrice" required>
      </div>
      <div>
        <label for="productCurrency">العملة:</label>
        <input type="text" id="productCurrency" required>
      </div>
    `;
  } else if (type === 'qa') {
    ruleContent.innerHTML = `
      <div>
        <label for="question">السؤال:</label>
        <input type="text" id="question" required>
      </div>
      <div>
        <label for="answer">الإجابة:</label>
        <textarea id="answer" required></textarea>
      </div>
    `;
  } else {
    ruleContent.innerHTML = '';
  }
}

async function editRule(id, type, contentJson) {
  const content = JSON.parse(contentJson);
  const newType = prompt('أدخل نوع القاعدة (general, products, qa):', type);
  let newContent = {};

  if (newType === 'general') {
    newContent = prompt('أدخل المحتوى:', content);
  } else if (newType === 'products') {
    newContent.product = prompt('أدخل اسم المنتج:', content.product);
    newContent.price = prompt('أدخل السعر:', content.price);
    newContent.currency = prompt('أدخل العملة:', content.currency);
  } else if (newType === 'qa') {
    newContent.question = prompt('أدخل السؤال:', content.question);
    newContent.answer = prompt('أدخل الإجابة:', content.answer);
  }

  if (newType && Object.keys(newContent).length > 0) {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ type: newType, content: newContent }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم تعديل القاعدة بنجاح');
        await fetchRules(getSelectedBotId());
      } else {
        alert(data.message || 'فشل في تعديل القاعدة');
      }
    } catch (err) {
      console.error('خطأ في تعديل القاعدة:', err);
      alert('خطأ في السيرفر');
    }
  }
}

async function deleteRule(id) {
  if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم حذف القاعدة بنجاح');
        await fetchRules(getSelectedBotId());
      } else {
        alert(data.message || 'فشل في حذف القاعدة');
      }
    } catch (err) {
      console.error('خطأ في حذف القاعدة:', err);
      alert('خطأ في السيرفر');
    }
  }
}
