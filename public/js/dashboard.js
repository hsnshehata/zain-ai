document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const botsBtn = document.getElementById('botsBtn');
  const rulesBtn = document.getElementById('rulesBtn');
  const chatPageBtn = document.getElementById('chatPageBtn');
  const analyticsBtn = document.getElementById('analyticsBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const content = document.getElementById('content');

  // Show/hide bots button based on role
  if (role !== 'superadmin') {
    botsBtn.style.display = 'none';
  } else {
    botsBtn.style.display = 'inline-block';
  }

  // Button event listeners
  botsBtn.addEventListener('click', () => {
    // Placeholder for bots management (not implemented yet)
    content.innerHTML = '<p>إدارة البوتات قيد التطوير...</p>';
  });

  rulesBtn.addEventListener('click', () => {
    window.location.href = '/rules';
  });

  chatPageBtn.addEventListener('click', () => {
    window.location.href = '/chat-page';
  });

  analyticsBtn.addEventListener('click', () => {
    // Placeholder for analytics
    content.innerHTML = '<p>التحليلات قيد التطوير...</p>';
  });

  logoutBtn.addEventListener('click', async () => {
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

  // Load default content
  content.innerHTML = '<p>اختر وظيفة من الأزرار أعلاه</p>';
});
