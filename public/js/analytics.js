// public/js/analytics.js (Updated for new dashboard design)

async function loadAnalyticsPage() {
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض التحليلات.</p>
      </div>
    `;
    return;
  }

  if (!token) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض التحليلات.</p>
        </div>
      `;
      // Optionally redirect to login: window.location.href = 
/login.html
;
      return;
  }

  // Main structure for the analytics page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-chart-line"></i> تحليلات البوت</h2>
      <div class="header-actions filter-group">
        <label for="analyticsStartDate">من:</label>
        <input type="date" id="analyticsStartDate" class="form-control form-control-sm">
        <label for="analyticsEndDate">إلى:</label>
        <input type="date" id="analyticsEndDate" class="form-control form-control-sm">
        <button id="applyAnalyticsFilterBtn" class="btn btn-secondary btn-sm"><i class="fas fa-filter"></i> تطبيق</button>
        <button id="resetAnalyticsFilterBtn" class="btn btn-outline-secondary btn-sm"><i class="fas fa-undo"></i> إعادة تعيين</button>
      </div>
    </div>

    <div id="analyticsLoadingSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
    <div id="analyticsErrorMessage" class="error-message" style="display: none;"></div>

    <div class="analytics-grid">
      <div class="card analytics-card" id="totalMessagesCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-envelope"></i> إجمالي الرسائل</h3>
          <p class="card-value" id="totalMessagesValue">-</p>
        </div>
      </div>
      <div class="card analytics-card" id="totalConversationsCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-comments"></i> إجمالي المحادثات</h3>
          <p class="card-value" id="totalConversationsValue">-</p>
        </div>
      </div>
      <div class="card analytics-card" id="avgMessagesPerConvCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-calculator"></i> متوسط الرسائل/محادثة</h3>
          <p class="card-value" id="avgMessagesPerConvValue">-</p>
        </div>
      </div>
      <div class="card analytics-card" id="positiveFeedbackCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-thumbs-up"></i> التقييمات الإيجابية</h3>
          <p class="card-value" id="positiveFeedbackValue">-</p>
        </div>
      </div>
      <div class="card analytics-card" id="negativeFeedbackCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-thumbs-down"></i> التقييمات السلبية</h3>
          <p class="card-value" id="negativeFeedbackValue">-</p>
        </div>
      </div>
       <div class="card analytics-card" id="uniqueUsersCard">
        <div class="card-body">
          <h3 class="card-title"><i class="fas fa-users"></i> المستخدمون الفريدون</h3>
          <p class="card-value" id="uniqueUsersValue">-</p>
        </div>
      </div>
    </div>

    <div class="charts-container">
        <div class="card chart-card">
            <div class="card-header"><h4><i class="fas fa-chart-bar"></i> الرسائل حسب القناة</h4></div>
            <div class="card-body">
                <canvas id="messagesByChannelChart"></canvas>
            </div>
        </div>
        <div class="card chart-card">
            <div class="card-header"><h4><i class="fas fa-chart-pie"></i> توزيع التقييمات</h4></div>
            <div class="card-body">
                <canvas id="feedbackDistributionChart"></canvas>
            </div>
        </div>
        <div class="card chart-card full-width-chart">
            <div class="card-header"><h4><i class="fas fa-chart-line"></i> الرسائل عبر الوقت</h4></div>
            <div class="card-body">
                <canvas id="messagesOverTimeChart"></canvas>
            </div>
        </div>
    </div>
  `;

  // --- Element References ---
  const loadingSpinner = document.getElementById("analyticsLoadingSpinner");
  const errorMessage = document.getElementById("analyticsErrorMessage");
  const startDateInput = document.getElementById("analyticsStartDate");
  const endDateInput = document.getElementById("analyticsEndDate");
  const applyFilterBtn = document.getElementById("applyAnalyticsFilterBtn");
  const resetFilterBtn = document.getElementById("resetAnalyticsFilterBtn");

  // Card Value Elements
  const totalMessagesValue = document.getElementById("totalMessagesValue");
  const totalConversationsValue = document.getElementById("totalConversationsValue");
  const avgMessagesPerConvValue = document.getElementById("avgMessagesPerConvValue");
  const positiveFeedbackValue = document.getElementById("positiveFeedbackValue");
  const negativeFeedbackValue = document.getElementById("negativeFeedbackValue");
  const uniqueUsersValue = document.getElementById("uniqueUsersValue");

  // Chart Contexts
  const messagesByChannelCtx = document.getElementById("messagesByChannelChart").getContext("2d");
  const feedbackDistributionCtx = document.getElementById("feedbackDistributionChart").getContext("2d");
  const messagesOverTimeCtx = document.getElementById("messagesOverTimeChart").getContext("2d");

  let messagesByChannelChartInstance = null;
  let feedbackDistributionChartInstance = null;
  let messagesOverTimeChartInstance = null;

  // --- Functions ---

  function showLoading() {
    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";
    // Optionally hide cards/charts while loading
  }

  function showError(message) {
    loadingSpinner.style.display = "none";
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }

  function showContent() {
    loadingSpinner.style.display = "none";
    errorMessage.style.display = "none";
  }

  async function fetchAnalyticsData(botId, startDate, endDate) {
    showLoading();
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/analytics/${botId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) throw new Error("جلسة غير صالحة");
      if (!response.ok) throw new Error("فشل جلب بيانات التحليلات");

      const data = await response.json();
      updateAnalyticsUI(data);
      showContent();
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      showError(err.message || "حدث خطأ أثناء جلب التحليلات.");
      if (err.message === "جلسة غير صالحة") logoutUser();
    }
  }

  function updateAnalyticsUI(data) {
    // Update KPI Cards
    totalMessagesValue.textContent = data.totalMessages?.toLocaleString("ar-EG") || "0";
    totalConversationsValue.textContent = data.totalConversations?.toLocaleString("ar-EG") || "0";
    avgMessagesPerConvValue.textContent = data.averageMessagesPerConversation?.toFixed(1).toLocaleString("ar-EG") || "0.0";
    positiveFeedbackValue.textContent = data.positiveFeedbackCount?.toLocaleString("ar-EG") || "0";
    negativeFeedbackValue.textContent = data.negativeFeedbackCount?.toLocaleString("ar-EG") || "0";
    uniqueUsersValue.textContent = data.uniqueUsersCount?.toLocaleString("ar-EG") || "0";

    // Destroy previous charts if they exist
    if (messagesByChannelChartInstance) messagesByChannelChartInstance.destroy();
    if (feedbackDistributionChartInstance) feedbackDistributionChartInstance.destroy();
    if (messagesOverTimeChartInstance) messagesOverTimeChartInstance.destroy();

    // Update Charts
    // 1. Messages by Channel Chart (Bar)
    const channelLabels = data.messagesByChannel?.map(item => item.channel) || [];
    const channelCounts = data.messagesByChannel?.map(item => item.count) || [];
    messagesByChannelChartInstance = new Chart(messagesByChannelCtx, {
      type: "bar",
      data: {
        labels: channelLabels.map(label => {
            switch(label) {
                case "facebook": return "فيسبوك";
                case "web": return "ويب";
                case "whatsapp": return "واتساب";
                default: return label;
            }
        }),
        datasets: [{
          label: "عدد الرسائل",
          data: channelCounts,
          backgroundColor: ["#3b5998", "#00C4B4", "#25D366"], // FB blue, Turquoise, WhatsApp green
          borderColor: ["#3b5998", "#00C4B4", "#25D366"],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-color") || "#333" }
          },
          x: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-color") || "#333" }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    // 2. Feedback Distribution Chart (Pie/Doughnut)
    const feedbackCounts = [data.positiveFeedbackCount || 0, data.negativeFeedbackCount || 0];
    feedbackDistributionChartInstance = new Chart(feedbackDistributionCtx, {
      type: "doughnut",
      data: {
        labels: ["إيجابي", "سلبي"],
        datasets: [{
          label: "توزيع التقييمات",
          data: feedbackCounts,
          backgroundColor: ["#28a745", "#dc3545"], // Green, Red
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-color") || "#333" }
          }
        }
      }
    });

    // 3. Messages Over Time Chart (Line)
    const timeLabels = data.messagesOverTime?.map(item => new Date(item.date).toLocaleDateString("ar-EG")) || [];
    const timeCounts = data.messagesOverTime?.map(item => item.count) || [];
    messagesOverTimeChartInstance = new Chart(messagesOverTimeCtx, {
      type: "line",
      data: {
        labels: timeLabels,
        datasets: [{
          label: "عدد الرسائل",
          data: timeCounts,
          fill: true,
          borderColor: "#00C4B4", // Turquoise
          backgroundColor: "rgba(0, 196, 180, 0.2)", // Lighter Turquoise fill
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-color") || "#333" }
          },
          x: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-color") || "#333" }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // --- Event Listeners Setup ---
  applyFilterBtn.addEventListener("click", () => {
    fetchAnalyticsData(selectedBotId, startDateInput.value, endDateInput.value);
  });

  resetFilterBtn.addEventListener("click", () => {
    startDateInput.value = "";
    endDateInput.value = "";
    fetchAnalyticsData(selectedBotId, null, null);
  });

  // --- Initial Load ---
  // Set default date range (e.g., last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  startDateInput.valueAsDate = thirtyDaysAgo;
  endDateInput.valueAsDate = today;

  await fetchAnalyticsData(selectedBotId, startDateInput.value, endDateInput.value);
}

// Make loadAnalyticsPage globally accessible
window.loadAnalyticsPage = loadAnalyticsPage;

