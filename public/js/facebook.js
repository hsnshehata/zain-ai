// public/js/facebook.js
document.addEventListener('DOMContentLoaded', () => {
  async function loadFacebookPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <h2>إعدادات فيسبوك</h2>
      <div class="facebook-settings">
        <div class="setting-item">
          <div class="setting-info">
            <h3>رسائل الترحيب</h3>
            <p>إرسال رسالة ترحيب تلقائية للمستخدم عند فتح الدردشة. مفيد لتحسين تجربة العميل وتشجيعه على التفاعل.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="messagingOptinsToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <h3>التفاعل مع ردود الفعل</h3>
            <p>الرد تلقائيًا بناءً على تفاعلات المستخدم (مثل الإعجاب أو القلوب). يساعد في زيادة التفاعل مع العملاء.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="messageReactionsToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <h3>تتبع مصدر المستخدمين</h3>
            <p>معرفة مصدر المستخدم (مثل إعلانات أو روابط). يساعد في تخصيص الردود وتحليل مصادر الزوار.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="messagingReferralsToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <h3>التعامل مع تعديلات الرسائل</h3>
            <p>الرد بناءً على تعديلات المستخدم لرسائله. مفيد لتحسين دقة الردود في حالة تعديل الأسئلة.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="messageEditsToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <h3>تصنيف المحادثات</h3>
            <p>إضافة تصنيفات للمحادثات (مثل "عميل مهم"). يساعد في تنظيم المحادثات وتحسين المتابعة.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="inboxLabelsToggle">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <h3>إرسال سلة التسوق</h3>
            <p>إرسال تفاصيل السلة للمستخدم قبل الدفع. مفيد لتجربة تسوق سلسة داخل الدردشة.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="sendCartToggle">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;

    // جلب إعدادات التصاريح من الـ API
    try {
      const response = await fetch('/api/bots/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const settings = await response.json();

      document.getElementById('messagingOptinsToggle').checked = settings.messagingOptinsEnabled || false;
      document.getElementById('messageReactionsToggle').checked = settings.messageReactionsEnabled || false;
      document.getElementById('messagingReferralsToggle').checked = settings.messagingReferralsEnabled || false;
      document.getElementById('messageEditsToggle').checked = settings.messageEditsEnabled || false;
      document.getElementById('inboxLabelsToggle').checked = settings.inboxLabelsEnabled || false;
      document.getElementById('sendCartToggle').checked = settings.sendCartEnabled || false;

      // إضافة Event Listeners لتحديث الإعدادات
      document.getElementById('messagingOptinsToggle').addEventListener('change', (e) => updateSetting('messagingOptinsEnabled', e.target.checked));
      document.getElementById('messageReactionsToggle').addEventListener('change', (e) => updateSetting('messageReactionsEnabled', e.target.checked));
      document.getElementById('messagingReferralsToggle').addEventListener('change', (e) => updateSetting('messagingReferralsEnabled', e.target.checked));
      document.getElementById('messageEditsToggle').addEventListener('change', (e) => updateSetting('messageEditsEnabled', e.target.checked));
      document.getElementById('inboxLabelsToggle').addEventListener('change', (e) => updateSetting('inboxLabelsEnabled', e.target.checked));
      document.getElementById('sendCartToggle').addEventListener('change', (e) => updateSetting('sendCartEnabled', e.target.checked));
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      alert('حدث خطأ أثناء تحميل إعدادات فيسبوك');
    }
  }

  async function updateSetting(key, value) {
    try {
      const response = await fetch('/api/bots/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ [key]: value })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الإعداد');
      }
      console.log(`✅ Updated ${key} to ${value}`);
    } catch (err) {
      console.error('❌ Error updating setting:', err);
      alert('حدث خطأ أثناء تحديث الإعداد');
    }
  }

  // تعريف الدالة global عشان dashboard.js يقدر يستدعيها
  window.loadFacebookPage = loadFacebookPage;
});
