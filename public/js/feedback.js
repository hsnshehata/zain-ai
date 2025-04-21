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
      <div class="feedback-sections">
        <div class="feedback-column positive-column">
          <h3>التقييمات الإيجابية</h3>
          <div id="positiveFeedbackList" class="feedback-grid"></div>
          <div class="feedback-actions">
            <button onclick="clearFeedback('positive')" class="clear-btn">مسح الكل</button>
            <button onclick="downloadFeedback('positive')" class="download-btn">تنزيل</button>
          </div>
        </div>
        <div class="feedback-column negative-column">
          <h3>التقييمات السلبية</h3>
          <div id="negativeFeedbackList" class="feedback-grid"></div>
          <div class="feedback-actions">
            <button onclick="clearFeedback('negative')" class="clear-btn">مسح الكل</button>
            <button onclick="downloadFeedback('negative')" class="download-btn">تنزيل</button>
          </div>
        </div>
      </div>
      <p class="feedback-note">مراجعة التقييمات تساعد في تقييم أداء البوت واكتشاف الأخطاء لتحسينها من خلال إضافة قواعد مناسبة.</p>
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
  const positiveFeedbackList = document.getElementById('positiveFeedbackList');
  const negativeFeedbackList = document.getElementById('negativeFeedbackList');
  positiveFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';
  negativeFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';

  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب التقييمات');
    }
    const feedback = await res.json();

    // تصفية التقييمات إلى إيجابية وسلبية
    const positiveFeedback = feedback.filter(item => item.feedback === 'positive');
    const negativeFeedback = feedback.filter(item => item.feedback === 'negative');

    // عرض التقييمات الإيجابية
    positiveFeedbackList.innerHTML = '';
    if (positiveFeedback.length === 0) {
      positiveFeedbackList.innerHTML = '<div class="feedback-card"><p>لا توجد تقييمات إيجابية.</p></div>';
    } else {
      positiveFeedback.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'feedback-card';
        card.innerHTML = `
          <p><strong>المستخدم:</strong> ${item.username || item.userId}</p>
          <p><strong>رد البوت:</strong> ${item.messageContent || 'غير متوفر'}</p>
          <p><strong>التاريخ:</strong> ${new Date(item.timestamp).toLocaleString('ar-EG')}</p>
          <button onclick="deleteFeedback('${item._id}', '${botId}')" class="delete-btn">حذف</button>
        `;
        positiveFeedbackList.appendChild(card);
      });
    }

    // عرض التقييمات السلبية
    negativeFeedbackList.innerHTML = '';
    if (negativeFeedback.length === 0) {
      negativeFeedbackList.innerHTML = '<div class="feedback-card"><p>لا توجد تقييمات سلبية.</p></div>';
    } else {
      negativeFeedback.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'feedback-card';
        card.innerHTML = `
          <p><strong>المستخدم:</strong> ${item.username || item.userId}</p>
          <p><strong>رد البوت:</strong> ${item.messageContent || 'غير متوفر'}</p>
          <p><strong>التاريخ:</strong> ${new Date(item.timestamp).toLocaleString('ar-EG')}</p>
          <button onclick="deleteFeedback('${item._id}', '${botId}')" class="delete-btn">حذف</button>
        `;
        negativeFeedbackList.appendChild(card);
      });
    }
  } catch (err) {
    console.error('خطأ في جلب التقييمات:', err);
    positiveFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: red;">تعذر تحميل التقييمات.</p></div>';
    negativeFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: red;">تعذر تحميل التقييمات.</p></div>';
  }
}

async function deleteFeedback(feedbackId, botId) {
  if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
    try {
      const res = await fetch(`/api/bots/${botId}/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        throw new Error('فشل في حذف التقييم');
      }
      alert('تم حذف التقييم بنجاح');
      loadFeedback(botId);
    } catch (err) {
      console.error('خطأ في حذف التقييم:', err);
      alert('فشل في حذف التقييم');
    }
  }
}

async function clearFeedback(type) {
  const botId = document.getElementById('botSelectFeedback').value;
  if (confirm(`هل أنت متأكد من مسح جميع التقييمات ${type === 'positive' ? 'الإيجابية' : 'السلبية'}؟`)) {
    try {
      const res = await fetch(`/api/bots/${botId}/feedback/clear/${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        throw new Error('فشل في مسح التقييمات');
      }
      alert('تم مسح التقييمات بنجاح');
      loadFeedback(botId);
    } catch (err) {
      console.error('خطأ في مسح التقييمات:', err);
      alert('فشل في مسح التقييمات');
    }
  }
}

async function downloadFeedback(type) {
  const botId = document.getElementById('botSelectFeedback').value;
  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب التقييمات');
    }
    const feedback = await res.json();

    const filteredFeedback = feedback.filter(item => item.feedback === type);
    if (filteredFeedback.length === 0) {
      alert(`لا توجد تقييمات ${type === 'positive' ? 'إيجابية' : 'سلبية'} للتنزيل.`);
      return;
    }

    // تحويل البيانات إلى CSV مع دعم اللغة العربية
    const csvContent = [
      '\ufeff', // BOM لدعم اللغة العربية في Excel
      'المستخدم,رد البوت,التقييم,التاريخ\n',
      ...filteredFeedback.map(item => 
        `"${item.username || item.userId}","${(item.messageContent || 'غير متوفر').replace(/"/g, '""')}","${item.feedback === 'positive' ? 'إيجابي' : 'سلبي'}","${new Date(item.timestamp).toLocaleString('ar-EG')}"`
      ),
    ].join('');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقييمات_${type === 'positive' ? 'إيجابية' : 'سلبية'}_${new Date().toLocaleDateString('ar-EG')}.csv`;
    link.click();
  } catch (err) {
    console.error('خطأ في تنزيل التقييمات:', err);
    alert('فشل في تنزيل التقييمات');
  }
}
