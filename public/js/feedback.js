// public/js/feedback.js (Updated for new dashboard design and unified error handling)

async function loadFeedbackPage() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/feedback.css";
  document.head.appendChild(link);
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض التقييمات.</p>
      </div>
    `;
    return;
  }

  if (!token) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
        <p>يرجى تسجيل الدخول لعرض التقييمات.</p>
      </div>
    `;
    return;
  }

  // Main structure for the feedback page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-comments"></i> مراجعة التقييمات</h2>
      <div class="header-actions">
         <p class="feedback-note"><i class="fas fa-info-circle"></i> تساعد مراجعة التقييمات في تحسين أداء البوت.</p>
      </div>
    </div>

    <div class="feedback-container">
        <div class="feedback-column positive-column">
          <div class="column-header">
            <h3><i class="fas fa-thumbs-up"></i> التقييمات الإيجابية</h3>
            <div class="column-actions">
                <button onclick="downloadFeedback('positive')" class="btn btn-secondary btn-sm" title="تنزيل CSV"><i class="fas fa-download"></i></button>
                <button onclick="clearFeedback('positive')" class="btn btn-danger btn-sm" title="حذف الكل"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
          <div id="positiveFeedbackList" class="feedback-list"></div>
          <div id="positiveSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
          <div id="positiveError" class="error-message" style="display: none;"></div>
        </div>

        <div class="feedback-column negative-column">
           <div class="column-header">
             <h3><i class="fas fa-thumbs-down"></i> التقييمات السلبية</h3>
             <div class="column-actions">
                <button onclick="downloadFeedback('negative')" class="btn btn-secondary btn-sm" title="تنزيل CSV"><i class="fas fa-download"></i></button>
                <button onclick="clearFeedback('negative')" class="btn btn-danger btn-sm" title="حذف الكل"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
          <div id="negativeFeedbackList" class="feedback-list"></div>
          <div id="negativeSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
          <div id="negativeError" class="error-message" style="display: none;"></div>
        </div>
    </div>
  `;

  await loadFeedback(selectedBotId, token);
}

async function loadFeedback(botId, token) {
  console.log(`📋 Loading feedback for botId: ${botId}`);
  const positiveList = document.getElementById("positiveFeedbackList");
  const negativeList = document.getElementById("negativeFeedbackList");
  const positiveSpinner = document.getElementById("positiveSpinner");
  const negativeSpinner = document.getElementById("negativeSpinner");
  const positiveError = document.getElementById("positiveError");
  const negativeError = document.getElementById("negativeError");

  if (!positiveList || !negativeList || !positiveSpinner || !negativeSpinner || !positiveError || !negativeError) {
    console.error("Feedback elements not found in DOM");
    alert("خطأ في تحميل واجهة التقييمات، حاول مرة أخرى.");
    return;
  }

  positiveSpinner.style.display = "flex";
  negativeSpinner.style.display = "flex";
  positiveError.style.display = "none";
  negativeError.style.display = "none";
  positiveList.innerHTML = "";
  negativeList.innerHTML = "";

  try {
    const feedbackData = await handleApiRequest(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    }, positiveError, "تعذر تحميل التقييمات");

    const positiveFeedback = feedbackData.filter(item => item.feedback === "positive");
    const negativeFeedback = feedbackData.filter(item => item.feedback === "negative");

    // Populate Positive Feedback
    if (positiveFeedback.length === 0) {
      positiveList.innerHTML = 
        `<div class="card placeholder-card"><p>لا توجد تقييمات إيجابية.</p></div>`;
    } else {
      positiveFeedback.forEach(item => positiveList.appendChild(createFeedbackCard(item, botId)));
    }

    // Populate Negative Feedback
    if (negativeFeedback.length === 0) {
      negativeList.innerHTML = 
        `<div class="card placeholder-card"><p>لا توجد تقييمات سلبية.</p></div>`;
    } else {
      negativeFeedback.forEach(item => negativeList.appendChild(createFeedbackCard(item, botId)));
    }

    // إضافة Event Listeners لأزرار التعديل
    document.querySelectorAll(".edit-rule-btn").forEach(button => {
      button.addEventListener("click", handleEditRuleClick);
    });
    document.querySelectorAll(".save-edited-rule-btn").forEach(button => {
      button.addEventListener("click", handleSaveEditedRuleClick);
    });
    document.querySelectorAll(".cancel-edit-btn").forEach(button => {
      button.addEventListener("click", handleCancelEditClick);
    });

  } catch (err) {
    negativeError.textContent = positiveError.textContent; // Sync error messages
    negativeError.style.display = "block";
    console.error("خطأ في تحميل التقييمات:", err);
  } finally {
    positiveSpinner.style.display = "none";
    negativeSpinner.style.display = "none";
  }
}

function createFeedbackCard(item, botId) {
  const card = document.createElement("div");
  card.className = "card feedback-card";
  const userMessageDisplay = item.userMessage === "غير معروف" ? "لم يتم العثور على رسالة المستخدم" : item.userMessage;
  card.innerHTML = `
    <div class="card-body">
        <p><strong><i class="fas fa-user"></i> المستخدم:</strong> ${escapeHtml(item.username || item.userId || "غير معروف")}</p>
        <p><strong><i class="fas fa-comment"></i> رسالة المستخدم:</strong> ${escapeHtml(userMessageDisplay)}</p>
        <p><strong><i class="fas fa-robot"></i> رد البوت:</strong> ${escapeHtml(item.messageContent || "غير متوفر")}</p>
        <p><strong><i class="fas fa-clock"></i> التاريخ:</strong> ${new Date(item.timestamp).toLocaleString("ar-EG")}</p>
        <div class="message-actions">
          <button class="btn btn-sm btn-outline-secondary edit-rule-btn" 
                  data-feedback-id="${item._id}"
                  data-question="${escapeHtml(item.userMessage)}" 
                  data-answer="${escapeHtml(item.messageContent)}">
            <i class="fas fa-edit"></i> تعديل
          </button>
        </div>
        <div class="edit-area" id="edit-area-${item._id}" style="display: none;">
          <textarea class="form-control edit-textarea" rows="3"></textarea>
          <button class="btn btn-sm btn-primary save-edited-rule-btn">
            <i class="fas fa-save"></i> حفظ كقاعدة جديدة
          </button>
          <button class="btn btn-sm btn-secondary cancel-edit-btn">
            <i class="fas fa-times"></i> إلغاء
          </button>
        </div>
    </div>
    <div class="card-footer">
        <button class="btn-icon btn-delete" onclick="deleteFeedback('${item._id}', '${botId}')" title="حذف التقييم">
            <i class="fas fa-trash-alt"></i>
        </button>
    </div>
  `;
  return card;
}

async function deleteFeedback(feedbackId, botId) {
  console.log(`🗑️ Attempting to delete feedback ID: ${feedbackId} for botId: ${botId}`);
  if (!botId || !feedbackId) {
    alert("معلومات غير كافية لحذف التقييم.");
    return;
  }

  if (confirm("هل أنت متأكد من حذف هذا التقييم؟")) {
    const token = localStorage.getItem("token");
    try {
      await handleApiRequest(`/api/bots/${botId}/feedback/${feedbackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }, document.getElementById("positiveError"), "فشل في حذف التقييم");
      alert("تم حذف التقييم بنجاح");
      await loadFeedback(botId, token);
    } catch (err) {
      console.error("خطأ في حذف التقييم:", err);
    }
  }
}

