document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light', savedTheme === 'light');

  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector('i');
    icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
      icon.className = document.body.classList.contains('light') ? 'fas fa-moon' : 'fas fa-sun';
    });
  }

  const botsBtnClickHandler = () => {
    window.location.hash = 'bots';
    loadPageBasedOnHash();
  };

  const rulesBtnClickHandler = () => {
    window.location.hash = 'rules';
    loadPageBasedOnHash();
  };

  const chatPageBtnClickHandler = () => {
    window.location.hash = 'chat-page';
    loadPageBasedOnHash();
  };

  const analyticsBtnClickHandler = () => {
    window.location.hash = 'analytics';
    loadPageBasedOnHash();
  };

  const logoutBtnClickHandler = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
  };

  async function loadPageBasedOnHash() {
    const content = document.getElementById('content');
    content.innerHTML = '<div class="spinner"><div class="loader"></div></div>'; // Show spinner
    const hash = window.location.hash;
    const userRole = localStorage.getItem('role');
    setActiveButton(hash);

    try {
      if (hash === '#bots') {
        await loadBotsPage();
      } else if (hash === '#rules') {
        await loadRulesPage();
      } else if (hash === '#chat-page') {
        await loadChatPage();
      } else if (hash === '#analytics') {
        await loadAnalyticsPage();
      } else if (hash === '#logout') {
        logoutBtnClickHandler();
      } else {
        if (userRole === 'superadmin') {
          window.location.hash = 'bots';
          await loadBotsPage();
        } else {
          window.location.hash = 'bots';
          await loadBotsPage();
        }
      }
    } catch (err) {
      console.error('Error loading page:', err);
      content.innerHTML = '<p id="error">حدث خطأ أثناء تحميل الصفحة، حاول مرة أخرى لاحقًا.</p>';
    }
  }

  function setActiveButton(hash) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    let targetClass;
    switch (hash) {
      case '#bots':
        targetClass = 'bots-btn';
        break;
      case '#rules':
        targetClass = 'rules-btn';
        break;
      case '#chat-page':
        targetClass = 'chat-page-btn';
        break;
      case '#analytics':
        targetClass = 'analytics-btn';
        break;
      case '#logout':
        targetClass = 'logout-btn';
        break;
      default:
        targetClass = 'bots-btn';
    }

    document.querySelectorAll(`.${targetClass}`).forEach(btn => btn.classList.add('active'));
  }

  document.querySelectorAll('.bots-btn').forEach(btn => btn.addEventListener('click', botsBtnClickHandler));
  document.querySelectorAll('.rules-btn').forEach(btn => btn.addEventListener('click', rulesBtnClickHandler));
  document.querySelectorAll('.chat-page-btn').forEach(btn => btn.addEventListener('click', chatPageBtnClickHandler));
  document.querySelectorAll('.analytics-btn').forEach(btn => btn.addEventListener('click', analyticsBtnClickHandler));
  document.querySelectorAll('.logout-btn').forEach(btn => btn.addEventListener('click', logoutBtnClickHandler));

  window.addEventListener('hashchange', loadPageBasedOnHash);
  await loadPageBasedOnHash();
});
