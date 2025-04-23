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
        <div class="rules-actions" style="display: flex; gap: 10px; align-items: center;">
          <div class="form-group">
            <input type="text" id="searchInput" placeholder="ابحث في القواعد...">
            <label for="searchInput">البحث</label>
          </div>
          <div class="form-group">
            <select id="typeFilter" name="typeFilter">
              <option value="all">الكل</option>
              <option value="general">عامة</option>
              <option value="products">أسعار</option>
              <option value="qa">أسئلة</option>
              <option value="api">مفتاح API</option>
              ${role === 'superadmin' ? '<option value="global">موحدة</option>' : ''}
            </select>
            <label for="typeFilter">فلتر حسب النوع</label>
          </div>
        </div>
        <div id="rulesList" class="rules-grid"></div>
        <div class="action-buttons" style="margin-top: 20px;">
          <button id="exportRulesBtn" class="download-btn">تصدير القواعد</button>
          <input type="file" id="importRulesInput" accept=".json" style="display: none;">
          <button id="importRulesBtn" class="download-btn">استيراد القواعد</button>
        </div>
        <div id="pagination" class="pagination" style="display: none;"></div>
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
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const exportRulesBtn = document.getElementById('exportRulesBtn');
  const importRulesBtn = document.getElementById('importRulesBtn');
  const importRulesInput = document.getElementById('importRulesInput');
  const pagination = document.getElementById('pagination');

  // Clear the dropdown before populating to avoid duplicates
  botIdSelect.innerHTML = '<option value="">اختر بوت</option>';

  const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
  userBots.forEach(bot => {
    const option = document.createElement('option');
    option.value = bot._id;
    option.textContent = bot.name;
    botIdSelect.appendChild(option);
  });

  let currentPage = 1;

  if (botIdSelect && userBots.length > 0) {
    botIdSelect.value = userBots[0]._id;
    loadRules(userBots[0]._id, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
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
      currentPage = 1;
      if (selectedBotId) loadRules(selectedBotId, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
    });
  } else {
    console.error('العنصر botIdSelect غير موجود في الـ DOM');
  }

  // Event listeners for filters
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      loadRules(botIdSelect.value, rulesList, token, typeFilter?.value || 'all', searchInput.value, currentPage);
    });
  }

  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      currentPage = 1;
      loadRules(botIdSelect.value, rulesList, token, typeFilter.value, searchInput?.value || '', currentPage);
    });
  }

  // Export rules
  if (exportRulesBtn) {
    exportRulesBtn.addEventListener('click', async () => {
      try {
        const botId = botIdSelect.value;
        if (!botId) {
          alert('يرجى اختيار بوت أولاً');
          return;
        }
        const response = await fetch(`/api/rules/export?botId=${botId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('فشل في تصدير القواعد');
        }
        const rules = await response.json();
        const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rules_${botId}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('خطأ في تصدير القواعد:', err);
        alert('خطأ في تصدير القواعد، حاول مرة أخرى لاحقًا');
      }
    });
  }

  // Import rules
  if (importRulesBtn && importRulesInput) {
    importRulesBtn.addEventListener('click', () => {
      importRulesInput.click();
    });

    importRulesInput.addEventListener('change', async (event) => {
      try {
        const botId = botIdSelect.value;
        if (!botId) {
          alert('يرجى اختيار بوت أولاً');
          return;
        }
        const file = event.target.files[0];
        if (!file) {
          alert('يرجى اختيار ملف JSON');
          return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const rules = JSON.parse(e.target.result);
            const response = await fetch('/api/rules/import', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ botId, rules }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'فشل في استيراد القواعد');
            }
            const result = await response.json();
            alert(result.message);
            loadRules(botId, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
          } catch (err) {
            console.error('خطأ في استيراد القواعد:', err);
            alert(`خطأ في استيراد القواعد: ${err.message}`);
          }
        };
        reader.readAsText(file);
      } catch (err) {
        console.error('خطأ في استيراد القواعد:', err);
        alert('خطأ في استيراد القواعد، حاول مرة أخرى لاحقًا');
      }
    });
  }

  if (ruleForm) {
    // Remove any existing submit event listeners to prevent multiple submissions
    const handleSubmit = async (e) => {
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
        loadRules(botId, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
      } catch (err) {
        console.error('خطأ في إضافة القاعدة:', err);
        alert(`خطأ في إضافة القاعدة: ${err.message}`);
      }
    };

    // Remove existing submit listeners to prevent duplicates
    ruleForm.removeEventListener('submit', handleSubmit);
    ruleForm.addEventListener('submit', handleSubmit);
  }

  async function loadRules(botId, rulesList, token, typeFilter = 'all', search = '', page = 1) {
    try {
      const query = new URLSearchParams({
        botId,
        ...(typeFilter && typeFilter !== 'all' && { type: typeFilter }),
        ...(search && { search }),
        page,
        limit: '30',
      });
      const response = await fetch(`/api/rules?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('فشل في جلب القواعد');
      }
      const { rules, totalPages, currentPage } = await response.json();
      rulesList.innerHTML = '';
      if (!rules || rules.length === 0) {
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

      // Render pagination only if there are more than one page
      pagination.innerHTML = '';
      if (totalPages > 1) {
        pagination.style.display = 'flex';
        for (let i = 1; i <= totalPages; i++) {
          const pageButton = document.createElement('button');
          pageButton.textContent = i;
          pageButton.className = i === currentPage ? 'pagination-btn active' : 'pagination-btn';
          pageButton.addEventListener('click', () => {
            currentPage = i;
            loadRules(botId, rulesList, token, typeFilter, search, currentPage);
          });
          pagination.appendChild(pageButton);
        }
      } else {
        pagination.style.display = 'none';
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
        loadRules(botIdSelect.value, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
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
        loadRules(botIdSelect.value, rulesList, token, typeFilter?.value || 'all', searchInput?.value || '', currentPage);
      }
    } catch (err) {
      console.error('خطأ في حذف القاعدة:', err);
      alert('خطأ في حذف القاعدة، حاول مرة أخرى لاحقًا');
    }
  };
}
