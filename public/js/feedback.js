async function loadFeedbackPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const selectedBotId = localStorage.getItem('selectedBotId');

  if (!selectedBotId) {
    content.innerHTML = `
      <h2>التقييمات</h2>
      <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
    `;
    return;
  }

  content.innerHTML = `
    <h2>التقييمات</h2>
    <div class="feedback-container">
      <div class="feedback-sections">
        <div class="feedback-column positive-column">
          <h3>التقييمات الإيجابية</h3>
          <div id="positiveFeedbackList" class="feedback-grid"></div>
          <div class="feedback-actions">
            <button onclick="clearFeedback('positive')" class="clear-btn">حذف الكل</button>
            <button onclick="downloadFeedback('positive')" class="download-btn">تنزيل</button>
          </div>
        </div>
        <div class="feedback-column negative-column">
          <h3>التقييمات السلبية</h3>
          <div id="negativeFeedbackList" class="feedback-grid"></div>
          <div class="feedback-actions">
            <button onclick="clearFeedback('negative')" class="clear-btn">حذف الكل</button>
            <button onclick="downloadFeedback('negative')" class="download-btn">تنزيل</button>
          </div>
        </div>
      </div>
      <p class="feedback-note">مراجعة التقييمات تساعد في تقييم أداء البوت واكتشاف الأخطاء لتحسينها من خلال إضافة قواعد مناسبة.</p>
    </div>
  `;

  await loadFeedback(selectedBotId);
}

async function loadFeedback(botId) {
  console.log(`📋 Loading feedback for botId: ${botId}`);
  const positiveFeedbackList = document.getElementById('positiveFeedbackList');
  const negativeFeedbackList = document.getElementById('negativeFeedbackList');
  const token = localStorage.getItem('token');

  if (!positiveFeedbackList || !negativeFeedbackList) {
    console.error('عناصر التقييمات غير موجودة في الـ DOM');
    return;
  }

  positiveFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';
  negativeFeedbackList.innerHTML = '<div class="spinner"><div class="loader"></div></div>';

  try {
    const res = await fetch(`/api/bots/${botId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let feedback;
    try {
      feedback = await res.json();
    } catch (jsonErr) {
      throw new Error('فشل في تحليل البيانات: رد السيرفر غير متوقع');
    }

    if (res.status === 401) {
      alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) {
      throw new Error(feedback.message || 'فشل في جلب التقييمات');
    }

    const positiveFeedback = feedback.filter(item => item.feedback === 'positive');
    const negativeFeedback = feedback.filter(item => item.feedback === 'negative');

    positiveFeedbackList.innerHTML = '';
    if (positiveFeedback.length === 0) {
      positiveFeedbackList.innerHTML = '<div class="feedback-card"><p>لا توجد تقييمات إيجابية مرئية.</p></div>';
    } else {
      positiveFeedback.forEach((item) => {
        if (!item._id) {
          console.warn('⚠️ تقييم بدون معرف:', item);
          return;
        }
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
      negativeFeedbackList.innerHTML = '<div class="feedback-card"><p>لا توجد تقييمات سلبية مرئية.</p></div>';
    } else {
      negativeFeedback.forEach((item) => {
        if (!item._id) {
          console.warn('⚠️ تقييم بدون معرف:', item);
          return;
        }
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
    console.error('❌ خطأ في جلب التقييمات:', err);
    if (positiveFeedbackList && negativeFeedbackList) {
      positiveFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: #dc3545;">تعذر تحميل التقييمات: ' + err.message + '</p></div>';
      negativeFeedbackList.innerHTML = '<div class="feedback-card"><p style="color: #dc3545;">تعذر تحميل التقييمات: ' + err.message + '</p></div>';
    }
  }
}

async function deleteFeedback(feedbackId, botId) {
  console.log(`🗑️ Attempting to hide feedback with ID: ${feedbackId} for botId: ${botId}`);
  if (!botId) {
    alert('يرجى اختيار بوت أولاً.');
    return;
  }
  if (!feedbackId) {
    alert('معرف التقييم غير صالح.');
    return;
  }
  if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
    try {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.innerHTML = '<div class="loader"></div>';
      document.body.appendChild(spinner);

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

      if (res.status === 401) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
      }

      if (!res.ok) {
        console.error('❌ رد السيرفر:', responseData);
        throw new Error(responseData.message || 'فشل في حذف التقييم');
      }

      alert('تم حذف التقييم بنجاح');
      await loadFeedback(botId);
    } catch (err) {
      console.error('❌ خطأ في حذف التقييم:', err);
      alert(err.message || 'فشل في حذف التقييم، حاول مرة أخرى');
    } finally {
      const spinner = document.querySelector('.spinner');
      if (spinner) spinner.remove();
    }
  }
}

async function clearFeedback(type) {
  const botId = localStorage.getItem('selectedBotId');
  console.log(`🗑️ Attempting to hide ${type} feedback for botId: ${botId}`);
  if (!botId) {
    alert('يرجى اختيار بوت أولاً.');
    return;
  }
  if (confirm(`هل أنت متأكد من حذف جميع التقييمات ${type === 'positive' ? 'الإيجابية' : 'السلبية'}؟`)) {
    try {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.innerHTML = '<div class="loader"></div>';
      document.body.appendChild(spinner);

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

      if (res.status === 401) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
      }

      if (!res.ok) {
        console.error('❌ رد السيرفر:', responseData);
        throw new Error(responseData.message || 'فشل في حذف التقييمات');
      }

      alert('تم حذف التقييمات بنجاح');
      await loadFeedback(botId);
    } catch (err) {
      console.error('❌ خطأ في حذف التقييمات:', err);
      alert(err.message || 'فشل في حذف التقييمات، حاول مرة أخرى');
    } finally {
      const spinner = document.querySelector('.spinner');
      if (spinner) spinner.remove();
    }
  }
}

async function downloadFeedback(type) {
  const botId = localStorage.getItem('selectedBotId');
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

    if (res.status === 401) {
      alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) {
      throw new Error(feedback.message || 'فشل في جلب التقييمات');
    }

    const filteredFeedback = feedback.filter(item => item.feedback === type);
    if (filteredFeedback.length === 0) {
      alert(`لا توجد تقييمات ${type === 'positive' ? 'إيجابية' : 'سلبية'} مرئية للتنزيل.`);
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
    console.error('❌ خطأ في تنزيل التقييمات:', err);
    alert(err.message || 'فشل في تنزيل التقييمات، حاول مرة أخرى');
  }
}
