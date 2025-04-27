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

    content.innerHTML = `
      <h2>التحليلات</h2>
      <div class="analytics-container">
        <div class="spinner">
          <div class="loader"></div>
        </div>
        <div id="analyticsContent" style="display: none;">
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
          <div id="messagesAnalytics">
            <h3>إحصائيات الرسائل</h3>
            <div id="messagesByChannel">
              <h4>توزيع الرسائل حسب القناة</h4>
              <div id="messagesByChannelChart" class="ct-chart"></div>
            </div>
            <div id="dailyMessages">
              <h4>معدل الرسائل يوميًا</h4>
              <div id="dailyMessagesChart" class="ct-chart"></div>
            </div>
          </div>
          <div id="feedbackAnalytics">
            <h3>إحصائيات التقييمات</h3>
            <div id="feedbackRatio">
              <h4>نسبة التقييمات الإيجابية مقابل السلبية</h4>
              <div id="feedbackRatioChart" class="ct-chart"></div>
            </div>
            <div id="topNegativeReplies">
              <h4>أكثر الردود السلبية</h4>
              <ul id="negativeRepliesList"></ul>
            </div>
          </div>
        </div>
      </div>
    `;

    const analyticsContent = document.getElementById('analyticsContent');
    const spinner = document.querySelector('.spinner');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    // إخفاء السبينر وإظهار المحتوى
    spinner.style.display = 'none';
    analyticsContent.style.display = 'block';

    // جلب البيانات وعرضها
    await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);

    // إعادة جلب البيانات عند تطبيق الفلتر
    applyFilterBtn.addEventListener('click', async () => {
      await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    });

    async function loadMessagesAnalytics(botId, token, startDate, endDate) {
      try {
        // 1. عدد الرسائل حسب القناة
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
          total: messagesByChannelData.facebook + messagesByChannelData.web + messagesByChannelData.whatsapp,
          showLabel: true
        });

        // 2. معدل الرسائل يوميًا
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

        // رسم Pie Chart لنسبة التقييمات
        new Chartist.Pie('#feedbackRatioChart', {
          series: [positiveCount, negativeCount],
          labels: ['إيجابية', 'سلبية']
        }, {
          donut: true,
          donutWidth: 60,
          startAngle: 270,
          total: positiveCount + negativeCount,
          showLabel: true
        });

        // 2. أكثر الردود السلبية
        const negativeRepliesResponse = await fetch(`/api/feedback/negative-replies/${botId}?${feedbackQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!negativeRepliesResponse.ok) {
          throw new Error('فشل في جلب الردود السلبية');
        }

        const negativeRepliesData = await negativeRepliesResponse.json();
        const negativeRepliesList = document.getElementById('negativeRepliesList');
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

      } catch (err) {
        console.error('خطأ في تحميل إحصائيات التقييمات:', err);
        document.getElementById('feedbackAnalytics').innerHTML += `
          <p style="color: red; text-align: center;">تعذر تحميل إحصائيات التقييمات، حاول مرة أخرى لاحقًا.</p>
        `;
      }
    }
  }

  window.loadAnalyticsPage = loadAnalyticsPage;
});
