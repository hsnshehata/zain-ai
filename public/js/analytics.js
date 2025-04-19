async function loadAnalyticsPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  content.innerHTML = `
    <h2>إحصائيات البوتات</h2>
    <div>
      <label for="botSelect">اختر بوت:</label>
      <select id="botSelect"></select>
    </div>
    <div id="analyticsData">
      <h3>تفاصيل الأداء</h3>
      <p id="messagesCount">عدد الرسائل: جاري التحميل...</p>
      <p id="activeRules">عدد القواعد النشطة: جاري التحميل...</p>
    </div>
  `;

  const botSelect = document.getElementById('botSelect');
  try {
    document.getElementById('globalLoader').style.display = 'block';
    const res = await fetch('/api/bots', {
      headers: { Authorization: `Bearer ${token}` },
    });
    document.getElementById('globalLoader').style.display = 'none';
    if (!res.ok) {
      throw new Error('فشل في جلب البوتات');
    }
    const bots = await res.json();
    botSelect.innerHTML = '';
    const userBots = role === 'superadmin' 
      ? bots 
      : bots.filter((bot) => bot.userId && bot.userId._id === localStorage.getItem('userId'));
    userBots.forEach((bot) => {
      botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
    });
  } catch (err) {
    document.getElementById('globalLoader').style.display = 'none';
    console.error('خطأ في جلب البوتات:', err);
    alert('خطأ في جلب البوتات');
    return;
  }

  botSelect.addEventListener('change', async () => {
    const botId = botSelect.value;
    if (botId) {
      try {
        document.getElementById('globalLoader').style.display = 'block';
        const res = await fetch(`/api/analytics?botId=${botId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        document.getElementById('globalLoader').style.display = 'none';
        if (!res.ok) {
          throw new Error('فشل في جلب الإحصائيات');
        }
        const analytics = await res.json();

        // Divide messagesCount by 4 and multiply successRate by 2
        const adjustedMessagesCount = Math.round((analytics.messagesCount || 0) / 3);

        document.getElementById('messagesCount').textContent = `عدد الرسائل: ${adjustedMessagesCount}`;
        document.getElementById('activeRules').textContent = `عدد القواعد النشطة: ${analytics.activeRules || 0}`;
      } catch (err) {
        document.getElementById('globalLoader').style.display = 'none';
        console.error('خطأ في جلب الإحصائيات:', err);
        alert('خطأ في جلب الإحصائيات، يرجى المحاولة لاحقًا');
        document.getElementById('messagesCount').textContent = `عدد الرسائل: 0`;
        document.getElementById('activeRules').textContent = `عدد القواعد النشطة: 0`;
      }
    }
  });

  // Load analytics for the first bot by default
  if (botSelect.options.length > 0) {
    botSelect.value = botSelect.options[0].value;
    botSelect.dispatchEvent(new Event('change'));
  } else {
    document.getElementById('analyticsData').innerHTML = `
      <p style="color: red;">لا توجد بوتات متاحة لعرض الإحصائيات.</p>
    `;
  }
}
