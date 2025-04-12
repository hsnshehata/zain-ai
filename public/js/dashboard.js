document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  if (!localStorage.getItem('token')) {
    window.location.href = '/';
    return;
  }

  document.getElementById('botsBtn').addEventListener('click', () => {
    window.location.href = '#bots';
    loadBotsPage();
  });

  document.getElementById('rulesBtn').addEventListener('click', () => {
    window.location.href = '#rules';
    loadRulesPage();
  });

  document.getElementById('whatsappBtn').addEventListener('click', () => {
    window.location.href = '#whatsapp';
    loadWhatsAppPage();
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      console.log('📤 Sending logout request for username:', localStorage.getItem('username'));
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: localStorage.getItem('username') }),
      });

      const data = await response.json();
      console.log('📥 Logout response:', data);

      if (response.ok && data.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        console.log('✅ Logout successful, localStorage cleared');
        window.location.href = '/';
      } else {
        console.log('❌ Logout failed:', data.message);
        alert('فشل تسجيل الخروج، حاول مرة أخرى');
      }
    } catch (err) {
      console.error('❌ Error during logout:', err);
      alert('حدث خطأ أثناء تسجيل الخروج');
    }
  });

  // تحميل صفحة البوتات افتراضيًا
  loadBotsPage();
});

// دالة لتحميل صفحة القواعد ديناميكيًا
function loadRulesPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>إدارة القواعد</h2>
    <form id="ruleForm">
      <div>
        <label for="botId">اختر البوت:</label>
        <select id="botId" name="botId" required>
          <option value="">اختر بوت</option>
        </select>
      </div>
      <div>
        <label for="type">نوع القاعدة:</label>
        <select id="type" name="type" required>
          <option value="">اختر نوع القاعدة</option>
          <option value="general">عامة</option>
          <option value="products">منتجات</option>
          <option value="qa">سؤال وجواب</option>
        </select>
      </div>
      <div id="contentFields"></div>
      <button type="submit">إضافة القاعدة</button>
    </form>
    <h3>القواعد الحالية</h3>
    <ul id="rulesList"></ul>
  `;
}
