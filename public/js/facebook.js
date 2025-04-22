// public/js/facebook.js
document.addEventListener('DOMContentLoaded', () => {
  async function loadFacebookPage() {
    const content = document.getElementById('content');
    // Show loading spinner while fetching settings
    content.innerHTML = `
      <h2>إعدادات فيسبوك</h2>
      <div class="spinner">
        <div class="loader"></div>
      </div>
      <div id="facebookSettingsContent" class="facebook-settings" style="display: none;">
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
      <div id="error" style="display: none; text-align: center; margin-top: 10px; color: #dc3545;"></div>
    `;

    const facebookSettingsContent = document.getElementById('facebookSettingsContent');
    const errorDiv = document.getElementById('error');

    try {
      const response = await fetch('/api/bots/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('التوكن غير صالح، من فضلك سجل دخول مرة أخرى');
        } else if (response.status === 404) {
          throw new Error('البوت غير موجود');
        }
        throw new Error(`فشل جلب الإعدادات: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('الـ response مش JSON، ممكن يكون فيه مشكلة في السيرفر');
      }

      const settings = await response.json();

      // Hide loading spinner and show settings
      document.querySelector('.spinner').style.display = 'none';
      facebookSettingsContent.style.display = 'block';

      // Set checkbox values
      document.getElementById('messagingOptinsToggle').checked = settings.messagingOptinsEnabled || false;
      document.getElementById('messageReactionsToggle').checked = settings.messageReactionsEnabled || false;
      document.getElementById('messagingReferralsToggle').checked = settings.messagingReferralsEnabled || false;
      document.getElementById('messageEditsToggle').checked = settings.messageEditsEnabled || false;
      document.getElementById('inboxLabelsToggle').checked = settings.inboxLabelsEnabled || false;
      document.getElementById('sendCartToggle').checked = settings.sendCartEnabled || false;

      // Add event listeners for toggles
      document.getElementById('messagingOptinsToggle').addEventListener('change', (e) => updateSetting('messagingOptinsEnabled', e.target.checked));
      document.getElementById('messageReactionsToggle').addEventListener('change', (e) => updateSetting('messageReactionsEnabled', e.target.checked));
      document.getElementById('messagingReferralsToggle').addEventListener('change', (e) => updateSetting('messagingReferralsEnabled', e.target.checked));
      document.getElementById('messageEditsToggle').addEventListener('change', (e) => updateSetting('messageEditsEnabled', e.target.checked));
      document.getElementById('inboxLabelsToggle').addEventListener('change', (e) => updateSetting('inboxLabelsEnabled', e.target.checked));
      document.getElementById('sendCartToggle').addEventListener('change', (e) => updateSetting('sendCartEnabled', e.target.checked));
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      // Hide loading spinner and show error
      document.querySelector('.spinner').style.display = 'none';
      facebookSettingsContent.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.textContent = err.message || 'حدث خطأ أثناء تحميل إعدادات فيسبوك، حاول مرة أخرى لاحقًا';
      if (err.message.includes('التوكن غير صالح')) {
        // Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    }
  }

  async function updateSetting(key, value) {
    const errorDiv = document.getElementById('error');
    try {
      const response = await fetch('/api/bots/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ [key]: value })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('التوكن غير صالح، من فضلك سجل دخول مرة أخرى');
        }
        throw new Error(`فشل تحديث الإعداد: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('الـ response مش JSON، ممكن يكون فيه مشكلة في السيرفر');
      }

      const data = await response.json();
      console.log(`✅ Updated ${key} to ${value}`);
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    } catch (err) {
      console.error('❌ Error updating setting:', err);
      errorDiv.style.display = 'block';
      errorDiv.textContent = err.message || 'حدث خطأ أثناء تحديث الإعداد، حاول مرة أخرى';
      if (err.message.includes('التوكن غير صالح')) {
        // Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    }
  }

  // Define the function globally so dashboard.js can call it
  window.loadFacebookPage = loadFacebookPage;
});
