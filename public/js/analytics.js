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

  if (!token) {
    content.innerHTML = `
      <h2>إحصائيات البوتات</h2>
      <p style="color: red;">التوكن غير موجود، يرجى تسجيل الدخول مرة أخرى.</p>
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
          <div id="messagesTypeChart" class="ct-chart ct-perfect-fourth"></div>
          <div id="messagesDailyChart" class="ct-chart ct-perfect-fourth"></div>
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
          <div id="feedbackChart" class="ct-chart ct-perfect-fourth"></div>
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

  // دالة لجلب البيانات مع مهلة زمنية (timeout)
  async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error(`طلب ${url} تأخر أكثر من ${timeout / 1000} ثواني`);
      }
      throw err;
    }
  }

  // دالة لتحميل البيانات
  async function fetchAnalyticsData() {
    try {
      spinner.style.display = 'flex';
      analyticsContent.style.display = 'none'; // إخفاء المحتوى لحين تحميل البيانات

      // جلب بيانات الرسائل
      const { startDate, endDate } = getDateRange();
      const messagesQuery = `/api/messages/${selectedBotId}?type=all${startDate ? `&startDate=${startDate.toISOString()}` : ''}${endDate ? `&endDate=${endDate.toISOString()}` : ''}`;
      console.log('Fetching messages with query:', messagesQuery);
      const messagesRes = await fetchWithTimeout(messagesQuery, {
        headers: { Authorization: `Bearer ${token}` },
      }, 5000);

      let messages = [];
      if (messagesRes.ok) {
        messages = await messagesRes.json();
      } else {
        const errorText = await messagesRes.text();
        console.warn(`⚠️ فشل في جلب بيانات الرسائل: ${messagesRes.status} - ${errorText}`);
      }

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
      console.log('Fetching rules for botId:', selectedBotId);
      const rulesRes = await fetchWithTimeout(`/api/rules?botId=${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 5000);

      let rules = [];
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        rules = rulesData.rules || [];
      } else {
        const errorText = await rulesRes.text();
        console.warn(`⚠️ فشل في جلب بيانات القواعد: ${rulesRes.status} - ${errorText}`);
      }

      const generalRules = rules.filter(rule => rule.type === 'general').length;
      const qaRules = rules.filter(rule => rule.type === 'qa').length;
      const productsRules = rules.filter(rule => rule.type === 'products').length;
      const apiRules = rules.filter(rule => rule.type === 'api').length;
      const globalRules = role === 'superadmin' ? rules.filter(rule => rule.type === 'global').length : 0;

      // جلب بيانات التقييمات
      console.log('Fetching feedback for botId:', selectedBotId);
      const feedbackRes = await fetchWithTimeout(`/api/bots/${selectedBotId}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 5000);

      let feedback = [];
      if (feedbackRes.ok) {
        feedback = await feedbackRes.json();
      } else {
        const errorText = await feedbackRes.text();
        console.warn(`⚠️ فشل في جلب بيانات التقييمات: ${feedbackRes.status} - ${errorText}`);
      }

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

      // رسم المخططات باستخدام Chartist.js
      const messagesTypeChartElement = document.getElementById('messagesTypeChart');
      if (messagesTypeChartElement) {
        new Chartist.Pie('#messagesTypeChart', {
          labels: ['فيسبوك', 'ويب', 'واتساب'],
          series: [facebookMessages, webMessages, whatsappMessages],
        }, {
          width: '300px',
          height: '150px',
          chartPadding: 10,
          labelOffset: 30,
          labelDirection: 'explode',
          labelInterpolationFnc: function(value) {
            return value;
          }
        });
      }

      const messagesDailyChartElement = document.getElementById('messagesDailyChart');
      if (messagesDailyChartElement) {
        new Chartist.Line('#messagesDailyChart', {
          labels: labels,
          series: [dailyMessages],
        }, {
          width: '300px',
          height: '150px',
          chartPadding: 10,
          showPoint: true,
          axisY: {
            onlyInteger: true,
            offset: 20,
          }
        });
      }

      const feedbackChartElement = document.getElementById('feedbackChart');
      if (feedbackChartElement) {
        new Chartist.Pie('#feedbackChart', {
          labels: ['إيجابي', 'سلبي'],
          series: [positiveFeedback, negativeFeedback],
        }, {
          width: '300px',
          height: '150px',
          chartPadding: 10,
          labelOffset: 30,
          labelDirection: 'explode',
          labelInterpolationFnc: function(value) {
            return value;
          }
        });
      }

      // إظهار المحتوى وإخفاء الـ spinner
      spinner.style.display = 'none';
      analyticsContent.style.display = 'block';
    } catch (err) {
      console.error('خطأ في جلب الإحصائيات:', err);
      alert(`خطأ في جلب الإحصائيات: ${err.message}`);

      // عرض قيم افتراضية في حالة الخطأ
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

      // إخفاء الـ spinner وإظهار المحتوى حتى لو حصل خطأ
      spinner.style.display = 'none';
      analyticsContent.style.display = 'block';
    }
  }

  // التأكد من تحميل الـ DOM قبل استدعاء الدالة
  document.addEventListener('DOMContentLoaded', () => {
    fetchAnalyticsData();
  });

  // إضافة حدث لتطبيق الفلتر
  applyFilterBtn.addEventListener('click', fetchAnalyticsData);
}
