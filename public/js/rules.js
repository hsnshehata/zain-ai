// public/js/rules.js (Updated for new dashboard design)

async function loadRulesPage() {
  const content = document.getElementById("content");
  if (!content) {
    console.error("خطأ: عنصر content غير موجود في الـ DOM");
    return;
  }

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض القواعد.</p>
      </div>
    `;
    return;
  }

  // Main structure for the rules page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-book"></i> إدارة القواعد للبوت المحدد</h2>
      <div class="header-actions">
        <button id="showAddRuleBtn" class="btn btn-primary"><i class="fas fa-plus-circle"></i> إضافة قاعدة جديدة</button>
      </div>
    </div>

    <div id="ruleFormContainer" class="form-section" style="display: none;">
      <!-- Form will be loaded here by showAddRuleForm -->
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
      <div id="loadingSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  const ruleFormContainer = document.getElementById("ruleFormContainer");
  const rulesList = document.getElementById("rulesList");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const showAddRuleBtn = document.getElementById("showAddRuleBtn");
  const exportRulesBtn = document.getElementById("exportRulesBtn");
  const importRulesBtn = document.getElementById("importRulesBtn");
  const importRulesInput = document.getElementById("importRulesInput");
  const paginationContainer = document.getElementById("pagination");

  let currentPage = 1;
  const rulesPerPage = 12; // Adjust as needed

  showAddRuleBtn.addEventListener("click", () => showAddRuleForm(ruleFormContainer, selectedBotId, role));

  const triggerLoadRules = () => {
      loadRules(selectedBotId, rulesList, token, typeFilter.value, searchInput.value, currentPage, rulesPerPage, paginationContainer, loadingSpinner, errorMessage);
  };

  searchInput.addEventListener("input", () => {
      currentPage = 1;
      triggerLoadRules();
  });

  typeFilter.addEventListener("change", () => {
      currentPage = 1;
      triggerLoadRules();
  });

  // Export/Import functionality
  exportRulesBtn.addEventListener('click', async () => {
      try {
          loadingSpinner.style.display = 'flex';
          const response = await fetch(`/api/rules/export?botId=${selectedBotId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('فشل في تصدير القواعد');
          const rules = await response.json();
          const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `rules_${selectedBotId}_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          loadingSpinner.style.display = 'none';
      } catch (err) {
          console.error('خطأ في تصدير القواعد:', err);
          errorMessage.textContent = 'خطأ في تصدير القواعد.';
          errorMessage.style.display = 'block';
          loadingSpinner.style.display = 'none';
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
              const response = await fetch('/api/rules/import', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ botId: selectedBotId, rules: rulesToImport }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.message || 'فشل في استيراد القواعد');
              alert(result.message || 'تم استيراد القواعد بنجاح');
              currentPage = 1;
              triggerLoadRules(); // Refresh the list
          } catch (err) {
              console.error('خطأ في استيراد القواعد:', err);
              errorMessage.textContent = `خطأ في استيراد القواعد: ${err.message}`;
              errorMessage.style.display = 'block';
              loadingSpinner.style.display = 'none';
          } finally {
              importRulesInput.value = ''; // Reset file input
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

  // Initial load
  triggerLoadRules();
}

async function loadRules(botId, listElement, token, type, search, page, limit, paginationContainer, spinner, errorElement) {
  spinner.style.display = "flex";
  errorElement.style.display = "none";
  listElement.innerHTML = ""; // Clear previous rules

  try {
    let url = `/api/rules?botId=${botId}&page=${page}&limit=${limit}`;
    if (type !== "all") {
      url += `&type=${type}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        if (res.status === 401) {
            alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
            logoutUser();
            return;
        }
      throw new Error(`فشل في جلب القواعد: ${res.statusText}`);
    }

    const data = await res.json();
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

  } catch (err) {
    console.error("خطأ في جلب القواعد:", err);
    errorElement.textContent = err.message || "خطأ في جلب القواعد.";
    errorElement.style.display = "block";
  } finally {
    spinner.style.display = "none";
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
        <button class="btn-icon btn-edit" onclick="showEditRuleForm(document.getElementById('ruleFormContainer'), '${rule._id}')" title="تعديل القاعدة"><i class="fas fa-edit"></i></button>
        <button class="btn-icon btn-delete" onclick="deleteRule('${rule._id}')" title="حذف القاعدة"><i class="fas fa-trash-alt"></i></button>
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

function showAddRuleForm(container, botId, role) {
  container.innerHTML = `
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
          <button type="submit" class="btn btn-primary">إضافة القاعدة</button>
          <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('ruleFormContainer'))">إلغاء</button>
        </div>
        <p id="addRuleFormError" class="error-message" style="display: none;"></p>
      </form>
    </div>
  `;
  container.style.display = "block";

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
        if (!contentData) return; // Error handled within getRuleContentFromForm
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
        return;
    }

    const ruleData = { botId, type, content: contentData };
    if (type === 'global') {
        delete ruleData.botId; // Global rules don't have a botId
    }

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(ruleData),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم إضافة القاعدة بنجاح!");
        hideForm(container);
        // Refresh the list
        const currentTypeFilter = document.getElementById("typeFilter").value;
        const currentSearch = document.getElementById("searchInput").value;
        loadRules(botId, document.getElementById("rulesList"), localStorage.getItem("token"), currentTypeFilter, currentSearch, 1, rulesPerPage, document.getElementById("pagination"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
      } else {
        errorEl.textContent = data.message || "فشل في إضافة القاعدة";
        errorEl.style.display = "block";
      }
    } catch (err) {
      console.error("خطأ في إضافة القاعدة:", err);
      errorEl.textContent = "خطأ في الاتصال بالخادم";
      errorEl.style.display = "block";
    }
  });
}

