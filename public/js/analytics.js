async function loadAnalyticsPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const selectedBotId = localStorage.getItem('selectedBotId');

  if (!selectedBotId) {
    content.innerHTML = `
      <h2>إحصائيات البوتات</h2>
      <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
    `;
    return;
  }

  // الواجهة الجديدة
  content.innerHTML = `
    <h2>إحصائيات البوتات</h2>
    <div class="analytics-container">
      <div class="spinner"><div class="loader"></div></div>
      <div id="analyticsContent" style="display: none;">
        <!-- فلاتر زمنية -->
        <div class="filter-group">
          <label>فلترة حسب الفترة:</label>
          <div class="date-filter">
            <select id="timePeriodFilter">
              <option value="all" selected>طوال فترة الاستخدام</option>
              <option value="day">يوم</option>
              <option value="week">أسبوع</option>
              <option value="month">شهر</option>
              <option value="custom">تخصيص</option>
            </select>
            <div id="customDateRange" style="display: none;">
              <input type="date" id="startDateFilter" placeholder="من تاريخ" />
              <input type="date" id="endDateFilter" placeholder="إلى تاريخ" />
            </div>
            <button id="applyFilterBtn">تطبيق الفلتر</button>
          </div>
        </div>
        <!-- إحصائيات الرسائل -->
        <div id="messagesAnalytics">
          <h3>إحصائيات الرسائل</h3>
          <p id="totalMessages">إجمالي الرسائل: جاري التحميل...</p>
          <p id="facebookMessages">رسائل الفيسبوك: جاري التحميل...</p>
          <p id="webMessages">رسائل الويب: جاري التحميل...</p>
          <p id="whatsappMessages">رسائل الواتساب: جاري التحميل...</p>
          <canvas id="messagesTypeChart" width="300" height="150"></canvas>
          <canvas id="messagesDailyChart" width="300" height="150"></canvas>
        </div>
        <!-- إحصائيات القواعد -->
        <div id="rulesAnalytics">
          <h3>إحصائيات القواعد</h3>
          <p id="activeRules">عدد القواعد النشطة: جاري التحميل...</p>
          <p id="generalRules">قواعد عامة: جاري التحميل...</p>
          <p id="qaRules">قواعد سؤال وجواب: جاري التحميل...</p>
          <p id="productsRules">قواعد المنتجات: جاري التحميل...</p>
          <p id="apiRules">قواعد API: جاري التحميل...</p>
          ${role === 'superadmin' ? '<p id="globalRules">قواعد موحدة: جاري التحميل...</p>' : ''}
        </div>
        <!-- إحصائيات التقييمات -->
        <div id="feedbackAnalytics">
          <h3>إحصائيات التقييمات</h3>
          <p id="totalFeedback">إجمالي التقييمات: جاري التحميل...</p>
          <p id="positiveFeedback">التقييمات الإيجابية: جاري التحميل...</p>
          <p id="negativeFeedback">التقييمات السلبية: جاري التحميل...</p>
          <div id="topNegativeReplies" style="margin-top: 20px;">
            <h4>أكثر ردود البوت تقييمًا سلبيًا:</h4>
            <ul id="negativeRepliesList"></ul>
          </div>
          <canvas id="feedbackChart" width="300" height="150"></canvas>
        </div>
        <!-- إحصائيات التفاعل -->
        <div id="interactionAnalytics">
          <h3>إحصائيات التفاعل</h3>
          <p id="peakHours">أوقات الذروة: جاري التحميل...</p>
        </div>
      </div>
    </div>
  `;

  const analyticsContent = document.getElementById('analyticsContent');
  const spinner = document.querySelector('.spinner');
  const timePeriodFilter = document.getElementById('timePeriodFilter');
  const customDateRange = document.getElementById('customDateRange');
  const startDateFilter = document.getElementById('startDateFilter');
  const endDateFilter = document.getElementById('endDateFilter');
  const applyFilterBtn = document.getElementById('applyFilterBtn');

  // متغيرات لتخزين الرسوم البيانية
  let messagesTypeChart = null;
  let messagesDailyChart = null;
  let feedbackChart = null;

  // إظهار/إخفاء فلتر التاريخ المخصص بناءً على اختيار الفترة
  timePeriodFilter.addEventListener('change', () => {
    customDateRange.style.display = timePeriodFilter.value === 'custom' ? 'block' : 'none';
  });

  // دالة لتحديد نطاق التاريخ بناءً على الفترة المختارة
  function getDateRange() {
    const period = timePeriodFilter.value;
    const now = new Date();
    let startDate, endDate;

    if (period === 'all') {
      startDate = null;
      endDate = null;
    } else if (period === 'day') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 6));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(now.setDate(now.getDate() - 29));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
      endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  // دالة لتحميل البيانات
  async function fetchAnalyticsData() {
    try {
      spinner.style.display = 'flex';

      const { startDate, endDate } = getDateRange();
      const messagesQuery = `/api/messages/${selectedBotId}?type=all${startDate ? `&startDate=${startDate.toISOString()}` : ''}${endDate ? `&endDate=${endDate.toISOString()}` : ''}`;
      const messagesRes = await fetch(messagesQuery, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!messagesRes.ok) throw new Error('فشل في جلب بيانات الرسائل');
      const messages = await messagesRes.json();

      // تحليل الرسائل
      const facebookMessages = messages.filter(conv => conv.userId !== 'anonymous' && !conv.userId.startsWith('whatsapp_')).length;
      const webMessages = messages.filter(conv => conv.userId === 'anonymous').length;
      const whatsappMessages = messages.filter(conv => conv.userId.startsWith('whatsapp_')).length;
      const totalMessages = messages.length;

      // تحليل التفاعل اليومي (آخر 7 أيام)
      const dailyMessages = Array(7).fill(0);
      const labels = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(date.toLocaleDateString('ar-EG'));
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        const messagesInDay = messages.filter(conv => {
          const firstMessageDate = new Date(conv.messages[0].timestamp);
          return firstMessageDate >= dayStart && firstMessageDate <= dayEnd;
        }).length;
        dailyMessages[6 - i] = messagesInDay;
      }

      // تحليل أوقات الذروة
      const messagesByHour = Array(24).fill(0);
      messages.forEach(conv => {
        conv.messages.forEach(msg => {
          const hour = new Date(msg.timestamp).getHours();
          messagesByHour[hour]++;
        });
      });
      const peakHour = messagesByHour.indexOf(Math.max(...messagesByHour));

      // جلب بيانات القواعد
      const rulesRes = await fetch(`/api/rules?botId=${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!rulesRes.ok) throw new Error('فشل في جلب بيانات القواعد');
      const { rules } = await rulesRes.json();

      const generalRules = rules.filter(rule => rule.type === 'general').length;
      const qaRules = rules.filter(rule => rule.type === 'qa').length;
      const productsRules = rules.filter(rule => rule.type === 'products').length;
      const apiRules = rules.filter(rule => rule.type === 'api').length;
      const globalRules = role === 'superadmin' ? rules.filter(rule => rule.type === 'global').length : 0;

      // جلب بيانات التقييمات
      const feedbackRes = await fetch(`/api/bots/${selectedBotId}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!feedbackRes.ok) throw new Error('فشل في جلب بيانات التقييمات');
      const feedback = await feedbackRes.json();

      const filteredFeedback = feedback.filter(item => {
        const feedbackDate = new Date(item.timestamp);
        return (!startDate || feedbackDate >= startDate) && (!endDate || feedbackDate <= endDate);
      });

      const positiveFeedback = filteredFeedback.filter(item => item.feedback === 'positive').length;
      const negativeFeedback = filteredFeedback.filter(item => item.feedback === 'negative').length;
      const totalFeedback = filteredFeedback.length;

      // أكثر ردود البوت تقييمًا سلبيًا
      const negativeReplies = filteredFeedback
        .filter(item => item.feedback === 'negative')
        .reduce((acc, item) => {
          const reply = item.messageContent || 'رد غير متوفر';
          acc[reply] = (acc[reply] || 0) + 1;
          return acc;
        }, {});
      const topNegativeReplies = Object.entries(negativeReplies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      // عرض البيانات النصية أولًا
      document.getElementById('totalMessages').textContent = `إجمالي الرسائل: ${totalMessages}`;
      document.getElementById('facebookMessages').textContent = `رسائل الفيسبوك: ${facebookMessages}`;
      document.getElementById('webMessages').textContent = `رسائل الويب: ${webMessages}`;
      document.getElementById('whatsappMessages').textContent = `رسائل الواتساب: ${whatsappMessages}`;
      document.getElementById('activeRules').textContent = `عدد القواعد النشطة: ${rules.length}`;
      document.getElementById('generalRules').textContent = `قواعد عامة: ${generalRules}`;
      document.getElementById('qaRules').textContent = `قواعد سؤال وجواب: ${qaRules}`;
      document.getElementById('productsRules').textContent = `قواعد المنتجات: ${productsRules}`;
      document.getElementById('apiRules').textContent = `قواعد API: ${apiRules}`;
      if (role === 'superadmin') {
        document.getElementById('globalRules').textContent = `قواعد موحدة: ${globalRules}`;
      }
      document.getElementById('totalFeedback').textContent = `إجمالي التقييمات: ${totalFeedback}`;
      document.getElementById('positiveFeedback').textContent = `التقييمات الإيجابية: ${positiveFeedback} (${totalFeedback ? Math.round((positiveFeedback / totalFeedback) * 100) : 0}%)`;
      document.getElementById('negativeFeedback').textContent = `التقييمات السلبية: ${negativeFeedback} (${totalFeedback ? Math.round((negativeFeedback / totalFeedback) * 100) : 0}%)`;
      document.getElementById('peakHours').textContent = `أوقات الذروة: الساعة ${peakHour}:00`;

      // عرض أكثر ردود البوت تقييمًا سلبيًا
      const negativeRepliesList = document.getElementById('negativeRepliesList');
      negativeRepliesList.innerHTML = topNegativeReplies.length > 0
        ? topNegativeReplies.map(([reply, count]) => `<li>${reply} (${count} تقييمات سلبية)</li>`).join('')
        : '<li>لا توجد ردود سلبية حاليًا</li>';

      // تدمير المخططات القديمة إذا كانت موجودة
      if (messagesTypeChart) {
        messagesTypeChart.destroy();
        messagesTypeChart = null;
      }
      if (messagesDailyChart) {
        messagesDailyChart.destroy();
        messagesDailyChart = null;
      }
      if (feedbackChart) {
        feedbackChart.destroy();
        feedbackChart = null;
      }

      // رسم المخططات فقط إذا كانت العناصر موجودة في الـ DOM
      const messagesTypeChartCanvas = document.getElementById('messagesTypeChart');
      if (messagesTypeChartCanvas) {
        const messagesTypeChartCtx = messagesTypeChartCanvas.getContext('2d');
        messagesTypeChart = new Chart(messagesTypeChartCtx, {
          type: 'pie',
          data: {
            labels: ['فيسبوك', 'ويب', 'واتساب'],
            datasets: [{
              label: 'توزيع الرسائل',
              data: [facebookMessages, webMessages, whatsappMessages],
              backgroundColor: ['#3b5998', '#00cc00', '#25d366'],
            }],
          },
        });
      }

      const messagesDailyChartCanvas = document.getElementById('messagesDailyChart');
      if (messagesDailyChartCanvas) {
        const messagesDailyChartCtx = messagesDailyChartCanvas.getContext('2d');
        messagesDailyChart = new Chart(messagesDailyChartCtx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'عدد الرسائل اليومية',
              data: dailyMessages,
              borderColor: '#007bff',
              fill: false,
            }],
          },
          options: { scales: { y: { beginAtZero: true } } },
        });
      }

      const feedbackChartCanvas = document.getElementById('feedbackChart');
      if (feedbackChartCanvas) {
        const feedbackChartCtx = feedbackChartCanvas.getContext('2d');
        feedbackChart = new Chart(feedbackChartCtx, {
          type: 'pie',
          data: {
            labels: ['إيجابي', 'سلبي'],
            datasets: [{
              label: 'التقييمات',
              data: [positiveFeedback, negativeFeedback],
              backgroundColor: ['#28a745', '#dc3545'],
            }],
          },
        });
      }

      analyticsContent.style.display = 'block';
      spinner.style.display = 'none';
    } catch (err) {
      console.error('خطأ في جلب الإحصائيات:', err);
      alert('خطأ في جلب الإحصائيات، يرجى المحاولة لاحقًا');
      document.getElementById('totalMessages').textContent = `إجمالي الرسائل: 0`;
      document.getElementById('facebookMessages').textContent = `رسائل الفيسبوك: 0`;
      document.getElementById('webMessages').textContent = `رسائل الويب: 0`;
      document.getElementById('whatsappMessages').textContent = `رسائل الواتساب: 0`;
      document.getElementById('activeRules').textContent = `عدد القواعد النشطة: 0`;
      document.getElementById('generalRules').textContent = `قواعد عامة: 0`;
      document.getElementById('qaRules').textContent = `قواعد سؤال وجواب: 0`;
      document.getElementById('productsRules').textContent = `قواعد المنتجات: 0`;
      document.getElementById('apiRules').textContent = `قواعد API: 0`;
      if (role === 'superadmin') {
        document.getElementById('globalRules').textContent = `قواعد موحدة: 0`;
      }
      document.getElementById('totalFeedback').textContent = `إجمالي التقييمات: 0`;
      document.getElementById('positiveFeedback').textContent = `التقييمات الإيجابية: 0 (0%)`;
      document.getElementById('negativeFeedback').textContent = `التقييمات السلبية: 0 (0%)`;
      document.getElementById('negativeRepliesList').innerHTML = '<li>لا توجد ردود سلبية حاليًا</li>';
      document.getElementById('peakHours').textContent = `أوقات الذروة: غير متاح`;
      spinner.style.display = 'none';
    }
  }

  // التأكد من تحميل الـ DOM قبل استدعاء الدالة
  document.addEventListener('DOMContentLoaded', () => {
    fetchAnalyticsData();
  });

  // إضافة حدث لتطبيق الفلتر
  applyFilterBtn.addEventListener('click', fetchAnalyticsData);
}
