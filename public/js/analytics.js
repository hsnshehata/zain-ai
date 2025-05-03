// public/js/analytics.js (Updated for unified error handling and CSS loading)

document.addEventListener('DOMContentLoaded', () => {
  async function loadAnalyticsPage() {
    // إضافة analytics.css ديناميكيًا
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/analytics.css";
    document.head.appendChild(link);

    const content = document.getElementById('content');
    const token = localStorage.getItem('token');
    const selectedBotId = localStorage.getItem('selectedBotId');

    if (!selectedBotId) {
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
      `;
      return;
    }

    if (!token) {
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">الرجاء تسجيل الدخول لعرض التحليلات.</p>
      `;
      return;
    }

    content.innerHTML = `
      <h2>التحليلات</h2>
      <div class="analytics-container">
        <div class="filter-group">
          <div class="form-group">
            <label>فلترة البيانات حسب الفترة:</label>
            <div class="date-filter">
              <input type="date" id="startDateFilter" placeholder="من تاريخ" />
              <input type="date" id="endDateFilter" placeholder="إلى تاريخ" />
              <button id="applyFilterBtn">تطبيق الفلتر</button>
            </div>
          </div>
        </div>
        <div id="analyticsContent">
          <div id="messagesAnalytics">
            <h3>إحصائيات الرسائل</h3>
            <div id="messagesByChannel">
              <h4>توزيع الرسائل حسب القناة</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <div class="chart-container"><canvas id="messagesByChannelChart" style="display: none;"></canvas></div>
              <div id="messagesByChannelStats" class="stats-text" style="display: none;"></div>
            </div>
            <div id="dailyMessages">
              <h4>معدل الرسائل يوميًا</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <div class="chart-container"><canvas id="dailyMessagesChart" style="display: none;"></canvas></div>
              <div id="dailyMessagesStats" class="stats-text" style="display: none;"></div>
            </div>
          </div>
          <div id="feedbackAnalytics">
            <h3>إحصائيات التقييمات</h3>
            <div id="feedbackRatio">
              <h4>نسبة التقييمات الإيجابية مقابل السلبية</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <div class="chart-container"><canvas id="feedbackRatioChart" style="display: none;"></canvas></div>
              <div id="feedbackRatioStats" class="stats-text" style="display: none;"></div>
            </div>
            <div id="topNegativeReplies">
              <h4>أكثر الردود السلبية</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <ul id="negativeRepliesList" style="display: none;"></ul>
            </div>
          </div>
          <div id="rulesAnalytics">
            <h3>إحصائيات القواعد</h3>
            <div id="rulesType">
              <h4>توزيع أنواع القواعد</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <div class="chart-container"><canvas id="rulesTypeChart" style="display: none;"></canvas></div>
              <div id="rulesTypeStats" class="stats-text" style="display: none;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const analyticsContent = document.getElementById('analyticsContent');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    // جلب البيانات بشكل متتالي (Lazy Loading)
    await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    await loadRulesAnalytics(selectedBotId, token);

    // إعادة جلب البيانات عند تطبيق الفلتر
    applyFilterBtn.addEventListener('click', async () => {
      await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadRulesAnalytics(selectedBotId, token);
    });

    async function loadMessagesAnalytics(botId, token, startDate, endDate) {
      const messagesByChannelSpinner = document.querySelector('#messagesByChannel .section-spinner');
      const messagesByChannelChart = document.getElementById('messagesByChannelChart');
      const messagesByChannelStats = document.getElementById('messagesByChannelStats');
      const dailyMessagesSpinner = document.querySelector('#dailyMessages .section-spinner');
      const dailyMessagesChart = document.getElementById('dailyMessagesChart');
      const dailyMessagesStats = document.getElementById('dailyMessagesStats');

      try {
        // 1. عدد الرسائل حسب القناة
        console.log("بجيب توزيع الرسائل حسب القناة من الـ API...");

        const channels = ['facebook', 'web', 'whatsapp'];
        const messagesByChannelData = { facebook: 0, web: 0, whatsapp: 0 };

        for (const channel of channels) {
          const query = new URLSearchParams({
            type: channel,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          });
          const conversations = await handleApiRequest(`/api/messages/${botId}?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          }, analyticsContent, `فشل في جلب رسائل ${channel}`);

          let messageCount = 0;
          conversations.forEach(conv => {
            messageCount += conv.messages.length;
          });
          messagesByChannelData[channel] = messageCount;
        }

        console.log("توزيع الرسائل حسب القناة جت بنجاح:", messagesByChannelData);

        const totalMessages = messagesByChannelData.facebook + messagesByChannelData.web + messagesByChannelData.whatsapp;

        // رسم Pie Chart لتوزيع الرسائل حسب القناة
        const messagesByChannelCtx = document.getElementById('messagesByChannelChart').getContext('2d');
        new Chart(messagesByChannelCtx, {
          type: 'doughnut',
          data: {
            labels: ['فيسبوك', 'ويب', 'واتساب'],
            datasets: [{
              data: [
                messagesByChannelData.facebook,
                messagesByChannelData.web,
                messagesByChannelData.whatsapp
              ],
              backgroundColor: ['#28a745', '#17a2b8', '#dc3545'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  font: {
                    size: 14,
                    family: 'Cairo'
                  }
                }
              }
            }
          }
        });

        // إضافة الإحصائيات النصية للرسائل
        messagesByChannelStats.innerHTML = `
          <p>إجمالي الرسائل: ${totalMessages}</p>
          <p>رسائل فيسبوك: ${messagesByChannelData.facebook}</p>
          <p>رسائل الويب: ${messagesByChannelData.web}</p>
          <p>رسائل واتساب: ${messagesByChannelData.whatsapp}</p>
        `;

        // إخفاء السبينر وإظهار المحتوى
        messagesByChannelSpinner.style.display = 'none';
        messagesByChannelChart.style.display = 'block';
        messagesByChannelStats.style.display = 'block';

        // 2. معدل الرسائل يوميًا
        console.log("بجيب معدل الرسائل يوميًا من الـ API...");

        const dailyQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        const dailyData = await handleApiRequest(`/api/messages/daily/${botId}?${dailyQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, analyticsContent, 'فشل في جلب معدل الرسائل يوميًا');

        console.log("معدل الرسائل يوميًا جت بنجاح:", dailyData);

        const labels = dailyData.map(item => item.date);
        const series = dailyData.map(item => item.count);

        // رسم Line Chart لمعدل الرسائل يوميًا
        const dailyMessagesCtx = document.getElementById('dailyMessagesChart').getContext('2d');
        new Chart(dailyMessagesCtx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'عدد الرسائل',
              data: series,
              borderColor: '#00C4B4',
              fill: false,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              x: {
                ticks: {
                  font: {
                    family: 'Cairo'
                  }
                }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  font: {
                    family: 'Cairo'
                  }
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  font: {
                    family: 'Cairo'
                  }
                }
              }
            }
          }
        });

        // إضافة الإحصائيات النصية لمعدل الرسائل
        const totalDailyMessages = series.reduce((sum, count) => sum + count, 0);
        dailyMessagesStats.innerHTML = `
          <p>إجمالي الرسائل في الفترة: ${totalDailyMessages}</p>
        `;

        // إخفاء السبينر وإظهار المحتوى
        dailyMessagesSpinner.style.display = 'none';
        dailyMessagesChart.style.display = 'block';
        dailyMessagesStats.style.display = 'block';

      } catch (err) {
        console.error("حصل خطأ في جلب بيانات الرسائل:", err);
        // بنخفي السبينر حتى لو حصل خطأ
        messagesByChannelSpinner.style.display = 'none';
        messagesByChannelStats.innerHTML = '<p style="color: red;">فشل في جلب توزيع الرسائل. حاول تاني لاحقًا.</p>';
        messagesByChannelChart.style.display = 'none';

        dailyMessagesSpinner.style.display = 'none';
        dailyMessagesStats.innerHTML = '<p style="color: red;">فشل في جلب معدل الرسائل يوميًا. حاول تاني لاحقًا.</p>';
        dailyMessagesChart.style.display = 'none';
      }
    }

    async function loadFeedbackAnalytics(botId, token, startDate, endDate) {
      const feedbackRatioSpinner = document.querySelector('#feedbackRatio .section-spinner');
      const feedbackRatioChart = document.getElementById('feedbackRatioChart');
      const feedbackRatioStats = document.getElementById('feedbackRatioStats');
      const negativeRepliesSpinner = document.querySelector('#topNegativeReplies .section-spinner');
      const negativeRepliesList = document.getElementById('negativeRepliesList');

      try {
        // 1. نسبة التقييمات الإيجابية مقابل السلبية
        console.log("بجيب بيانات التقييمات من الـ API...");

        const feedbackQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        const feedbackData = await handleApiRequest(`/api/bots/${botId}/feedback?${feedbackQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, analyticsContent, 'فشل في جلب التقييمات');

        console.log("البيانات جت بنجاح:", feedbackData);

        let positiveCount = 0;
        let negativeCount = 0;

        feedbackData.forEach(feedback => {
          if (feedback.feedback === 'positive') {
            positiveCount++;
          } else if (feedback.feedback === 'negative') {
            negativeCount++;
          }
        });

        const totalFeedback = positiveCount + negativeCount;
        const positivePercentage = totalFeedback > 0 ? ((positiveCount / totalFeedback) * 100).toFixed(1) : 0;
        const negativePercentage = totalFeedback > 0 ? ((negativeCount / totalFeedback) * 100).toFixed(1) : 0;

        // رسم Pie Chart لنسبة التقييمات
        const feedbackRatioCtx = document.getElementById('feedbackRatioChart').getContext('2d');
        new Chart(feedbackRatioCtx, {
          type: 'doughnut',
          data: {
            labels: ['إيجابية', 'سلبية'],
            datasets: [{
              data: [positiveCount, negativeCount],
              backgroundColor: ['#28a745', '#dc3545'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  font: {
                    size: 14,
                    family: 'Cairo'
                  }
                }
              }
            }
          }
        });

        // إضافة الإحصائيات النصية للتقييمات
        feedbackRatioStats.innerHTML = `
          <p>إجمالي التقييمات: ${totalFeedback}</p>
          <p>التقييمات الإيجابية: ${positiveCount} (${positivePercentage}%)</p>
          <p>التقييمات السلبية: ${negativeCount} (${negativePercentage}%)</p>
        `;

        // إخفاء السبينر وإظهار المحتوى
        feedbackRatioSpinner.style.display = 'none';
        feedbackRatioChart.style.display = 'block';
        feedbackRatioStats.style.display = 'block';

        // 2. أكثر الردود السلبية
        console.log("بجيب الردود السلبية من الـ API...");

        const negativeRepliesData = await handleApiRequest(`/api/bots/feedback/negative-replies/${botId}?${feedbackQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, analyticsContent, 'فشل في جلب الردود السلبية');

        console.log("الردود السلبية جت بنجاح:", negativeRepliesData);

        negativeRepliesList.innerHTML = '';

        if (negativeRepliesData.length === 0) {
          negativeRepliesList.innerHTML = '<li>لا توجد ردود سلبية حاليًا.</li>';
        } else {
          negativeRepliesData.slice(0, 3).forEach(reply => {
            const li = document.createElement('li');
            li.textContent = `${reply.messageContent} (عدد التقييمات السلبية: ${reply.count})`;
            negativeRepliesList.appendChild(li);
          });
        }

        // إخفاء السبينر وإظهار المحتوى
        negativeRepliesSpinner.style.display = 'none';
        negativeRepliesList.style.display = 'block';

      } catch (err) {
        console.error("حصل خطأ في جلب بيانات التقييمات:", err);
        // بنخفي السبينر حتى لو حصل خطأ
        feedbackRatioSpinner.style.display = 'none';
        feedbackRatioStats.innerHTML = '<p style="color: red;">فشل في جلب التقييمات. حاول تاني لاحقًا.</p>';
        feedbackRatioChart.style.display = 'none';

        negativeRepliesSpinner.style.display = 'none';
        negativeRepliesList.innerHTML = '<li style="color: red;">فشل في جلب الردود السلبية.</li>';
        negativeRepliesList.style.display = 'block';
      }
    }

    async function loadRulesAnalytics(botId, token) {
      const rulesTypeSpinner = document.querySelector('#rulesType .section-spinner');
      const rulesTypeChart = document.getElementById('rulesTypeChart');
      const rulesTypeStats = document.getElementById('rulesTypeStats');

      try {
        // 1. توزيع أنواع القواعد
        console.log("بجيب توزيع أنواع القواعد من الـ API...");

        const rulesQuery = new URLSearchParams({ botId });
        const rulesData = await handleApiRequest(`/api/rules?${rulesQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, analyticsContent, 'فشل في جلب القواعد');

        console.log("توزيع أنواع القواعد جت بنجاح:", rulesData);

        const rulesTypesCount = {
          general: 0,
          global: 0,
          products: 0,
          qa: 0,
          api: 0
        };

        rulesData.rules.forEach(rule => {
          if (rulesTypesCount[rule.type] !== undefined) {
            rulesTypesCount[rule.type]++;
          }
        });

        const totalRules = Object.values(rulesTypesCount).reduce((sum, count) => sum + count, 0);
        const generalPercentage = totalRules > 0 ? ((rulesTypesCount.general / totalRules) * 100).toFixed(1) : 0;
        const globalPercentage = totalRules > 0 ? ((rulesTypesCount.global / totalRules) * 100).toFixed(1) : 0;
        const productsPercentage = totalRules > 0 ? ((rulesTypesCount.products / totalRules) * 100).toFixed(1) : 0;
        const qaPercentage = totalRules > 0 ? ((rulesTypesCount.qa / totalRules) * 100).toFixed(1) : 0;
        const apiPercentage = totalRules > 0 ? ((rulesTypesCount.api / totalRules) * 100).toFixed(1) : 0;

        // رسم Pie Chart لتوزيع أنواع القواعد
        const rulesTypeCtx = document.getElementById('rulesTypeChart').getContext('2d');
        new Chart(rulesTypeCtx, {
          type: 'doughnut',
          data: {
            labels: ['عامة', 'موحدة', 'أسعار', 'سؤال وجواب', 'API'],
            datasets: [{
              data: [
                rulesTypesCount.general,
                rulesTypesCount.global,
                rulesTypesCount.products,
                rulesTypesCount.qa,
                rulesTypesCount.api
              ],
              backgroundColor: ['#28a745', '#dc3545', '#17a2b8', '#ffc107', '#6c757d'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  font: {
                    size: 14,
                    family: 'Cairo'
                  }
                }
              }
            }
          }
        });

        // إضافة الإحصائيات النصية لتوزيع أنواع القواعد
        rulesTypeStats.innerHTML = `
          <p>إجمالي القواعد: ${totalRules}</p>
          <p>قواعد عامة: ${rulesTypesCount.general} (${generalPercentage}%)</p>
          <p>قواعد موحدة: ${rulesTypesCount.global} (${globalPercentage}%)</p>
          <p>قواعد أسعار: ${rulesTypesCount.products} (${productsPercentage}%)</p>
          <p>قواعد سؤال وجواب: ${rulesTypesCount.qa} (${qaPercentage}%)</p>
          <p>قواعد API: ${rulesTypesCount.api} (${apiPercentage}%)</p>
        `;

        // إخفاء السبينر وإظهار المحتوى
        rulesTypeSpinner.style.display = 'none';
        rulesTypeChart.style.display = 'block';
        rulesTypeStats.style.display = 'block';

      } catch (err) {
        console.error("حصل خطأ في جلب بيانات القواعد:", err);
        // بنخفي السبينر حتى لو حصل خطأ
        rulesTypeSpinner.style.display = 'none';
        rulesTypeStats.innerHTML = '<p style="color: red;">فشل في جلب توزيع القواعد. حاول تاني لاحقًا.</p>';
        rulesTypeChart.style.display = 'none';
      }
    }
  }

  window.loadAnalyticsPage = loadAnalyticsPage;
});
