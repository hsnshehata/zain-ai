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
    } else {
      content.innerHTML += `<p style="color: #dc3545; text-align: center;">لا توجد بوتات متاحة لعرض تقييماتها.</p>`;
    }
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    content.innerHTML = `<p style="color: #dc3545; text-align: center;">تعذر تحميل البيانات، حاول مرة أخرى لاحقًا.</p>`;
  }
}

async function loadFeedback(botId) {
  console.log(`📋 Loading feedback for botId: ${botId}`);
  const positiveFeedbackList = document.getElementById('positiveFeedbackList');
  const negativeFeedbackList = document.getElementById('negativeFeedbackList');

  if (!positiveFeedbackList || !negativeFeedbackList) {
    console.error('عناصر التقييمات غير موجودة في الـ DOM');
    return;
  }

  positiveFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';
  negativeFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';

  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    let feedback;
    try {
      feedback = await res.json();
    } catch (jsonErr) {
      throw new Error('فشل في تحليل البيانات: رد السيرفر غير متوقع');
    }

    if (!res.ok) {
      throw new Error(feedback.message || 'فشل في جلب التقييمات');
    }

    const positiveFeedback = feedback.filter(item => item.feedback === 'positive');
    const negativeFeedback = feedback.filter(item => item.feedback === 'negative');

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
    if (positiveFeedbackList && negativeFeedbackList) {
      positiveFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: #dc3545;">تعذر تحميل التقييمات: ' + err.message + '</p></div>';
      negativeFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: #dc3545;">تعذر تحميل التقييمات: ' + err.message + '</p></div>';
    }
  }
}

async function deleteFeedback(feedbackId, botId) {
  console.log(`🗑️ Attempting to delete feedback with ID: ${feedbackId} for botId: ${botId}`);
  if (!botId) {
    alert('يرجى اختيار بوت أولاً.');
    return;
  }
  if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
    try {
      const res = await fetch(`/api/bots/${botId}/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonErr) {
        throw new Error('فشل في تحليل البيانات: رد السيرفر غير متوقع');
      }

      if (!res.ok) {
        throw new Error(responseData.message || 'فشل في حذف التقييم');
      }

      alert('تم حذف التقييم بنجاح');
      loadFeedback(botId);
    } catch (err) {
      console.error('خطأ في حذف التقييم:', err);
      alert(err.message || 'فشل في حذف التقييم، حاول مرة أخرى');
    }
  }
}

async function clearFeedback(type) {
  const botId = document.getElementById('botSelectFeedback').value;
  console.log(`🗑️ Attempting to clear ${type} feedback for botId: ${botId}`);
  if (!botId) {
    alert('يرجى اختيار بوت أولاً.');
    return;
  }
  if (confirm(`هل أنت متأكد من مسح جميع التقييمات ${type === 'positive' ? 'الإيجابية' : 'السلبية'}؟`)) {
    try {
      const res = await fetch(`/api/bots/${botId}/feedback/clear/${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonErr) {
        throw new Error('فشل في تحليل البيانات: رد السيرفر غير متوقع');
      }

      if (!res.ok) {
        throw new Error(responseData.message || 'فشل في مسح التقييمات');
      }

      alert('تم مسح التقييمات بنجاح');
      loadFeedback(botId);
    } catch (err) {
      console.error('خطأ في مسح التقييمات:', err);
      alert(err.message || 'فشل في مسح التقييمات، حاول مرة أخرى');
    }
  }
}

async function downloadFeedback(type) {
  const botId = document.getElementById('botSelectFeedback').value;
  if (!botId) {
    alert('يرجى اختيار بوت أولاً.');
    return;
  }
  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    let feedback;
    try {
      feedback = await res.json();
    } catch (jsonErr) {
      throw new Error('فشل في تحليل البيانات: رد السيرفر غير متوقع');
    }

    if (!res.ok) {
      throw new Error(feedback.message || 'فشل في جلب التقييمات');
    }

    const filteredFeedback = feedback.filter(item => item.feedback === type);
    if (filteredFeedback.length === 0) {
      alert(`لا توجد تقييمات ${type === 'positive' ? 'إيجابية' : 'سلبية'} للتنزيل.`);
      return;
    }

    const csvContent = [
      '\ufeff',
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
    alert(err.message || 'فشل في تنزيل التقييمات، حاول مرة أخرى');
  }
}
