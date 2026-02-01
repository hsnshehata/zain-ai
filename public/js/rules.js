// public/js/rules.js (Updated for new dashboard design and unified error handling)

// مفتاح التخزين المؤقت موحّد لكل استدعاءات الصفحة
const cacheKey = 'rules-page-cache';

// نماذج جاهزة غير مفعّلة (يتم نسخها فقط عند الحفظ)
const ruleTemplates = [
  {
    id: 'tmpl-support-agent',
    title: 'موظف خدمة عملاء أساسي',
    content: `أنت مساعد ذكي تعمل كموظف خدمة عملاء في شركة (اسم شركتك).
- استخدم لهجة مصرية رسمية مختصرة ومهذبة.
- (يمكنك / لا يمكنك) تأكيد طلبات المنتجات أو الخدمات مباشرةً. لو لا يمكنك التأكيد، وجّه العميل إلى (قناة التأكيد: واتساب/رقم تليفون/رابط).
- رد بإيجاز مع توفير خطوات واضحة، وتجنب الإطالة.`
  },
  {
    id: 'tmpl-contact-info',
    title: 'بيانات التواصل',
    content: `بيانات الاتصال الرسمية:
- رقم الموبايل: (مثال: 0100xxxxxxx)
- الرقم الأرضي: (مثال: 02xxxxxxxx)
- الواتساب: (رابط أو رقم)
- موقعنا الإلكتروني: (example.com)
- رابط خريطة جوجل: (ضع رابط الخريطة)
- صفحة فيسبوك: (ضع الرابط)
- صفحة إنستجرام: (ضع الرابط)
- تيك توك: (ضع الرابط)
- رقم خاص للشكاوى: (ضع الرقم)
- رقم خاص لمتابعة الطلبات: (ضع الرقم)
- العنوان: (ضع العنوان التفصيلي)`
  },
  {
    id: 'tmpl-order-flow',
    title: 'تأكيد الطلبات واستلام البيانات',
    content: `عند طلب منتج أو خدمة:
1) اجمع البيانات بالترتيب: الاسم ثلاثي، رقم الموبايل المصري، العنوان بالتفاصيل، المنتج/الخدمة المطلوبة، العدد، ملاحظات إضافية.
2) أكّد مع العميل: "هل تريد تأكيد الطلب بالبيانات دي؟".
3) لو ناقص بيانات، اطلبها باختصار.
4) لو (لا يمكنك) تأكيد الطلب، وجّه العميل إلى (القناة الرسمية للتأكيد: واتساب/موقع/كول سنتر).`
  },
  {
    id: 'tmpl-working-hours',
    title: 'مواعيد العمل والرد',
    content: `مواعيد العمل الرسمية: (من يوم/وقت إلى يوم/وقت).
سياسة الرد: نرد خلال (مدة متوقعة: 15 دقيقة/ساعة/يوم عمل).
لو استفسار خارج المواعيد: أخبر العميل أن الطلب سيتابع أول يوم عمل تالي.`
  },
  {
    id: 'tmpl-shipping',
    title: 'الشحن والتسليم',
    content: `سياسة الشحن:
- مناطق التغطية: (داخل القاهرة/محافظات محددة).
- مدة التسليم: (مثال: 1-3 أيام عمل داخل القاهرة، 3-5 باقي المحافظات).
- مصاريف الشحن: (اكتب القيم حسب المنطقة).
- تأكيد العنوان والموبايل قبل الشحن.
لو العميل سأل عن حالة الشحنة: اطلب رقم الطلب أو الموبايل للتحقق.`
  },
  {
    id: 'tmpl-returns',
    title: 'الاسترجاع والاستبدال',
    content: `سياسة الاسترجاع/الاستبدال:
- المدة: (مثال: خلال 14 يوم من الاستلام).
- الشروط: (حالة المنتج، الملصقات، الفاتورة، التغليف الأصلي).
- الرسوم: (إن وجدت) ومن يتحمل الشحن في حالات العيب التصنيعي.
- خطوات الطلب: اجمع رقم الطلب، الاسم، الموبايل، وصف السبب، صور عند الحاجة.`
  },
  {
    id: 'tmpl-warranty',
    title: 'الضمان والدعم الفني',
    content: `سياسة الضمان:
- مدة الضمان: (مثال: 12 شهر ضد عيوب الصناعة).
- ما يغطيه الضمان: (قائمة مختصرة).
- ما لا يغطيه الضمان: (سوء الاستخدام، كسر، سوائل...).
- قناة الدعم الفني: (رقم/واتساب/بريد) مع أوقات العمل.
- اطلب من العميل رقم الطلب/المنتج وصورة أو فيديو للمشكلة إن لزم.`
  },
  {
    id: 'tmpl-tone-escalation',
    title: 'نبرة الرد والتصعيد',
    content: `نبرة الرد: رسمية، ودودة، مختصرة، بلا وعود غير مؤكدة.
لو السؤال خارج السياسات أو غير معروف، اعتذر بلطف وقدّم أقرب معلومة مؤكدة فقط.
في حال شكوى حادة:
- قدّم اعتذار مختصر.
- اطلب بيانات الطلب للتصعيد.
- مرّر للرقم/القناة المخصصة للشكاوى: (ضع القناة).`
  },
  {
    id: 'tmpl-promos',
    title: 'العروض والخصومات',
    content: `سياسة العروض:
- العروض الحالية: (اذكر أهم عرض ونطاق التاريخ).
- الشروط والاستثناءات: (حدود الكمية/المنتجات المستثناة).
- طريقة الاستفادة: (كوبون/رابط/تأكيد عبر واتساب).
لا تقدّم عرض غير مذكور صراحةً في هذه القاعدة.`
  },
  {
    id: 'tmpl-payments',
    title: 'الدفع والتحصيل',
    content: `طرق الدفع المقبولة: (كاش عند الاستلام / فيزا / تحويل بنكي / محفظة).
لو كاش عند الاستلام: نبّه العميل بتحضير المبلغ.
لو دفع إلكتروني: قدّم بيانات الدفع الآمنة أو رابط الدفع.
لا تطلب بيانات حساسة (أرقام بطاقات كاملة أو OTP).`
  }
];