async function clearFeedback(type) {
  const botId = localStorage.getItem("selectedBotId");
  const token = localStorage.getItem("token");
  console.log(`🗑️ Attempting to clear ${type} feedback for botId: ${botId}`);
  if (!botId) {
    alert("يرجى اختيار بوت أولاً.");
    return;
  }

  const typeName = type === "positive" ? "الإيجابية" : "السلبية";
  if (confirm(`هل أنت متأكد من حذف جميع التقييمات ${typeName} لهذا البوت؟`)) {
    const listId = type === "positive" ? "positiveFeedbackList" : "negativeFeedbackList";
    const spinnerId = type === "positive" ? "positiveSpinner" : "negativeSpinner";
    const errorId = type === "positive" ? "positiveError" : "negativeError";

    document.getElementById(spinnerId).style.display = "flex";
    document.getElementById(errorId).style.display = "none";

    try {
      console.log(`📡 Sending DELETE request to /api/bots/${botId}/feedback/clear/${type}`); // لوج جديد
      const response = await handleApiRequest(`/api/bots/${botId}/feedback/clear/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }, document.getElementById(errorId), `فشل في حذف التقييمات ${typeName}`);
      console.log(`✅ Server response:`, response); // لوج جديد
      alert(`تم حذف التقييمات ${typeName} بنجاح`);
      document.getElementById(listId).innerHTML = 
        `<div class="card placeholder-card"><p>لا توجد تقييمات ${typeName}.</p></div>`;
    } catch (err) {
      console.error(`❌ Error in clearFeedback:`, err); // لوج جديد
      console.error("خطأ في حذف التقييمات:", err);
    } finally {
      document.getElementById(spinnerId).style.display = "none";
    }
  }
}

async function downloadFeedback(type) {
  const botId = localStorage.getItem("selectedBotId");
  const token = localStorage.getItem("token");
  if (!botId) {
    alert("يرجى اختيار بوت أولاً.");
    return;
  }

  const spinnerId = type === "positive" ? "positiveSpinner" : "negativeSpinner";
  const errorId = type === "positive" ? "positiveError" : "negativeError";
  document.getElementById(spinnerId).style.display = "flex";
  document.getElementById(errorId).style.display = "none";

  try {
    const feedback = await handleApiRequest(`/api/bots/${botId}/feedback?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, document.getElementById(errorId), "فشل في جلب التقييمات للتنزيل");

    if (feedback.length === 0) {
      alert(`لا توجد تقييمات ${type === "positive" ? "إيجابية" : "سلبية"} للتنزيل.`);
      return;
    }

    // Generate CSV content
    const csvHeader = "\ufeffالمستخدم,رسالة المستخدم,رد البوت,التقييم,التاريخ\n";
    const csvRows = feedback.map(item => {
      const user = escapeCsvField(item.username || item.userId || "غير معروف");
      const userMessage = escapeCsvField(item.userMessage || "غير معروف");
      const message = escapeCsvField(item.messageContent || "غير متوفر");
      const rating = type === "positive" ? "إيجابي" : "سلبي";
      const date = new Date(item.timestamp).toLocaleString("ar-EG");
      return `${user},${userMessage},${message},${rating},${date}`;
    });
    const csvContent = csvHeader + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = `تقييمات_${type === "positive" ? "إيجابية" : "سلبية"}_${botId}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("خطأ في تنزيل التقييمات:", err);
  } finally {
    document.getElementById(spinnerId).style.display = "none";
  }
}

// دوال لمعالجة تعديل ردود البوت
function handleEditRuleClick(event) {
  const button = event.currentTarget;
  const feedbackId = button.dataset.feedbackId;
  const answer = button.dataset.answer;
  const editArea = document.getElementById(`edit-area-${feedbackId}`);
  const textarea = editArea.querySelector(".edit-textarea");

  button.closest(".message-actions").style.display = "none";
  editArea.style.display = "block";
  textarea.value = answer;
  textarea.focus();
}

function handleCancelEditClick(event) {
  const button = event.currentTarget;
  const editArea = button.closest(".edit-area");
  const messageActions = editArea.previousElementSibling;

  editArea.style.display = "none";
  if (messageActions && messageActions.classList.contains("message-actions")) {
    messageActions.style.display = "block";
  }
}

async function handleSaveEditedRuleClick(event) {
  const saveButton = event.currentTarget;
  const editArea = saveButton.closest(".edit-area");
  const textarea = editArea.querySelector(".edit-textarea");
  const messageActions = editArea.previousElementSibling;
  const editButton = messageActions ? messageActions.querySelector(".edit-rule-btn") : null;

  if (!editButton) {
    alert("خطأ: لم يتم العثور على زر التعديل الأصلي.");
    return;
  }

  const question = editButton.dataset.question;
  const editedAnswer = textarea.value.trim();
  const botId = localStorage.getItem("selectedBotId");
  const token = localStorage.getItem("token");

  if (!question || !editedAnswer) {
    alert("خطأ: السؤال أو الجواب المعدل فارغ.");
    return;
  }

  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار الحفظ...';
  const cancelButton = editArea.querySelector(".cancel-edit-btn");
  if (cancelButton) cancelButton.disabled = true;

  try {
    await handleApiRequest("/api/rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        botId: botId,
        type: "qa",
        content: { question: question, answer: editedAnswer },
        channel: "web" // افتراضي، ممكن تعدل حسب القناة
      }),
    }, document.getElementById("positiveError"), "فشل حفظ القاعدة");
    alert("تم حفظ القاعدة الجديدة بنجاح!");
    editArea.style.display = "none";
    if (messageActions) messageActions.style.display = "block";
  } catch (err) {
    console.error("خطأ في حفظ القاعدة:", err);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = '<i class="fas fa-save"></i> حفظ كقاعدة جديدة';
    if (cancelButton) cancelButton.disabled = false;
  }
}

// Helper function to escape CSV fields containing commas or quotes
function escapeCsvField(field) {
  if (typeof field !== "string") {
    field = String(field);
  }
  if (field.includes(",") || field.includes("\"") || field.includes("\n")) {
    return `"${field.replace(/"/g, "\"\"")}"`;
  }
  return field;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/\n/g, "<br>");
}

// Make functions globally accessible
window.loadFeedbackPage = loadFeedbackPage;
window.deleteFeedback = deleteFeedback;
window.clearFeedback = clearFeedback;
window.downloadFeedback = downloadFeedback;
