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

  // الواجهة الجديدة مع إحصائيات الرسائل
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
        <div id="analyticsData">
          <h3>إحصائيات الرسائل</h3>
          <p id="totalMessages">إجمالي الرسائل: جاري التحميل...</p>
          <p id="facebookMessages">رسائل الفيسبوك: جاري التحميل...</p>
          <p id="webMessages">رسائل الويب: جاري التحميل...</p>
          <p id="whatsappMessages">رسائل الواتساب: جاري التحميل...</p>
          <div id="messagesChart" class="ct-chart ct-perfect-fourth"></div>
        </div>
        <!-- إحصائيات القواعد -->
        <div id="analyticsData">
          <h3>إحصائيات القواعد</h3>
          <p id="messagesCount">عدد الرسائل: جاري التحميل...</p>
          <p id="activeRules">عدد القواعد النشطة: جاري التحميل...</p>
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
  async function fetchWithTimeout(url, options, timeout = 2000) {
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
      }, 2000);

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

      // جلب بيانات القواعد من الـ API الأصلي
      console.log('Fetching analytics for botId:', selectedBotId);
      const analyticsRes = await fetchWithTimeout(`/api/analytics?botId=${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 2000);

      let analytics = { messagesCount: 0, activeRules: 0 };
      if (analyticsRes.ok) {
        analytics = await analyticsRes.json();
      } else {
        const errorText = await analyticsRes.text();
        console.warn(`⚠️ فشل في جلب بيانات الإحصائيات: ${analyticsRes.status} - ${errorText}`);
      }

      // عرض البيانات الرقمية
      const adjustedMessagesCount = Math.round((analytics.messagesCount || 0) / 3);
      document.getElementById('totalMessages').textContent = `إجمالي الرسائل: ${totalMessages}`;
      document.getElementById('facebookMessages').textContent = `رسائل الفيسبوك: ${facebookMessages}`;
      document.getElementById('webMessages').textContent = `رسائل الويب: ${webMessages}`;
      document.getElementById('whatsappMessages').textContent = `رسائل الواتساب: ${whatsappMessages}`;
      document.getElementById('messagesCount').textContent = `عدد الرسائل: ${adjustedMessagesCount}`;
      document.getElementById('activeRules').textContent = `عدد القواعد النشطة: ${analytics.activeRules || 0}`;

      // عرض رسم بياني بسيط باستخدام Chartist.js
      const chartElement = document.getElementById('messagesChart');
      if (chartElement) {
        new Chartist.Pie('#messagesChart', {
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
      document.getElementById('messagesCount').textContent = `عدد الرسائل: 0`;
      document.getElementById('activeRules').textContent = `عدد القواعد النشطة: 0`;

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
