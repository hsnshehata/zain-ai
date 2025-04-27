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

  content.innerHTML = `
    <h2>إحصائيات البوتات</h2>
    <div class="analytics-container">
      <div class="spinner"><div class="loader"></div></div>
      <div id="analyticsContent" style="display: none;">
        <div id="analyticsData">
          <h3>تفاصيل الأداء</h3>
          <p id="messagesCount">عدد الرسائل: جاري التحميل...</p>
          <p id="activeRules">عدد القواعد النشطة: جاري التحميل...</p>
          <div id="messagesChart" class="ct-chart ct-perfect-fourth"></div>
        </div>
      </div>
    </div>
  `;

  const analyticsContent = document.getElementById('analyticsContent');
  const spinner = document.querySelector('.spinner');

  try {
    spinner.style.display = 'flex';
    console.log('Fetching analytics for botId:', selectedBotId);
    const res = await fetch(`/api/analytics?botId=${selectedBotId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`فشل في جلب الإحصائيات: ${res.status} - ${errorText}`);
    }

    const analytics = await res.json();

    // عرض البيانات النصية
    const adjustedMessagesCount = Math.round((analytics.messagesCount || 0) / 3);
    document.getElementById('messagesCount').textContent = `عدد الرسائل: ${adjustedMessagesCount}`;
    document.getElementById('activeRules').textContent = `عدد القواعد النشطة: ${analytics.activeRules || 0}`;

    // عرض رسم بياني بسيط باستخدام Chartist.js
    const chartElement = document.getElementById('messagesChart');
    if (chartElement) {
      new Chartist.Pie('#messagesChart', {
        labels: ['الرسائل', 'القواعد النشطة'],
        series: [adjustedMessagesCount, analytics.activeRules || 0],
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

    analyticsContent.style.display = 'block';
    spinner.style.display = 'none';
  } catch (err) {
    console.error('خطأ في جلب الإحصائيات:', err);
    alert(`خطأ في جلب الإحصائيات: ${err.message}`);

    // عرض قيم افتراضية في حالة الخطأ
    document.getElementById('messagesCount').textContent = `عدد الرسائل: 0`;
    document.getElementById('activeRules').textContent = `عدد القواعد النشطة: 0`;

    // إخفاء الـ spinner وإظهار المحتوى حتى لو حصل خطأ
    spinner.style.display = 'none';
    analyticsContent.style.display = 'block';
  }
}
