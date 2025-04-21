async function loadFeedbackPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  content.innerHTML = `
    <h2>التقييمات</h2>
    <div class="feedback-container">
      <div class="form-group">
        <select id="botSelectFeedback" onchange="loadFeedback(this.value)"></select>
        <label for="botSelectFeedback">اختر بوت</label>
      </div>
      <div id="feedbackList" class="feedback-grid"></div>
    </div>
  `;

  const botSelect = document.getElementById('botSelectFeedback');
  try {
    const res = await fetch('/api/bots', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب البوتات');
    }
    const bots = await res.json();

    botSelect.innerHTML = '';
    const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
    userBots.forEach((bot) => {
      botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
    });

    if (botSelect.options.length > 0) {
      loadFeedback(botSelect.options[0].value);
    }
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    content.innerHTML = `<p style="color: red;">تعذر تحميل البيانات، حاول مرة أخرى لاحقًا.</p>`;
  }
}

async function loadFeedback(botId) {
  const feedbackList = document.getElementById('feedbackList');
  feedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';

  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب التقييمات');
    }
    const feedback = await res.json();

    feedbackList.innerHTML = '';
    if (feedback.length === 0) {
      feedbackList.innerHTML = '<div class="feedback-card"><p>لا توجد تقييمات.</p></div>';
      return;
    }

    feedback.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'feedback-card';
      card.innerHTML = `
        <p><strong>المستخدم:</strong> ${item.userId}</p>
        <p><strong>الرسالة:</strong> ${item.messageContent || 'غير متوفر'}</p>
        <p><strong>التقييم:</strong> ${item.feedback === 'positive' ? 'إيجابي' : 'سلبي'}</p>
        <p><strong>التاريخ:</strong> ${new Date(item.timestamp).toLocaleString('ar-EG')}</p>
      `;
      feedbackList.appendChild(card);
    });
  } catch (err) {
    console.error('خطأ في جلب التقييمات:', err);
    feedbackList.innerHTML = '<div class="feedback-card"><p style="color: red;">تعذر تحميل التقييمات.</p></div>';
  }
}
