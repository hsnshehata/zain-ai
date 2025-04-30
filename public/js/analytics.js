// public/js/analytics.js (Updated for new dashboard design)

document.addEventListener("DOMContentLoaded", () => {
  // Ensure Chartist is loaded before trying to use it
  if (typeof Chartist === "undefined") {
    console.error("Chartist library not found. Analytics charts cannot be rendered.");
    // Optionally load it dynamically or ensure it's included in dashboard_new.html
    // For now, we'll just prevent errors
    window.Chartist = { Pie: () => {}, Line: () => {} }; // Dummy object
  }

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
          <label for="startDateFilter">من:</label>
          <input type="date" id="startDateFilter" class="form-control form-control-sm">
          <label for="endDateFilter">إلى:</label>
          <input type="date" id="endDateFilter" class="form-control form-control-sm">
          <button id="applyFilterBtn" class="btn btn-secondary btn-sm"><i class="fas fa-filter"></i> تطبيق</button>
          <button id="resetFilterBtn" class="btn btn-outline-secondary btn-sm"><i class="fas fa-undo"></i> إعادة تعيين</button>
        </div>
      </div>

      <div id="analyticsGrid" class="grid-container analytics-grid">
        <!-- Cards will be populated here -->
        <div class="card analytics-card" id="messagesByChannelCard">
          <div class="card-header"><h4><i class="fas fa-comments"></i> الرسائل حسب القناة</h4></div>
          <div class="card-body">
            <div class="chart-spinner spinner"><div class="loader"></div></div>
            <div id="messagesByChannelChart" class="ct-chart ct-perfect-fourth chart-container" style="display: none;"></div>
            <div id="messagesByChannelStats" class="stats-text" style="display: none;"></div>
            <div class="error-message" style="display: none;"></div>
          </div>
        </div>

        <div class="card analytics-card" id="dailyMessagesCard">
          <div class="card-header"><h4><i class="fas fa-calendar-day"></i> الرسائل اليومية</h4></div>
          <div class="card-body">
            <div class="chart-spinner spinner"><div class="loader"></div></div>
            <div id="dailyMessagesChart" class="ct-chart ct-perfect-fourth chart-container" style="display: none;"></div>
            <div id="dailyMessagesStats" class="stats-text" style="display: none;"></div>
            <div class="error-message" style="display: none;"></div>
          </div>
        </div>

        <div class="card analytics-card" id="feedbackRatioCard">
          <div class="card-header"><h4><i class="fas fa-thumbs-up"></i> نسبة التقييمات</h4></div>
          <div class="card-body">
            <div class="chart-spinner spinner"><div class="loader"></div></div>
            <div id="feedbackRatioChart" class="ct-chart ct-perfect-fourth chart-container" style="display: none;"></div>
            <div id="feedbackRatioStats" class="stats-text" style="display: none;"></div>
            <div class="error-message" style="display: none;"></div>
          </div>
        </div>

        <div class="card analytics-card" id="topNegativeRepliesCard">
          <div class="card-header"><h4><i class="fas fa-comment-slash"></i> أكثر الردود سلبية</h4></div>
          <div class="card-body">
            <div class="chart-spinner spinner"><div class="loader"></div></div>
            <ul id="negativeRepliesList" class="simple-list" style="display: none;"></ul>
            <div class="error-message" style="display: none;"></div>
          </div>
        </div>

        <div class="card analytics-card" id="rulesTypeCard">
          <div class="card-header"><h4><i class="fas fa-book-open"></i> أنواع القواعد</h4></div>
          <div class="card-body">
            <div class="chart-spinner spinner"><div class="loader"></div></div>
            <div id="rulesTypeChart" class="ct-chart ct-perfect-fourth chart-container" style="display: none;"></div>
            <div id="rulesTypeStats" class="stats-text" style="display: none;"></div>
            <div class="error-message" style="display: none;"></div>
          </div>
        </div>

      </div>
    `;

    const startDateFilter = document.getElementById("startDateFilter");
    const endDateFilter = document.getElementById("endDateFilter");
    const applyFilterBtn = document.getElementById("applyFilterBtn");
    const resetFilterBtn = document.getElementById("resetFilterBtn");

    // Function to show loading state for a card
    const showLoading = (cardId) => {
        const card = document.getElementById(cardId);
        if (!card) return;
        card.querySelector(".chart-spinner").style.display = "flex";
        const chart = card.querySelector(".ct-chart");
        const stats = card.querySelector(".stats-text, .simple-list");
        const error = card.querySelector(".error-message");
        if (chart) chart.style.display = "none";
        if (stats) stats.style.display = "none";
        if (error) error.style.display = "none";
    };

    // Function to hide loading state and show content/error
    const hideLoading = (cardId, errorMsg = null) => {
        const card = document.getElementById(cardId);
        if (!card) return;
        card.querySelector(".chart-spinner").style.display = "none";
        const chart = card.querySelector(".ct-chart");
        const stats = card.querySelector(".stats-text, .simple-list");
        const error = card.querySelector(".error-message");

        if (errorMsg) {
            if (error) {
                error.textContent = errorMsg;
                error.style.display = "block";
            }
            if (chart) chart.style.display = "none";
            if (stats) stats.style.display = "none";
        } else {
            if (error) error.style.display = "none";
            if (chart) chart.style.display = "block";
            if (stats) stats.style.display = "block";
        }
    };

    // --- Data Loading Functions ---

    async function loadMessagesAnalytics(botId, token, startDate, endDate) {
      // 1. Messages by Channel
      const cardId1 = "messagesByChannelCard";
      showLoading(cardId1);
      try {
        const channels = ["facebook", "web", "whatsapp"];
        const messagesByChannelData = { facebook: 0, web: 0, whatsapp: 0 };
        let totalMessages = 0;

        // Fetch counts concurrently
        const promises = channels.map(async (channel) => {
            const query = new URLSearchParams({ type: channel, countOnly: "true" }); // Assuming API supports countOnly
            if (startDate) query.set("startDate", startDate);
            if (endDate) query.set("endDate", endDate);
            const response = await fetch(`/api/messages/${botId}?${query}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`فشل جلب عدد رسائل ${channel}`);
            const data = await response.json();
            return { channel, count: data.count || 0 }; // Adjust based on actual API response
        });

        const results = await Promise.all(promises);
        results.forEach(result => {
            messagesByChannelData[result.channel] = result.count;
            totalMessages += result.count;
        });

        const chartData = {
          series: channels.map(ch => messagesByChannelData[ch]),
          labels: channels.map(ch => ch.charAt(0).toUpperCase() + ch.slice(1)) // Capitalize labels
        };

        if (totalMessages > 0) {
            new Chartist.Pie(`#${cardId1} .ct-chart`, chartData, {
              donut: true,
              donutWidth: 40,
              startAngle: 270,
              total: totalMessages,
              showLabel: true,
              labelInterpolationFnc: function(value, idx) {
                const percentage = Math.round(value / totalMessages * 100) + '%';
                return chartData.labels[idx] + ": " + percentage; // Show label and percentage
              }
            });
        } else {
             document.querySelector(`#${cardId1} .ct-chart`).innerHTML = 
`<div class="chart-placeholder">لا توجد بيانات لعرضها</div>`;
        }

        document.getElementById("messagesByChannelStats").innerHTML = `
          <p><strong>الإجمالي:</strong> ${totalMessages}</p>
          <p>فيسبوك: ${messagesByChannelData.facebook}</p>
          <p>ويب: ${messagesByChannelData.web}</p>
          <p>واتساب: ${messagesByChannelData.whatsapp}</p>
        `;
        hideLoading(cardId1);
      } catch (err) {
        console.error("خطأ تحميل رسائل القنوات:", err);
        hideLoading(cardId1, err.message || "تعذر تحميل بيانات رسائل القنوات.");
      }

      // 2. Daily Messages
      const cardId2 = "dailyMessagesCard";
      showLoading(cardId2);
      try {
        const dailyQuery = new URLSearchParams();
        if (startDate) dailyQuery.set("startDate", startDate);
        if (endDate) dailyQuery.set("endDate", endDate);

        const dailyResponse = await fetch(`/api/messages/daily/${botId}?${dailyQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!dailyResponse.ok) throw new Error("فشل جلب معدل الرسائل يوميًا");

        const dailyData = await dailyResponse.json();
        const labels = dailyData.map(item => new Date(item.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }));
        const series = [dailyData.map(item => item.count)]; // Chartist expects series as an array of arrays

        if (dailyData.length > 0) {
            new Chartist.Line(`#${cardId2} .ct-chart`, { labels, series }, {
              fullWidth: true,
              chartPadding: { right: 20, left: 10 },
              axisY: { onlyInteger: true },
              low: 0
            });
        } else {
            document.querySelector(`#${cardId2} .ct-chart`).innerHTML = 
`<div class="chart-placeholder">لا توجد بيانات لعرضها</div>`;
        }

        const totalDailyMessages = series[0].reduce((sum, count) => sum + count, 0);
        document.getElementById("dailyMessagesStats").innerHTML = `
          <p><strong>إجمالي الرسائل في الفترة:</strong> ${totalDailyMessages}</p>
        `;
        hideLoading(cardId2);
      } catch (err) {
        console.error("خطأ تحميل الرسائل اليومية:", err);
        hideLoading(cardId2, err.message || "تعذر تحميل بيانات الرسائل اليومية.");
      }
    }

    async function loadFeedbackAnalytics(botId, token, startDate, endDate) {
      // 1. Feedback Ratio
      const cardId1 = "feedbackRatioCard";
      showLoading(cardId1);
      try {
        const feedbackQuery = new URLSearchParams();
        if (startDate) feedbackQuery.set("startDate", startDate);
        if (endDate) feedbackQuery.set("endDate", endDate);

        const feedbackResponse = await fetch(`/api/bots/${botId}/feedback/summary?${feedbackQuery}`, { // Assuming a summary endpoint exists
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!feedbackResponse.ok) throw new Error("فشل في جلب ملخص التقييمات");

        const summary = await feedbackResponse.json();
        const positiveCount = summary.positive || 0;
        const negativeCount = summary.negative || 0;
        const totalFeedback = positiveCount + negativeCount;

        const chartData = {
            series: [positiveCount, negativeCount],
            labels: ["إيجابي", "سلبي"]
        };

        if (totalFeedback > 0) {
            new Chartist.Pie(`#${cardId1} .ct-chart`, chartData, {
              donut: true,
              donutWidth: 40,
              startAngle: 270,
              total: totalFeedback,
              showLabel: true,
              labelInterpolationFnc: function(value, idx) {
                const percentage = Math.round(value / totalFeedback * 100) + '%';
                return chartData.labels[idx] + ": " + percentage;
              }
            });
        } else {
            document.querySelector(`#${cardId1} .ct-chart`).innerHTML = 
`<div class="chart-placeholder">لا توجد بيانات لعرضها</div>`;
        }

        document.getElementById("feedbackRatioStats").innerHTML = `
          <p><strong>إجمالي التقييمات:</strong> ${totalFeedback}</p>
          <p>إيجابية: ${positiveCount}</p>
          <p>سلبية: ${negativeCount}</p>
        `;
        hideLoading(cardId1);
      } catch (err) {
        console.error("خطأ تحميل نسبة التقييمات:", err);
        hideLoading(cardId1, err.message || "تعذر تحميل بيانات نسبة التقييمات.");
      }

      // 2. Top Negative Replies
      const cardId2 = "topNegativeRepliesCard";
      showLoading(cardId2);
      try {
        const negRepliesQuery = new URLSearchParams({ limit: 5 }); // Limit to top 5
        if (startDate) negRepliesQuery.set("startDate", startDate);
        if (endDate) negRepliesQuery.set("endDate", endDate);

        const negativeRepliesResponse = await fetch(`/api/bots/feedback/negative-replies/${botId}?${negRepliesQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!negativeRepliesResponse.ok) throw new Error("فشل في جلب الردود السلبية");

        const negativeRepliesData = await negativeRepliesResponse.json();
        const listElement = document.getElementById("negativeRepliesList");
        listElement.innerHTML = ""; // Clear previous list

        if (negativeRepliesData.length === 0) {
          listElement.innerHTML = "<li>لا توجد ردود سلبية في الفترة المحددة.</li>";
        } else {
          negativeRepliesData.forEach(reply => {
            const li = document.createElement("li");
            li.innerHTML = `"${escapeHtml(reply.messageContent)}" <span class="count-badge">(${reply.count})</span>`;
            listElement.appendChild(li);
          });
        }
        hideLoading(cardId2);
      } catch (err) {
        console.error("خطأ تحميل الردود السلبية:", err);
        hideLoading(cardId2, err.message || "تعذر تحميل بيانات الردود السلبية.");
      }
    }

    async function loadRulesAnalytics(botId, token) {
      // 1. Rules Type Distribution
      const cardId = "rulesTypeCard";
      showLoading(cardId);
      try {
        const rulesResponse = await fetch(`/api/rules/summary/${botId}`, { // Assuming a summary endpoint
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!rulesResponse.ok) throw new Error("فشل في جلب ملخص القواعد");

        const summary = await rulesResponse.json(); // Expects { general: count, global: count, ... }
        const rulesTypesCount = summary.types || {};
        const labels = Object.keys(rulesTypesCount).map(type => getRuleTypeName(type));
        const series = Object.values(rulesTypesCount);
        const totalRules = series.reduce((sum, count) => sum + count, 0);

        const chartData = { labels, series };

        if (totalRules > 0) {
            new Chartist.Pie(`#${cardId} .ct-chart`, chartData, {
              donut: true,
              donutWidth: 40,
              startAngle: 270,
              total: totalRules,
              showLabel: true,
              labelInterpolationFnc: function(value, idx) {
                if (value === 0) return null; // Don't show label for 0 value
                const percentage = Math.round(value / totalRules * 100) + '%';
                return chartData.labels[idx] + ": " + percentage;
              }
            });
        } else {
            document.querySelector(`#${cardId} .ct-chart`).innerHTML = 
`<div class="chart-placeholder">لا توجد قواعد لهذا البوت</div>`;
        }

        let statsHtml = `<p><strong>إجمالي القواعد:</strong> ${totalRules}</p>`;
        Object.entries(rulesTypesCount).forEach(([type, count]) => {
            if (count > 0) {
                statsHtml += `<p>${getRuleTypeName(type)}: ${count}</p>`;
            }
        });
        document.getElementById("rulesTypeStats").innerHTML = statsHtml;
        hideLoading(cardId);
      } catch (err) {
        console.error("خطأ تحميل أنواع القواعد:", err);
        hideLoading(cardId, err.message || "تعذر تحميل بيانات أنواع القواعد.");
      }
    }

    // --- Helper Functions ---
    function getRuleTypeName(type) {
        switch (type) {
            case "general": return "عامة";
            case "products": return "أسعار";
            case "qa": return "سؤال وجواب";
            case "channels": return "قنوات";
            case "global": return "موحدة";
            case "api": return "API"; // Added API type
            default: return type;
        }
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== "string") return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    // --- Initial Load & Event Listeners ---
    const loadAllAnalytics = () => {
        const start = startDateFilter.value;
        const end = endDateFilter.value;
        // Basic validation: end date should not be before start date
        if (start && end && new Date(end) < new Date(start)) {
            alert("تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.");
            return;
        }
        loadMessagesAnalytics(selectedBotId, token, start, end);
        loadFeedbackAnalytics(selectedBotId, token, start, end);
        loadRulesAnalytics(selectedBotId, token); // Rules usually aren't time-bound
    };

    applyFilterBtn.addEventListener("click", loadAllAnalytics);

    resetFilterBtn.addEventListener("click", () => {
        startDateFilter.value = "";
        endDateFilter.value = "";
        loadAllAnalytics();
    });

    // Initial load on page access
    loadAllAnalytics();
  }

  // Make loadAnalyticsPage globally accessible for dashboard_new.js
  window.loadAnalyticsPage = loadAnalyticsPage;
});

