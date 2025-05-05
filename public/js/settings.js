// public/js/settings.js

async function loadSettingsPage() {
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  try {
    const user = await handleApiRequest('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }, content, 'فشل في جلب بيانات المستخدم');

    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-cog"></i> إعدادات المستخدم</h2>
      </div>
      <div class="form-card">
        <form id="settingsForm">
          <div class="form-group">
            <label for="email">البريد الإلكتروني</label>
            <input type="email" id="email" value="${user.email || ''}" required>
          </div>
          <div class="form-group">
            <label for="username">اسم المستخدم</label>
            <input type="text" id="username" value="${user.username || ''}" required>
          </div>
          <div class="form-group">
            <label for="password">كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب في التغيير)</label>
            <input type="password" id="password">
          </div>
          <div class="form-group">
            <label for="confirmPassword">تأكيد كلمة المرور</label>
            <input type="password" id="confirmPassword">
          </div>
          <div class="form-group">
            <label for="whatsapp">رقم الواتساب</label>
            <input type="text" id="whatsapp" value="${user.whatsapp || ''}">
          </div>
          <button type="submit">حفظ التغييرات</button>
        </form>
        <p id="error" role="alert"></p>
      </div>
    `;

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const whatsapp = document.getElementById('whatsapp').value;
      const errorDiv = document.getElementById('error');

      if (password && password !== confirmPassword) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'كلمات المرور غير متطابقة';
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, username, whatsapp, ...(password && { password }) })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('username', username);
          loadSettingsPage(); // إعادة تحميل الصفحة بعد التحديث
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = data.message || 'فشل في تحديث بيانات المستخدم';
        }
      } catch (error) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'خطأ في السيرفر، حاول مرة أخرى';
      }
    });
  } catch (err) {
    content.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-circle"></i> خطأ</h2><p>فشل في تحميل إعدادات المستخدم. حاول مرة أخرى.</p></div>`;
  }
}

window.loadSettingsPage = loadSettingsPage;
