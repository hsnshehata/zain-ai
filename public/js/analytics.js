// /public/js/analytics.js

document.addEventListener('DOMContentLoaded', () => {
  async function loadAnalyticsPage() {
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

    // جلب بيانات المستخدم الحالي عشان نعرف دوره
    let userRole = '';
    try {
      const userResponse = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('بيانات المستخدم:', userData); // Debugging
        userRole = userData.role || '';
      } else {
        console.error('فشل استدعاء /api/users/me، الكود:', userResponse.status);
        throw new Error('فشل في جلب بيانات المستخدم');
      }
    } catch (err) {
      console.error('خطأ في جلب بيانات المستخدم:', err);
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">تعذر جلب بيانات المستخدم، الرجاء تسجيل الدخول مرة أخرى.</p>
      `;
      return;
    }

    // بناء HTML بناءً على دور المستخدم
    let botsAnalyticsSection = '';
    if (userRole === 'superadmin') {
      botsAnalyticsSection = `
        <div id="botsAnalytics">
          <h3>إحصائيات البوتات</h3>
          <div id="botsStatus">
            <h4>البوتات النشطة مقابل غير النشطة</h4>
            <div class="section-spinner">
              <div class="loader"></div>
            </div>
            <div id="botsStatusChart" class="ct-chart" style="display: none;"></div>
            <div id="botsStatusStats" class="stats-text" style="display: none;"></div>
          </div>
          <div id="botsPerUser">
            <h4>توزيع البوتات حسب المستخدمين</h4>
            <div class="section-spinner">
              <div class="loader"></div>
            </div>
            <div id="botsPerUserChart" class="ct-chart ct-bar-chart" style="display: none;"></div>
            <div id="botsPerUserStats" class="stats-text" style="display: none;"></div>
          </div>
        </div>
      `;
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
              <div id="messagesByChannelChart" class="ct-chart" style="display: none;"></div>
              <div id="messagesByChannelStats" class="stats-text" style="display: none;"></div>
            </div>
            <div id="dailyMessages">
              <h4>معدل الرسائل يوميًا</h4>
              <div class="section-spinner">
                <div class="loader"></div>
              </div>
              <div id="dailyMessagesChart" class="ct-chart" style="display: none;"></div>
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
              <div id="feedbackRatioChart" class="ct-chart" style="display: none;"></div>
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
              <div id="rulesTypeChart" class="ct-chart" style="display: none;"></div>
              <div id="rulesTypeStats" class="stats-text" style="display: none;"></div>
            </div>
          </div>
          ${botsAnalyticsSection}
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
    if (userRole === 'superadmin') {
      await loadBotsAnalytics(token);
    }

    // إعادة جلب البيانات عند تطبيق الفلتر
    applyFilterBtn.addEventListener('click', async () => {
      await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadRulesAnalytics(selectedBotId, token);
      if (userRole === 'superadmin') {
        await loadBotsAnalytics(token);
      }
    });

    async function loadMessagesAnalytics(botId, token, startDate, endDate) {
      try {
        // 1. عدد الرسائل حسب القناة
        const messagesByChannelSpinner = document.querySelector('#messagesByChannel .section-spinner');
        const messagesByChannelChart = document.getElementById('messagesByChannelChart');
        const messagesByChannelStats = document.getElementById('messagesByChannelStats');

        const channels = ['facebook', 'web', 'whatsapp'];
        const messagesByChannelData = { facebook: 0, web: 0, whatsapp: 0 };

        for (const channel of channels) {
          const query = new URLSearchParams({
            type: channel,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          });
          const response = await fetch(`/api/messages/${botId}?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error('فشل في جلب الرسائل');
          }

          const conversations = await response.json();
          let messageCount = 0;
          conversations.forEach(conv => {
            messageCount += conv.messages.length;
          });
          messagesByChannelData[channel] = messageCount;
        }

        const totalMessages = messagesByChannelData.facebook + messagesByChannelData.web + messagesByChannelData.whatsapp;

        // رسم Pie Chart لتوزيع الرسائل حسب القناة
        new Chartist.Pie('#messagesByChannelChart', {
          series: [
            messagesByChannelData.facebook,
            messagesByChannelData.web,
            messagesByChannelData.whatsapp
          ],
          labels: ['فيسبوك', 'ويب', 'واتساب']
        }, {
          donut: true,
          donutWidth: 60,
          startAngle: 270,
          total: totalMessages,
          showLabel: true
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
        const dailyMessagesSpinner = document.querySelector('#dailyMessages .section-spinner');
        const dailyMessagesChart = document.getElementById('dailyMessagesChart');
        const dailyMessagesStats = document.getElementById('dailyMessagesStats');

        const dailyQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        const dailyResponse = await fetch(`/api/messages/daily/${botId}?${dailyQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!dailyResponse.ok) {
          throw new Error('فشل في جلب معدل الرسائل يوميًا');
        }

        const dailyData = await dailyResponse.json();
        const labels = dailyData.map(item => item.date);
        const series = dailyData.map(item => item.count);

        // رسم Line Chart لمعدل الرسائل يوميًا
        new Chartist.Line('#dailyMessagesChart', {
          labels: labels,
          series: [series]
        }, {
          fullWidth: true,
          chartPadding: {
            right: 40
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
        console.error('خطأ في تحميل إحصائيات الرسائل:', err);
        document.getElementById('messagesAnalytics').innerHTML += `
          <p style="color: red; text-align: center;">تعذر تحميل إحصائيات الرسائل، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }

    async function loadFeedbackAnalytics(botId, token, startDate, endDate) {
      try {
        // 1. نسبة التقييمات الإيجابية مقابل السلبية
        const feedbackRatioSpinner = document.querySelector('#feedbackRatio .section-spinner');
        const feedbackRatioChart = document.getElementById('feedbackRatioChart');
        const feedbackRatioStats = document.getElementById('feedbackRatioStats');

        const feedbackQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        const feedbackResponse = await fetch(`/api/bots/${botId}/feedback?${feedbackQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!feedbackResponse.ok) {
          throw new Error('فشل في جلب التقييمات');
        }

        const feedbackData = await feedbackResponse.json();
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
        new Chartist.Pie('#feedbackRatioChart', {
          series: [positiveCount, negativeCount],
          labels: ['إيجابية', 'سلبية']
        }, {
          donut: true,
          donutWidth: 60,
          startAngle: 270,
          total: totalFeedback,
          showLabel: true
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
        const negativeRepliesSpinner = document.querySelector('#topNegativeReplies .section-spinner');
        const negativeRepliesList = document.getElementById('negativeRepliesList');

        const negativeRepliesResponse = await fetch(`/api/bots/feedback/negative-replies/${botId}?${feedbackQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!negativeRepliesResponse.ok) {
          throw new Error('فشل في جلب الردود السلبية');
        }

        const negativeRepliesData = await negativeRepliesResponse.json();
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
        console.error('خطأ في تحميل إحصائيات التقييمات:', err);
        document.getElementById('feedbackAnalytics').innerHTML += `
          <p style="color: red; text-align: center;">تعذر تحميل إحصائيات التقييمات، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }

    async function loadRulesAnalytics(botId, token) {
      try {
        // 1. توزيع أنواع القواعد
        const rulesTypeSpinner = document.querySelector('#rulesType .section-spinner');
        const rulesTypeChart = document.getElementById('rulesTypeChart');
        const rulesTypeStats = document.getElementById('rulesTypeStats');

        const rulesQuery = new URLSearchParams({ botId });
        const rulesResponse = await fetch(`/api/rules?${rulesQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!rulesResponse.ok) {
          throw new Error('فشل في جلب القواعد');
        }

        const rulesData = await rulesResponse.json();
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
        new Chartist.Pie('#rulesTypeChart', {
          series: [
            rulesTypesCount.general,
            rulesTypesCount.global,
            rulesTypesCount.products,
            rulesTypesCount.qa,
            rulesTypesCount.api
          ],
          labels: ['عامة', 'موحدة', 'أسعار', 'سؤال وجواب', 'API']
        }, {
          donut: true,
          donutWidth: 60,
          startAngle: 270,
          total: totalRules,
          showLabel: true
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
        console.error('خطأ في تحميل إحصائيات القواعد:', err);
        document.getElementById('rulesAnalytics').innerHTML += `
          <p style="color: red; text-align: center;">تعذر تحميل إحصائيات القواعد، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }

    async function loadBotsAnalytics(token) {
      try {
        // 1. البوتات النشطة مقابل غير النشطة
        const botsStatusSpinner = document.querySelector('#botsStatus .section-spinner');
        const botsStatusChart = document.getElementById('botsStatusChart');
        const botsStatusStats = document.getElementById('botsStatusStats');

        const statusResponse = await fetch(`/api/bots/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!statusResponse.ok) {
          throw new Error('فشل في جلب حالة البوتات');
        }

        const statusData = await statusResponse.json();
        const totalBots = statusData.active + statusData.inactive;
        const activePercentage = totalBots > 0 ? ((statusData.active / totalBots) * 100).toFixed(1) : 0;
        const inactivePercentage = totalBots > 0 ? ((statusData.inactive / totalBots) * 100).toFixed(1) : 0;

        // رسم Pie Chart للبوتات النشطة مقابل غير النشطة
        new Chartist.Pie('#botsStatusChart', {
          series: [statusData.active, statusData.inactive],
          labels: ['نشط', 'غير نشط']
        }, {
          donut: true,
          donutWidth: 60,
          startAngle: 270,
          total: totalBots,
          showLabel: true
        });

        // إضافة الإحصائيات النصية لحالة البوتات
        botsStatusStats.innerHTML = `
          <p>إجمالي البوتات: ${totalBots}</p>
          <p>البوتات النشطة: ${statusData.active} (${activePercentage}%)</p>
          <p>البوتات غير النشطة: ${statusData.inactive} (${inactivePercentage}%)</p>
        `;

        // إخفاء السبينر وإظهار المحتوى
        botsStatusSpinner.style.display = 'none';
        botsStatusChart.style.display = 'block';
        botsStatusStats.style.display = 'block';

        // 2. توزيع البوتات حسب المستخدمين
        const botsPerUserSpinner = document.querySelector('#botsPerUser .section-spinner');
        const botsPerUserChart = document.getElementById('botsPerUserChart');
        const botsPerUserStats = document.getElementById('botsPerUserStats');

        const perUserResponse = await fetch(`/api/bots/per-user`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!perUserResponse.ok) {
          throw new Error('فشل في جلب توزيع البوتات حسب المستخدمين');
        }

        const perUserData = await perUserResponse.json();
        const labels = perUserData.map(item => item.username);
        const series = perUserData.map(item => item.botCount);

        // رسم Bar Chart لتوزيع البوتات حسب المستخدمين
        new Chartist.Bar('#botsPerUserChart', {
          labels: labels,
          series: [series]
        }, {
          axisX: {
            labelInterpolationFnc: value => value.length > 10 ? value.substring(0, 10) + '...' : value // تقصير الأسماء الطويلة
          },
          axisY: {
            onlyInteger: true // التأكد إن القيم صحيحة (عدد البوتات)
          }
        });

        // إضافة الإحصائيات النصية لتوزيع البوتات
        let statsHtml = '<p>توزيع البوتات حسب المستخدمين:</p>';
        perUserData.forEach(item => {
          statsHtml += `<p>${item.username}: ${item.botCount} بوت</p>`;
        });
        botsPerUserStats.innerHTML = statsHtml;

        // إخفاء السبينر وإظهار المحتوى
        botsPerUserSpinner.style.display = 'none';
        botsPerUserChart.style.display = 'block';
        botsPerUserStats.style.display = 'block';

      } catch (err) {
        console.error('خطأ في تحميل إحصائيات البوتات:', err);
        document.getElementById('botsAnalytics').innerHTML += `
          <p style="color: red; text-align: center;">تعذر تحميل إحصائيات البوتات، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }
  }

  window.loadAnalyticsPage = loadAnalyticsPage;
});