async function loadRulesPage() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/rules.css";
  document.head.appendChild(link);
  const content = document.getElementById("content");
  if (!content) {
    console.error("خطأ: عنصر content غير موجود في الـ DOM");
    return;
  }

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId && role !== 'superadmin') {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض القواعد.</p>
      </div>
    `;
    return;
  }

  // Main structure for the rules page with modals
  content.innerHTML = `
    <!-- Modal Structure for Add/Edit -->
    <div id="ruleModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div id="ruleModalContent"></div>
      </div>
    </div>

    <!-- Modal Structure for Templates -->
    <div id="templatesModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="form-card">
          <h3><i class="fas fa-magic"></i> نماذج جاهزة للتعديل</h3>
          <p class="hint">هذه نماذج توجيهية فقط ولا يستخدمها البوت تلقائيًا. عدّل النص بين الأقواس وأي فراغات ثم احفظها كقاعدة عامة للبوت الحالي.</p>
          <div id="templatesList" class="grid-container rules-grid"></div>
          <div id="templateEditor" class="template-editor" style="display: none;">
            <h4 id="templateTitle"></h4>
            <p class="hint">عدّل المحتوى لتضمين بيانات شركتك وقنواتك قبل الحفظ.</p>
            <textarea id="templateContent" rows="10"></textarea>
            <div class="form-actions">
              <button id="saveTemplateAsRuleBtn" class="btn btn-primary">حفظ كقاعدة عامة للبوت الحالي</button>
              <button id="cancelTemplateEditBtn" class="btn btn-secondary">إلغاء</button>
            </div>
            <p id="templateSaveError" class="error-message" style="display: none;"></p>
          </div>
          <div class="form-actions" style="margin-top: 12px;">
            <button id="closeTemplatesModalBtn" class="btn btn-secondary">إغلاق</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Structure for Delete Confirmation -->
    <div id="deleteModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="form-card">
          <h3><i class="fas fa-exclamation-triangle"></i> تأكيد الحذف</h3>
          <p>هل أنت متأكد من حذف هذه القاعدة؟</p>
          <div class="form-actions">
            <button id="confirmDeleteBtn" class="btn btn-danger">حذف</button>
            <button id="cancelDeleteBtn" class="btn btn-secondary">إلغاء</button>
          </div>
        </div>
      </div>
    </div>

    <div class="page-header">
      <h2><i class="fas fa-book"></i> إدارة القواعد ${selectedBotId ? 'للبوت المحدد' : 'الموحدة'}</h2>
      <div class="header-actions">
        <button id="showAddRuleBtn" class="btn btn-primary"><i class="fas fa-plus-circle"></i> إضافة قاعدة جديدة</button>
        <button id="showTemplatesBtn" class="btn btn-secondary"><i class="fas fa-magic"></i> نماذج جاهزة للتعديل</button>
      </div>
    </div>

    <div class="rules-management-container">
      <div class="filters-bar">
        <div class="form-group">
          <label for="searchInput"><i class="fas fa-search"></i> بحث</label>
          <input type="text" id="searchInput" placeholder="ابحث في محتوى القواعد...">
        </div>
        <div class="form-group">
          <label for="typeFilter"><i class="fas fa-filter"></i> فلتر حسب النوع</label>
          <select id="typeFilter" name="typeFilter">
            <option value="all">الكل</option>
            <option value="general">عامة</option>
            <option value="products">أسعار</option>
            <option value="qa">سؤال وجواب</option>
            <option value="channels">قنوات</option>
            ${role === 'superadmin' ? '<option value="global">موحدة</option>' : ''}
          </select>
        </div>
        <div class="form-group actions-group">
           <button id="exportRulesBtn" class="btn btn-secondary btn-sm"><i class="fas fa-file-export"></i> تصدير</button>
           <input type="file" id="importRulesInput" accept=".json" style="display: none;">
           <button id="importRulesBtn" class="btn btn-secondary btn-sm"><i class="fas fa-file-import"></i> استيراد</button>
        </div>
      </div>

      <h3><i class="fas fa-list-ul"></i> القواعد الحالية</h3>
      <div id="rulesList" class="grid-container rules-grid"></div>
      <div id="loadingSpinner" class="spinner hidden-spinner" style="display: none;"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  const ruleModal = document.getElementById("ruleModal");
  const ruleModalContent = document.getElementById("ruleModalContent");
  const deleteModal = document.getElementById("deleteModal");
  const templatesModal = document.getElementById("templatesModal");
  const templatesListEl = document.getElementById("templatesList");
  const templateEditor = document.getElementById("templateEditor");
  const templateTitle = document.getElementById("templateTitle");
  const templateContent = document.getElementById("templateContent");
  const saveTemplateAsRuleBtn = document.getElementById("saveTemplateAsRuleBtn");
  const cancelTemplateEditBtn = document.getElementById("cancelTemplateEditBtn");
  const templateSaveError = document.getElementById("templateSaveError");
  const closeTemplatesModalBtn = document.getElementById("closeTemplatesModalBtn");
  const rulesList = document.getElementById("rulesList");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const showAddRuleBtn = document.getElementById("showAddRuleBtn");
  const showTemplatesBtn = document.getElementById("showTemplatesBtn");
  const exportRulesBtn = document.getElementById("exportRulesBtn");
  const importRulesBtn = document.getElementById("importRulesBtn");
  const importRulesInput = document.getElementById("importRulesInput");
  const paginationContainer = document.getElementById("pagination");

  let currentPage = 1;
  const rulesPerPage = 20;

  // إضافة Event Listener لإغلاق المودال لما نضغط برا
  ruleModal.addEventListener('click', (e) => {
    if (e.target === ruleModal) {
      closeModal(ruleModal);
    }
  });

  // إضافة Event Listener لإغلاق مودال التأكيد لما نضغط برا
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeModal(deleteModal);
    }
  });

  // إغلاق مودال النماذج عند الضغط خارج المحتوى
  templatesModal.addEventListener('click', (e) => {
    if (e.target === templatesModal) {
      closeTemplatesModal();
    }
  });

  // دالة Debounce لتقليل عدد الطلبات
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  showAddRuleBtn.addEventListener("click", () => showAddRuleForm(ruleModal, ruleModalContent, selectedBotId, role));
  showTemplatesBtn.addEventListener("click", () => openTemplatesModal());

  const triggerLoadRules = () => {
    const botIdToSend = typeFilter.value === 'global' ? null : selectedBotId;
    loadRules(botIdToSend, rulesList, token, typeFilter.value, searchInput.value, currentPage, rulesPerPage, paginationContainer, loadingSpinner, errorMessage);
  };

  function renderTemplatesList() {
    templatesListEl.innerHTML = '';
    ruleTemplates.forEach((tmpl) => {
      const card = document.createElement('div');
      card.className = 'card rule-card';
      card.innerHTML = `
        <div class="card-body">
          <h4>${escapeHtml(tmpl.title)}</h4>
          <pre class="template-preview" style="white-space: pre-wrap;">${escapeHtml(tmpl.content)}</pre>
          <p class="hint">هذا نموذج ثابت غير مفعّل. عدّله قبل الحفظ.</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm" data-template-id="${tmpl.id}"><i class="fas fa-edit"></i> تعديل وحفظ للبوت</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => startEditingTemplate(tmpl));
      templatesListEl.appendChild(card);
    });
  }

  function openTemplatesModal() {
    renderTemplatesList();
    resetTemplateEditor();
    openModal(templatesModal);
  }

  function closeTemplatesModal() {
    resetTemplateEditor();
    closeModal(templatesModal);
  }

  function resetTemplateEditor() {
    templateEditor.style.display = 'none';
    templateContent.value = '';
    templateTitle.textContent = '';
    templateSaveError.style.display = 'none';
    templateSaveError.textContent = '';
  }

  function startEditingTemplate(template) {
    templateTitle.textContent = template.title;
    templateContent.value = template.content;
    templateEditor.style.display = 'block';
    templateSaveError.style.display = 'none';
    templateSaveError.textContent = '';
    templateContent.focus();
  }

  async function saveTemplateAsRule() {
    const botId = localStorage.getItem('selectedBotId');
    const token = localStorage.getItem('token');
    templateSaveError.style.display = 'none';
    templateSaveError.textContent = '';

    if (!botId) {
      templateSaveError.textContent = 'يرجى اختيار بوت أولاً قبل حفظ القاعدة.';
      templateSaveError.style.display = 'block';
      return;
    }

    const content = templateContent.value.trim();
    if (!content) {
      templateSaveError.textContent = 'لا يمكن حفظ قاعدة فارغة. عدّل النموذج أولاً.';
      templateSaveError.style.display = 'block';
      return;
    }

    try {
      await handleApiRequest('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ botId, type: 'general', content }),
      }, templateSaveError, 'فشل في حفظ القاعدة من النموذج');

      alert('تم حفظ النموذج كقاعدة عامة للبوت الحالي.');
      closeTemplatesModal();
      currentPage = 1;
      triggerLoadRules();
    } catch (err) {
      // تم التعامل مع الخطأ في handleApiRequest
    }
  }

  // استخدام Debounce مع البحث والفلترة
  const debouncedLoadRules = debounce(triggerLoadRules, 300);

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    debouncedLoadRules();
  });

  typeFilter.addEventListener("change", () => {
    currentPage = 1;
    debouncedLoadRules();
  });

  // Export/Import functionality
  exportRulesBtn.addEventListener('click', async () => {
    try {
      loadingSpinner.style.display = 'flex';
      errorMessage.style.display = 'none';
      const botIdToSend = typeFilter.value === 'global' ? null : selectedBotId;
      console.log("بيحاول يعمل تصدير مع botId:", botIdToSend);

      const rules = await handleApiRequest(`/api/rules/export${botIdToSend ? `?botId=${botIdToSend}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, 'فشل في تصدير القواعد');

      console.log("البيانات اللي رجعت من الـ API:", rules);

      // التأكد إن rules هو array
      if (!Array.isArray(rules)) {
        throw new Error("البيانات المرجعة من الـ API مش في شكل مصفوفة");
      }

      const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules_${botIdToSend || 'global'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      loadingSpinner.style.display = 'none';
    } catch (err) {
      console.error("حصل خطأ أثناء التصدير:", err);
      loadingSpinner.style.display = 'none';
      errorMessage.textContent = err.message || 'فشل في تصدير القواعد';
      errorMessage.style.display = 'block';
    }
  });

  importRulesBtn.addEventListener('click', () => importRulesInput.click());

  importRulesInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    loadingSpinner.style.display = 'flex';
    errorMessage.style.display = 'none';
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rulesToImport = JSON.parse(e.target.result);
        const botIdToSend = typeFilter.value === 'global' ? null : selectedBotId;
        const result = await handleApiRequest('/api/rules/import', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ botId: botIdToSend, rules: rulesToImport }),
        }, errorMessage, 'فشل في استيراد القواعد');
        alert(result.message || 'تم استيراد القواعد بنجاح');
        currentPage = 1;
        triggerLoadRules();
      } catch (err) {
        importRulesInput.value = '';
        // الخطأ تم التعامل معه في handleApiRequest
      } finally {
        loadingSpinner.style.display = 'none';
      }
    };
    reader.onerror = () => {
      errorMessage.textContent = 'فشل في قراءة الملف.';
      errorMessage.style.display = 'block';
      loadingSpinner.style.display = 'none';
      importRulesInput.value = '';
    };
    reader.readAsText(file);
  });

  saveTemplateAsRuleBtn.addEventListener('click', saveTemplateAsRule);
  cancelTemplateEditBtn.addEventListener('click', resetTemplateEditor);
  closeTemplatesModalBtn.addEventListener('click', closeTemplatesModal);

  // Initial load
  const cached = window.readPageCache ? window.readPageCache(cacheKey, selectedBotId || 'global', 3 * 60 * 1000) : null;
  if (cached && Array.isArray(cached.rules)) {
    currentPage = cached.currentPage || 1;
    typeFilter.value = cached.type || 'all';
    searchInput.value = cached.search || '';
    cached.rules.forEach(rule => {
      rulesList.appendChild(createRuleCard(rule));
    });
    setupPagination(paginationContainer, cached.currentPage || 1, cached.totalPages || 1, (newPage) => {
      loadRules(cached.botId, rulesList, token, cached.type, cached.search, newPage, rulesPerPage, paginationContainer, loadingSpinner, errorMessage);
    });
    loadingSpinner.style.display = 'none';
  }

  triggerLoadRules();
}

async function loadRules(botId, listElement, token, type, search, page, limit, paginationContainer, spinner, errorElement) {
  spinner.style.display = "flex";
  console.log("الـ Spinner ظهر دلوقتي");
  errorElement.style.display = "none";
  listElement.innerHTML = "";

  try {
    let url = `/api/rules?page=${page}&limit=${limit}`;
    if (botId) {
      url += `&botId=${botId}`;
    }
    if (type !== "all") {
      url += `&type=${type}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const data = await handleApiRequest(url, {
      headers: { Authorization: `Bearer ${token}` },
    }, errorElement, "فشل في جلب القواعد");

    console.log("تم جلب القواعد بنجاح:", data);

    const rules = data.rules;
    const totalRules = data.totalRules;
    const totalPages = data.totalPages;

    if (rules.length === 0) {
      listElement.innerHTML = '<div class="card placeholder-card"><p>لا توجد قواعد تطابق البحث أو الفلتر.</p></div>';
    } else {
      rules.forEach(rule => {
        listElement.appendChild(createRuleCard(rule));
      });
    }

    setupPagination(paginationContainer, page, totalPages, (newPage) => {
      loadRules(botId, listElement, token, type, search, newPage, limit, paginationContainer, spinner, errorElement);
    });

    window.writePageCache && window.writePageCache(cacheKey, botId || 'global', {
      botId,
      type,
      search,
      currentPage: page,
      totalPages,
      rules,
    });

  } catch (err) {
    console.error("حصل خطأ في جلب القواعد:", err);
  } finally {
    spinner.style.display = "none";
    console.log("الـ Spinner اتخفى دلوقتي");
  }
}

function createRuleCard(rule) {
  const card = document.createElement("div");
  card.className = `card rule-card rule-type-${rule.type}`;
  let contentHtml = "";

  switch (rule.type) {
    case "general":
      contentHtml = `<p><strong>المحتوى:</strong> ${escapeHtml(rule.content)}</p>`;
      break;
    case "global":
      contentHtml = `<p><strong>المحتوى (موحد):</strong> ${escapeHtml(rule.content)}</p>`;
      break;
    case "products":
      contentHtml = `
        <p><strong>المنتج:</strong> ${escapeHtml(rule.content.product)}</p>
        <p><strong>السعر:</strong> ${escapeHtml(rule.content.price)} ${escapeHtml(rule.content.currency)}</p>
      `;
      break;
    case "qa":
      contentHtml = `
        <p><strong>السؤال:</strong> ${escapeHtml(rule.content.question)}</p>
        <p><strong>الإجابة:</strong> ${escapeHtml(rule.content.answer)}</p>
      `;
      break;
    case "channels":
      contentHtml = `
        <p><strong>المنصة:</strong> ${escapeHtml(rule.content.platform)}</p>
        <p><strong>الوصف:</strong> ${escapeHtml(rule.content.description)}</p>
        <p><strong>القيمة:</strong> ${escapeHtml(rule.content.value)}</p>
      `;
      break;
    default:
      contentHtml = `<p>محتوى غير معروف</p>`;
  }

  card.innerHTML = `
    <div class="card-body">
      ${contentHtml}
    </div>
    <div class="card-footer">
      <span class="rule-type-badge">نوع: ${getRuleTypeName(rule.type)}</span>
      <div class="rule-actions">
        <button class="btn-icon btn-edit" onclick="showEditRuleForm(document.getElementById('ruleModal'), document.getElementById('ruleModalContent'), '${rule._id}')" title="تعديل القاعدة"><i class="fas fa-edit"></i></button>
        <button class="btn-icon btn-delete" onclick="showDeleteConfirmation('${rule._id}')" title="حذف القاعدة"><i class="fas fa-trash-alt"></i></button>
      </div>
    </div>
  `;
  return card;
}

function getRuleTypeName(type) {
  switch (type) {
    case "general": return "عامة";
    case "products": return "أسعار";
    case "qa": return "سؤال وجواب";
    case "channels": return "قنوات";
    case "global": return "موحدة";
    default: return type;
  }
}

function openModal(modal) {
  modal.style.display = "flex";
}

function closeModal(modal) {
  modal.style.display = "none";
  const modalContent = modal.querySelector("#ruleModalContent");
  if (modalContent) modalContent.innerHTML = "";
}

function showAddRuleForm(modal, modalContent, botId, role) {
  modalContent.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-plus-circle"></i> إضافة قاعدة جديدة</h3>
      <form id="addRuleForm">
        <div class="form-group">
          <label for="addRuleType">نوع القاعدة</label>
          <select id="addRuleType" required>
            <option value="">اختر النوع...</option>
            <option value="general">عامة</option>
            <option value="products">قائمة الأسعار</option>
            <option value="qa">سؤال وجواب</option>
            <option value="channels">قنوات التواصل</option>
            ${role === 'superadmin' ? '<option value="global">موحدة (لكل البوتات)</option>' : ''}
          </select>
        </div>
        <div id="addRuleContentFields"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ</button>
          <button type="button" class="btn btn-secondary" onclick="closeModal(document.getElementById('ruleModal'))">إلغاء</button>
        </div>
        <p id="addRuleFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  openModal(modal);

  const typeSelect = document.getElementById("addRuleType");
  const contentFieldsContainer = document.getElementById("addRuleContentFields");

  typeSelect.addEventListener("change", () => {
    loadRuleContentFields(contentFieldsContainer, typeSelect.value);
  });

  document.getElementById("addRuleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    const errorEl = document.getElementById("addRuleFormError");
    errorEl.style.display = "none";
    let contentData;

    try {
      contentData = getRuleContentFromForm(contentFieldsContainer, type);
      if (!contentData) return;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      return;
    }

    const ruleData = type === 'global' ? { type, content: contentData } : { botId, type, content: contentData };

    try {
      await handleApiRequest("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(ruleData),
      }, errorEl, "فشل في إضافة القاعدة");
      alert("تم إضافة القاعدة بنجاح!");
      closeModal(modal);
      const currentTypeFilter = document.getElementById("typeFilter").value;
      const currentSearch = document.getElementById("searchInput").value;
      const botIdToSend = currentTypeFilter === 'global' ? null : botId;
      const token = localStorage.getItem("token");
      const rulesList = document.getElementById("rulesList");
      const loadingSpinner = document.getElementById("loadingSpinner");
      const errorMessage = document.getElementById("errorMessage");
      const paginationContainer = document.getElementById("pagination");
      currentPage = 1; // Reset to first page
      console.log("بيحاول يعمل ريلود بعد الإضافة...");
      loadRules(botIdToSend, rulesList, token, currentTypeFilter, currentSearch, currentPage, 20, paginationContainer, loadingSpinner, errorMessage);
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    }
  });
}

