document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const botsBtn = document.querySelectorAll('#botsBtn');
  const rulesBtn = document.querySelectorAll('#rulesBtn');
  const chatPageBtn = document.querySelectorAll('#chatPageBtn');
  const analyticsBtn = document.querySelectorAll('#analyticsBtn');
  const logoutBtn = document.querySelectorAll('#logoutBtn');

  // Show/hide bots button based on role
  if (role !== 'superadmin') {
    botsBtn.forEach(btn => btn.style.display = 'none');
  } else {
    botsBtn.forEach(btn => btn.style.display = 'inline-block');
  }

  // Function to set active button
  const setActiveButton = (hash) => {
    const buttons = [botsBtn, rulesBtn, chatPageBtn, analyticsBtn, logoutBtn];
    buttons.forEach(btnGroup => {
      btnGroup.forEach(btn => btn.classList.remove('active'));
    });

    switch (hash) {
      case '#bots':
        botsBtn.forEach(btn => btn.classList.add('active'));
        break;
      case '#rules':
        rulesBtn.forEach(btn => btn.classList.add('active'));
        break;
      case '#chat-page':
        chatPageBtn.forEach(btn => btn.classList.add('active'));
        break;
      case '#analytics':
        analyticsBtn.forEach(btn => btn.classList.add('active'));
        break;
    }
  };

  // Button event listeners
  botsBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = 'bots';
      loadPageBasedOnHash();
    });
  });

  rulesBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = 'rules';
      loadPageBasedOnHash();
    });
  });

  chatPageBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = 'chat-page';
      loadPageBasedOnHash();
    });
  });

  analyticsBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = 'analytics';
      loadPageBasedOnHash();
    });
  });

  logoutBtn.forEach(btn => {
    btn.addEventListener('click', async () => {
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
  });

  async function loadPageBasedOnHash() {
    const hash = window.location.hash;
    const userRole = localStorage.getItem('role');

    setActiveButton(hash);

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
