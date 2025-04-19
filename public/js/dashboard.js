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

  // Show/hide bots button based on role
  if (role !== 'superadmin') {
    botsBtn.style.display = 'none';
  } else {
    botsBtn.style.display = 'inline-block';
  }

  // Button event listeners
  botsBtn.addEventListener('click', () => {
    window.location.hash = 'bots';
    loadPageBasedOnHash();
  });

  rulesBtn.addEventListener('click', () => {
    window.location.hash = 'rules';
    loadPageBasedOnHash();
  });

  chatPageBtn.addEventListener('click', () => {
    window.location.hash = 'chat-page';
    loadPageBasedOnHash();
  });

  analyticsBtn.addEventListener('click', () => {
    window.location.hash = 'analytics';
    loadPageBasedOnHash();
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

  async function loadPageBasedOnHash() {
    const hash = window.location.hash;
    const userRole = localStorage.getItem('role');
    const content = document.getElementById('content');
    content.classList.add('page-transition');

    if (userRole !== 'superadmin' && !hash) {
      window.location.hash = 'rules';
      loadRulesPage();
    } else if (hash === '#bots') {
      if (userRole === 'superadmin') {
        loadBotsPage();
      } else {
        window.location.hash = 'rules';
        loadRulesPage();
      }
    } else if (hash === '#rules') {
      loadRulesPage();
    } else if (hash === '#chat-page') {
      loadChatPage();
    } else if (hash === '#analytics') {
      loadAnalyticsPage();
    } else {
      if (userRole === 'superadmin') {
        window.location.hash = 'bots';
        loadBotsPage();
      } else {
        window.location.hash = 'rules';
        loadRulesPage();
      }
    }
  }

  window.addEventListener('hashchange', () => {
    loadPageBasedOnHash();
  });

  loadPageBasedOnHash();
});
