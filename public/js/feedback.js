// public/js/feedback.js (Updated for new dashboard design)

async function loadFeedbackPage() {
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
                <button onclick="downloadFeedback(\'positive\')" class="btn btn-secondary btn-sm" title="تنزيل CSV"><i class="fas fa-download"></i></button>
                <button onclick="clearFeedback(\'positive\')" class="btn btn-danger btn-sm" title="حذف الكل"><i class="fas fa-trash-alt"></i></button>
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
                <button onclick="downloadFeedback(\'negative\')" class="btn btn-secondary btn-sm" title="تنزيل CSV"><i class="fas fa-download"></i></button>
                <button onclick="clearFeedback(\'negative\')" class="btn btn-danger btn-sm" title="حذف الكل"><i class="fas fa-trash-alt"></i></button>
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
    return;
  }

  positiveSpinner.style.display = "flex";
  negativeSpinner.style.display = "flex";
  positiveError.style.display = "none";
  negativeError.style.display = "none";
  positiveList.innerHTML = "";
  negativeList.innerHTML = "";

  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
      logoutUser(); // Assumes logoutUser is globally available
      return;
    }

    const feedbackData = await res.json();

    if (!res.ok) {
      throw new Error(feedbackData.message || "فشل في جلب التقييمات");
    }

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

  } catch (err) {
    console.error("❌ Error loading feedback:", err);
    positiveError.textContent = `تعذر تحميل التقييمات الإيجابية: ${err.message}`;
    negativeError.textContent = `تعذر تحميل التقييمات السلبية: ${err.message}`;
    positiveError.style.display = "block";
    negativeError.style.display = "block";
  } finally {
    positiveSpinner.style.display = "none";
    negativeSpinner.style.display = "none";
  }
}

function createFeedbackCard(item, botId) {
  const card = document.createElement("div");
  card.className = "card feedback-card";
  card.innerHTML = `
    <div class="card-body">
        <p><strong><i class="fas fa-user"></i> المستخدم:</strong> ${escapeHtml(item.username || item.userId || "غير معروف")}</p>
        <p><strong><i class="fas fa-robot"></i> رد البوت:</strong> ${escapeHtml(item.messageContent || "غير متوفر")}</p>
        <p><strong><i class="fas fa-clock"></i> التاريخ:</strong> ${new Date(item.timestamp).toLocaleString("ar-EG")}</p>
    </div>
    <div class="card-footer">
        <button class="btn-icon btn-delete" onclick="deleteFeedback(\'${item._id}\', \'${botId}\')" title="حذف التقييم">
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
    // Find the card and show a local spinner/disabled state if desired
    // For simplicity, we rely on the main list spinners during reload
    try {
      const res = await fetch(`/api/bots/${botId}/feedback/${feedbackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
        logoutUser();
        return;
      }

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "فشل في حذف التقييم");
      }

      alert("تم حذف التقييم بنجاح");
      await loadFeedback(botId, token); // Reload feedback list
    } catch (err) {
      console.error("❌ Error deleting feedback:", err);
      alert(`فشل حذف التقييم: ${err.message}`);
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
      const res = await fetch(`/api/bots/${botId}/feedback/clear/${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
        logoutUser();
        return;
      }

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || `فشل في حذف التقييمات ${typeName}`);
      }

      alert(`تم حذف التقييمات ${typeName} بنجاح`);
      document.getElementById(listId).innerHTML = 
`<div class="card placeholder-card"><p>لا توجد تقييمات ${typeName}.</p></div>`; // Update list immediately

    } catch (err) {
      console.error(`❌ Error clearing ${type} feedback:`, err);
      const errorEl = document.getElementById(errorId);
      errorEl.textContent = `فشل حذف التقييمات: ${err.message}`;
      errorEl.style.display = "block";
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
  document.getElementById(spinnerId).style.display = "flex"; // Show spinner during fetch
  document.getElementById(errorId).style.display = "none";

  try {
    const res = await fetch(`/api/bots/${botId}/feedback?type=${type}`, { // Fetch only specific type
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      alert("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى.");
      logoutUser();
      return;
    }

    const feedback = await res.json();

    if (!res.ok) {
      throw new Error(feedback.message || "فشل في جلب التقييمات للتنزيل");
    }

    if (feedback.length === 0) {
      alert(`لا توجد تقييمات ${type === "positive" ? "إيجابية" : "سلبية"} للتنزيل.`);
      return;
    }

    // Generate CSV content
    const csvHeader = "\ufeffالمستخدم,رد البوت,التقييم,التاريخ\n"; // UTF-8 BOM for Excel
    const csvRows = feedback.map(item => {
        const user = escapeCsvField(item.username || item.userId || "غير معروف");
        const message = escapeCsvField(item.messageContent || "غير متوفر");
        const rating = type === "positive" ? "إيجابي" : "سلبي";
        const date = new Date(item.timestamp).toLocaleString("ar-EG");
        return `${user},${message},${rating},${date}`;
    });
    const csvContent = csvHeader + csvRows.join("\n");

    // Create and trigger download link
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
    console.error(`❌ Error downloading ${type} feedback:`, err);
    const errorEl = document.getElementById(errorId);
    errorEl.textContent = `فشل تنزيل التقييمات: ${err.message}`;
    errorEl.style.display = "block";
  } finally {
      document.getElementById(spinnerId).style.display = "none"; // Hide spinner
  }
}

// Helper function to escape CSV fields containing commas or quotes
function escapeCsvField(field) {
    if (typeof field !== "string") {
        field = String(field);
    }
    // If the field contains a comma, double quote, or newline, enclose it in double quotes
    if (field.includes(",") || field.includes("\"") || field.includes("\n")) {
        // Escape existing double quotes by doubling them
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
         .replace(/
/g, "<br>"); // Replace newlines with <br> for display
 }

// Make functions globally accessible
window.loadFeedbackPage = loadFeedbackPage;
window.deleteFeedback = deleteFeedback;
window.clearFeedback = clearFeedback;
window.downloadFeedback = downloadFeedback;