async function showEditRuleForm(container, ruleId) {
  const token = localStorage.getItem("token");
  const errorEl = document.getElementById("errorMessage"); // Use main error display
  errorEl.style.display = "none";
  container.innerHTML = '<div class="form-card"><div class="spinner"><div class="loader"></div></div></div>';
  container.style.display = "block";

  try {
    const res = await fetch(`/api/rules/${ruleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("فشل في جلب تفاصيل القاعدة");
    const rule = await res.json();

    container.innerHTML = `
      <div class="form-card">
        <h3><i class="fas fa-edit"></i> تعديل القاعدة (النوع: ${getRuleTypeName(rule.type)})</h3>
        <form id="editRuleForm">
          <div id="editRuleContentFields"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
            <button type="button" class="btn btn-secondary" onclick="hideForm(document.getElementById('ruleFormContainer'))">إلغاء</button>
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
          if (!contentData) return; // Error handled within getRuleContentFromForm
      } catch (err) {
          editErrorEl.textContent = err.message;
          editErrorEl.style.display = "block";
          return;
      }

      try {
        const updateRes = await fetch(`/api/rules/${ruleId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: contentData }), // Only content can be updated
        });
        const data = await updateRes.json();
        if (updateRes.ok) {
          alert("تم تعديل القاعدة بنجاح!");
          hideForm(container);
          // Refresh the list
          const botId = localStorage.getItem("selectedBotId");
          const currentTypeFilter = document.getElementById("typeFilter").value;
          const currentSearch = document.getElementById("searchInput").value;
          const currentPage = parseInt(document.querySelector('.pagination .active')?.textContent || '1');
          loadRules(botId, document.getElementById("rulesList"), token, currentTypeFilter, currentSearch, currentPage, rulesPerPage, document.getElementById("pagination"), document.getElementById("loadingSpinner"), document.getElementById("errorMessage"));
        } else {
          editErrorEl.textContent = data.message || "فشل في تعديل القاعدة";
          editErrorEl.style.display = "block";
        }
      } catch (err) {
        console.error("خطأ في تعديل القاعدة:", err);
        editErrorEl.textContent = "خطأ في الاتصال بالخادم";
        editErrorEl.style.display = "block";
      }
    });

  } catch (err) {
    console.error("خطأ في عرض نموذج التعديل:", err);
    errorEl.textContent = "خطأ في تحميل بيانات القاعدة للتعديل.";
    errorEl.style.display = "block";
    container.innerHTML = "";
    container.style.display = "none";
  }
}

function loadRuleContentFields(container, type, currentContent = null) {
  container.innerHTML = ""; // Clear previous fields
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
            <!-- Add other currencies if needed -->
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

async function deleteRule(ruleId) {
  if (confirm("هل أنت متأكد من حذف هذه القاعدة؟")) {
    const token = localStorage.getItem("token");
    const errorElement = document.getElementById("errorMessage");
    errorElement.style.display = "none";
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم حذف القاعدة بنجاح");
        // Refresh the list
        const botId = localStorage.getItem("selectedBotId");
        const currentTypeFilter = document.getElementById("typeFilter").value;
        const currentSearch = document.getElementById("searchInput").value;
        const currentPage = parseInt(document.querySelector('.pagination .active')?.textContent || '1');
        loadRules(botId, document.getElementById("rulesList"), token, currentTypeFilter, currentSearch, currentPage, rulesPerPage, document.getElementById("pagination"), document.getElementById("loadingSpinner"), errorElement);
      } else {
        throw new Error(data.message || "فشل في حذف القاعدة");
      }
    } catch (err) {
      console.error("خطأ في حذف القاعدة:", err);
      errorElement.textContent = err.message;
      errorElement.style.display = "block";
    }
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
        button.textContent = text !== null ? text : pageNumber;
        button.disabled = isDisabled;
        if (isActive) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            if (!isDisabled && !isActive) {
                onPageClick(pageNumber);
            }
        });
        return button;
    };

    // Previous Button
    container.appendChild(createPageButton(currentPage - 1, 'السابق', false, currentPage === 1));

    // Page Numbers (simplified for brevity, consider adding ellipsis for many pages)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

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
function hideForm(container) {
  container.innerHTML = "";
  container.style.display = "none";
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        // Handle numbers, booleans, etc.
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
window.hideForm = hideForm; // Make hideForm global as it's used in onclick