async function showEditRuleForm(modal, modalContent, ruleId) {
  const token = localStorage.getItem("token");
  const errorEl = document.getElementById("errorMessage");
  errorEl.style.display = "none";
  modalContent.innerHTML = '<div class="form-card"><div class="spinner"><div class="loader"></div></div></div>';
  openModal(modal);

  try {
    const rule = await handleApiRequest(`/api/rules/${ruleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, errorEl, "فشل في جلب تفاصيل القاعدة");

    modalContent.innerHTML = `
      <div class="form-card">
        <h3><i class="fas fa-edit"></i> تعديل القاعدة (النوع: ${getRuleTypeName(rule.type)})</h3>
        <form id="editRuleForm">
          <div id="editRuleContentFields"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">حفظ</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal(document.getElementById('ruleModal'))">إلغاء</button>
          </div>
          <p id="editRuleFormError" class="error-message" style="display: none;"></p>
        </form>
      </div>
    `;

    const contentFieldsContainer = document.getElementById("editRuleContentFields");
    loadRuleContentFields(contentFieldsContainer, rule.type, rule.content);

    document.getElementById("editRuleForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const editErrorEl = document.getElementById("editRuleFormError");
      editErrorEl.style.display = "none";
      let contentData;

      try {
        contentData = getRuleContentFromForm(contentFieldsContainer, rule.type);
        if (!contentData) return;
      } catch (err) {
        editErrorEl.textContent = err.message;
        editErrorEl.style.display = "block";
        return;
      }

      try {
        await handleApiRequest(`/api/rules/${ruleId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: contentData }),
        }, editErrorEl, "فشل في تعديل القاعدة");
        alert("تم تعديل القاعدة بنجاح!");
        closeModal(modal);
        const botId = localStorage.getItem("selectedBotId");
        const currentTypeFilter = document.getElementById("typeFilter").value;
        const currentSearch = document.getElementById("searchInput").value;
        const rulesList = document.getElementById("rulesList");
        const loadingSpinner = document.getElementById("loadingSpinner");
        const errorMessage = document.getElementById("errorMessage");
        const paginationContainer = document.getElementById("pagination");
        currentPage = 1; // Reset to first page
        console.log("بيحاول يعمل ريلود بعد التعديل...");
        const botIdToSend = currentTypeFilter === 'global' ? null : botId;
        loadRules(botIdToSend, rulesList, token, currentTypeFilter, currentSearch, currentPage, 20, paginationContainer, loadingSpinner, errorMessage);
      } catch (err) {
        // الخطأ تم التعامل معه في handleApiRequest
      }
    });

  } catch (err) {
    closeModal(modal);
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

function showDeleteConfirmation(ruleId) {
  const deleteModal = document.getElementById("deleteModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

  openModal(deleteModal);

  confirmDeleteBtn.onclick = () => {
    deleteRule(ruleId);
    closeModal(deleteModal);
  };

  cancelDeleteBtn.onclick = () => {
    closeModal(deleteModal);
  };
}

async function deleteRule(ruleId) {
  const token = localStorage.getItem("token");
  const errorElement = document.getElementById("errorMessage");
  errorElement.style.display = "none";
  try {
    await handleApiRequest(`/api/rules/${ruleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, errorElement, "فشل في حذف القاعدة");
    alert("تم حذف القاعدة بنجاح");
    const botId = localStorage.getItem("selectedBotId");
    const currentTypeFilter = document.getElementById("typeFilter").value;
    const currentSearch = document.getElementById("searchInput").value;
    const rulesList = document.getElementById("rulesList");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const paginationContainer = document.getElementById("pagination");
    currentPage = 1; // Reset to first page
    console.log("بيحاول يعمل ريلود بعد الحذف...");
    const botIdToSend = currentTypeFilter === 'global' ? null : botId;
    loadRules(botIdToSend, rulesList, token, currentTypeFilter, currentSearch, currentPage, 20, paginationContainer, loadingSpinner, errorElement);
  } catch (err) {
    // الخطأ تم التعامل معه في handleApiRequest
  }
}

function loadRuleContentFields(container, type, currentContent = null) {
  container.innerHTML = "";
  switch (type) {
    case "general":
      container.innerHTML = `
        <div class="form-group">
          <label for="ruleContent">المحتوى (خاص بالبوت المحدد)</label>
          <textarea id="ruleContent" name="content" required>${currentContent ? escapeHtml(currentContent) : ''}</textarea>
        </div>
      `;
      break;
    case "global":
      container.innerHTML = `
        <div class="form-group">
          <label for="ruleContent">المحتوى (موحد لكل البوتات)</label>
          <textarea id="ruleContent" name="content" required>${currentContent ? escapeHtml(currentContent) : ''}</textarea>
        </div>
      `;
      break;
    case "products":
      container.innerHTML = `
        <div class="form-group">
          <label for="product">المنتج</label>
          <input type="text" id="product" name="product" required value="${currentContent?.product ? escapeHtml(currentContent.product) : ''}">
        </div>
        <div class="form-group">
          <label for="price">السعر</label>
          <input type="number" id="price" name="price" required min="0" step="0.01" value="${currentContent?.price ? escapeHtml(currentContent.price) : ''}">
        </div>
        <div class="form-group">
          <label for="currency">العملة</label>
          <select id="currency" name="currency" required>
            <option value="جنيه" ${currentContent?.currency === 'جنيه' ? 'selected' : ''}>جنيه</option>
            <option value="دولار" ${currentContent?.currency === 'دولار' ? 'selected' : ''}>دولار</option>
          </select>
        </div>
      `;
      break;
    case "qa":
      container.innerHTML = `
        <div class="form-group">
          <label for="question">السؤال</label>
          <input type="text" id="question" name="question" required value="${currentContent?.question ? escapeHtml(currentContent.question) : ''}">
        </div>
        <div class="form-group">
          <label for="answer">الإجابة</label>
          <textarea id="answer" name="answer" required>${currentContent?.answer ? escapeHtml(currentContent.answer) : ''}</textarea>
        </div>
      `;
      break;
    case "channels":
      container.innerHTML = `
        <div class="form-group">
          <label for="platform">المنصة</label>
          <select id="platform" name="platform" required>
            <option value="فيسبوك" ${currentContent?.platform === 'فيسبوك' ? 'selected' : ''}>فيسبوك</option>
            <option value="تويتر" ${currentContent?.platform === 'تويتر' ? 'selected' : ''}>تويتر</option>
            <option value="إنستغرام" ${currentContent?.platform === 'إنستغرام' ? 'selected' : ''}>إنستغرام</option>
            <option value="واتساب" ${currentContent?.platform === 'واتساب' ? 'selected' : ''}>واتساب</option>
            <option value="رقم الاتصال" ${currentContent?.platform === 'رقم الاتصال' ? 'selected' : ''}>رقم الاتصال</option>
            <option value="رقم الأرضي" ${currentContent?.platform === 'رقم الأرضي' ? 'selected' : ''}>رقم الأرضي</option>
            <option value="موقع ويب" ${currentContent?.platform === 'موقع ويب' ? 'selected' : ''}>موقع ويب</option>
            <option value="متجر إلكتروني" ${currentContent?.platform === 'متجر إلكتروني' ? 'selected' : ''}>متجر إلكتروني</option>
            <option value="خريطة" ${currentContent?.platform === 'خريطة' ? 'selected' : ''}>رابط الخريطة</option>
            <option value="أخرى" ${currentContent?.platform === 'أخرى' ? 'selected' : ''}>أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label for="description">الوصف</label>
          <textarea id="description" name="description" required>${currentContent?.description ? escapeHtml(currentContent.description) : ''}</textarea>
        </div>
        <div class="form-group">
          <label for="value">الرابط/الرقم</label>
          <input type="text" id="value" name="value" required value="${currentContent?.value ? escapeHtml(currentContent.value) : ''}">
        </div>
      `;
      break;
    default:
      container.innerHTML = '<p class="error-message">نوع قاعدة غير معروف.</p>';
  }
}

function getRuleContentFromForm(container, type) {
  switch (type) {
    case "general":
    case "global":
      const content = container.querySelector("#ruleContent")?.value.trim();
      if (!content) throw new Error("يرجى إدخال المحتوى.");
      return content;
    case "products":
      const product = container.querySelector("#product")?.value.trim();
      const price = parseFloat(container.querySelector("#price")?.value);
      const currency = container.querySelector("#currency")?.value;
      if (!product || isNaN(price) || price <= 0 || !currency) throw new Error("يرجى ملء جميع حقول المنتج بشكل صحيح.");
      return { product, price, currency };
    case "qa":
      const question = container.querySelector("#question")?.value.trim();
      const answer = container.querySelector("#answer")?.value.trim();
      if (!question || !answer) throw new Error("يرجى إدخال السؤال والإجابة.");
      return { question, answer };
    case "channels":
      const platform = container.querySelector("#platform")?.value;
      const description = container.querySelector("#description")?.value.trim();
      const value = container.querySelector("#value")?.value.trim();
      if (!platform || !description || !value) throw new Error("يرجى ملء جميع حقول القناة بشكل صحيح.");
      return { platform, description, value };
    default:
      throw new Error("نوع قاعدة غير صالح.");
  }
}

function setupPagination(container, currentPage, totalPages, onPageClick) {
  container.innerHTML = '';
  if (totalPages <= 1) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  const createPageButton = (pageNumber, text = null, isActive = false, isDisabled = false) => {
    const button = document.createElement('button');
    button.textContent = text || pageNumber;
    button.disabled = isDisabled;
    if (isActive) button.classList.add('active');
    button.addEventListener('click', () => {
      if (!isDisabled && !isActive) onPageClick(pageNumber);
    });
    return button;
  };

  // Previous Button
  container.appendChild(createPageButton(currentPage - 1, 'السابق', false, currentPage === 1));

  // Dynamic page numbers with ellipsis
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage === totalPages) {
    startPage = Math.max(1, totalPages - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createPageButton(1));
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      container.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createPageButton(i, null, i === currentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      container.appendChild(ellipsis);
    }
    container.appendChild(createPageButton(totalPages));
  }

  // Next Button
  container.appendChild(createPageButton(currentPage + 1, 'التالي', false, currentPage === totalPages));
}

// --- Helper Functions ---
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe);
  }
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

// Make functions globally accessible
window.loadRulesPage = loadRulesPage;
window.showAddRuleForm = showAddRuleForm;
window.showEditRuleForm = showEditRuleForm;
window.deleteRule = deleteRule;
window.showDeleteConfirmation = showDeleteConfirmation;
window.openModal = openModal;
window.closeModal = closeModal;
