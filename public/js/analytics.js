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
        </div>
      </div>
    </div>
  `;

  const analyticsContent = document.getElementById('analyticsContent');
  const spinner = document.querySelector('.spinner');

  try {
    spinner.style.display = 'flex';
    const res = await fetch(`/api/analytics?botId=${selectedBotId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب الإحصائيات');
    }
    const analytics = await res.json();

    // Divide messagesCount by 3 (as per original code)
    const adjustedMessagesCount = Math.round((analytics.messagesCount || 0) / 3);

    document.getElementById('messagesCount').textContent = `عدد الرسائل: ${adjustedMessagesCount}`;
    document.getElementById('activeRules').textContent = `عدد القواعد النشطة: ${analytics.activeRules || 0}`;
    analyticsContent.style.display = 'block';
    spinner.style.display = 'none';
  } catch (err) {
    console.error('خطأ في جلب الإحصائيات:', err);
    alert('خطأ في جلب الإحصائيات، يرجى المحاولة لاحقًا');
    document.getElementById('messagesCount').textContent = `عدد الرسائل: 0`;
    document.getElementById('activeRules').textContent = `عدد القواعد النشطة: 0`;
    spinner.style.display = 'none';
  }
}
