async function loadRulesPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  content.innerHTML = `
    <h2>إدارة القواعد</h2>
    <div class="rules-container">
      <div class="spinner"><div class="loader"></div></div>
      <div id="rulesContent" style="display: none;">
        <div class="form-group">
          <select id="botId" name="botId" required>
            <option value="">اختر بوت</option>
          </select>
          <label for="botId">اختر البوت</label>
        </div>
        <div class="rule-tabs">
          <button class="rule-type-btn active" data-type="general">قواعد عامة</button>
          <button class="rule-type-btn" data-type="products">قائمة الأسعار</button>
          <button class="rule-type-btn" data-type="qa">سؤال وجواب</button>
          <button class="rule-type-btn" data-type="api">ربط API للمتجر</button>
          ${role === 'superadmin' ? '<button class="rule-type-btn" data-type="global">قواعد موحدة</button>' : ''}
        </div>
        <div id="ruleFormContainer" style="display: none;">
          <form id="ruleForm">
            <div id="contentFields"></div>
            <button type="submit">إضافة القاعدة</button>
          </form>
        </div>
        <h3>القواعد الحالية</h3>
        <div id="rulesList" class="rules-grid"></div>
      </div>
    </div>
  `;

  const rulesContent = document.getElementById('rulesContent');
  const spinner = document.querySelector('.spinner');

  let bots = [];
  try {
    spinner.style.display = 'flex';
    const response = await fetch('/api/bots', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`فشل في جلب البوتات: ${response.status} ${response.statusText}`);
    }
    bots = await response.json();
    rulesContent.style.display = 'block';
    spinner.style.display = 'none';
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    rulesContent.innerHTML = `
      <p style="color: red;">تعذر جلب البوتات، حاول مرة أخرى لاحقًا.</p>
    `;
    spinner.style.display = 'none';
    return;
  }

  const botIdSelect = document.getElementById('botId');
  const ruleTypeButtons = document.querySelectorAll('.rule-type-btn');
  const contentFields = document.getElementById('contentFields');
  const ruleFormContainer = document.getElementById('ruleFormContainer');
  const ruleForm = document.getElementById('ruleForm');
  const rulesList = document.getElementById('rulesList');

  // Clear the dropdown before populating to avoid duplicates
  botIdSelect.innerHTML = '<option value="">اختر بوت</option>';

  const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
  userBots.forEach(bot => {
    const option = document.createElement('option');
    option.value = bot._id;
    option.textContent = bot.name;
    botIdSelect.appendChild(option);
  });

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
        <div class="form-group">
          <textarea id="generalContent" name="generalContent" required placeholder=" "></textarea>
          <label for="generalContent">المحتوى (خاص بالبوت المحدد)</label>
        </div>
      `;
      console.log(`📋 تم تحميل حقل المحتوى العام لنوع general`);
    } else if (type === 'global') {
      contentFields.innerHTML = `
        <div class="form-group">
          <textarea id="globalContent" name="globalContent" required placeholder=" "></textarea>
          <label for="globalContent">المحتوى (موحد لكل البوتات)</label>
        </div>
      `;
      console.log(`📋 تم تحميل حقل المحتوى الموحد لنوع global`);
    } else if (type === 'products') {
      contentFields.innerHTML = `
        <div class="form-group">
          <input type="text" id="product" name="product" required placeholder=" ">
          <label for="product">المنتج</label>
        </div>
        <div class="form-group">
          <input type="number" id="price" name="price" required placeholder=" " min="0" step="0.01">
          <label for="price">السعر</label>
        </div>
        <div class="form-group">
          <select id="currency" name="currency" required>
            <option value="">اختر العملة</option>
            <option value="جنيه">جنيه</option>
            <option value="دولار">دولار</option>
          </select>
          <label for="currency">العملة</label>
        </div>
      `;
    } else if (type === 'qa') {
      contentFields.innerHTML = `
        <div class="form-group">
          <input type="text" id="question" name="question" required placeholder=" ">
          <label for="question">السؤال</label>
        </div>
        <div class="form-group">
          <textarea id="answer" name="answer" required placeholder=" "></textarea>
          <label for="answer">الإجابة</label>
        </div>
      `;
    } else if (type === 'api') {
      contentFields.innerHTML = `
        <div class="form-group">
          <input type="text" id="apiKey" name="apiKey" required placeholder=" ">
          <label for="apiKey">مفتاح API</label>
        </div>
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

  // Set default tab
  if (ruleTypeButtons.length > 0) {
    ruleTypeButtons[0].click();
  }

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

  async function loadRules(botId, rulesList, token) {
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
        rulesList.innerHTML = '<div class="rule-card"><p>لا توجد قواعد لهذا البوت.</p></div>';
      } else {
        rules.forEach(rule => {
          const card = document.createElement('div');
          card.className = 'rule-card';
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
          card.innerHTML = `
            <h4>نوع القاعدة: ${rule.type}</h4>
            <p>${contentDisplay}</p>
            <div class="card-actions">
              <button onclick="editRule('${rule._id}')">تعديل</button>
              <button onclick="deleteRule('${rule._id}')">حذف</button>
            </div>
          `;
          rulesList.appendChild(card);
        });
      }
    } catch (err) {
      console.error('خطأ في جلب القواعد:', err);
      rulesList.innerHTML = '<div class="rule-card"><p style="color: red;">تعذر جلب القواعد، حاول مرة أخرى لاحقًا.</p></div>';
    }
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
      if (rule.type === 'global' && role !== 'superadmin') {
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
      if (rule.type === 'global' && role !== 'superadmin') {
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
