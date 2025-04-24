document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  if (!token) {
    window.location.href = '/';
    return;
  }

  const content = document.getElementById('content');
  const botSelect = document.getElementById('botSelectDashboard');
  const botsBtn = document.querySelectorAll('.bots-btn');
  const rulesBtn = document.querySelectorAll('.rules-btn');
  const chatPageBtn = document.querySelectorAll('.chat-page-btn');
  const analyticsBtn = document.querySelectorAll('.analytics-btn');
  const messagesBtn = document.querySelectorAll('.messages-btn');
  const feedbackBtn = document.querySelectorAll('.feedback-btn');
  const facebookBtn = document.querySelectorAll('.facebook-btn');
  const logoutBtn = document.querySelectorAll('.logout-btn');

  if (role !== 'superadmin') {
    botsBtn.forEach(btn => btn.style.display = 'none');
    messagesBtn.forEach(btn => btn.style.display = 'none');
    feedbackBtn.forEach(btn => btn.style.display = 'none');
    facebookBtn.forEach(btn => btn.style.display = 'none');
  } else {
    botsBtn.forEach(btn => btn.style.display = 'inline-block');
    messagesBtn.forEach(btn => btn.style.display = 'inline-block');
    feedbackBtn.forEach(btn => btn.style.display = 'inline-block');
    facebookBtn.forEach(btn => btn.style.display = 'inline-block');
  }

  // Load bots into the dropdown
  async function populateBotSelect() {
    try {
      const res = await fetch('/api/bots', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('فشل في جلب البوتات');
      }
      const bots = await res.json();
      botSelect.innerHTML = '<option value="">اختر بوت</option>';
      const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
      userBots.forEach((bot) => {
        botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
      });

      // Load previously selected bot or select the first one
      const selectedBotId = localStorage.getItem('selectedBotId');
      if (selectedBotId && userBots.some(bot => bot._id === selectedBotId)) {
        botSelect.value = selectedBotId;
      } else if (userBots.length > 0) {
        botSelect.value = userBots[0]._id;
        localStorage.setItem('selectedBotId', userBots[0]._id);
      }

      // Trigger page load based on hash
      loadPageBasedOnHash();
    } catch (err) {
      console.error('خطأ في جلب البوتات:', err);
      alert('خطأ في جلب البوتات');
    }
  }

  // Save selected bot and reload page
  botSelect.addEventListener('change', () => {
    const selectedBotId = botSelect.value;
    localStorage.setItem('selectedBotId', selectedBotId);
    loadPageBasedOnHash();
  });

  const setActiveButton = (hash) => {
    const buttons = [botsBtn, rulesBtn, chatPageBtn, analyticsBtn, messagesBtn, feedbackBtn, facebookBtn, logoutBtn];
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
      case '#messages':
        messagesBtn.forEach(btn => btn.classList.add('active'));
        break;
      case '#feedback':
        feedbackBtn.forEach(btn => btn.classList.add('active'));
        break;
      case '#facebook':
        facebookBtn.forEach(btn => btn.classList.add('active'));
        break;
    }
  };

  const attachEventListeners = () => {
    botsBtn.forEach(btn => {
      btn.removeEventListener('click', botsBtnClickHandler);
      btn.addEventListener('click', botsBtnClickHandler);
    });

    rulesBtn.forEach(btn => {
      btn.removeEventListener('click', rulesBtnClickHandler);
      btn.addEventListener('click', rulesBtnClickHandler);
    });

    chatPageBtn.forEach(btn => {
      btn.removeEventListener('click', chatPageBtnClickHandler);
      btn.addEventListener('click', chatPageBtnClickHandler);
    });

    analyticsBtn.forEach(btn => {
      btn.removeEventListener('click', analyticsBtnClickHandler);
      btn.addEventListener('click', analyticsBtnClickHandler);
    });

    messagesBtn.forEach(btn => {
      btn.removeEventListener('click', messagesBtnClickHandler);
      btn.addEventListener('click', messagesBtnClickHandler);
    });

    feedbackBtn.forEach(btn => {
      btn.removeEventListener('click', feedbackBtnClickHandler);
      btn.addEventListener('click', feedbackBtnClickHandler);
    });

    facebookBtn.forEach(btn => {
      btn.removeEventListener('click', facebookBtnClickHandler);
      btn.addEventListener('click', facebookBtnClickHandler);
    });

    logoutBtn.forEach(btn => {
      btn.removeEventListener('click', logoutBtnClickHandler);
      btn.addEventListener('click', logoutBtnClickHandler);
    });
  };

  const botsBtnClickHandler = () => {
    console.log('Bots Button Clicked');
    window.location.hash = 'bots';
    loadPageBasedOnHash();
  };

  const rulesBtnClickHandler = () => {
    console.log('Rules Button Clicked');
    window.location.hash = 'rules';
    loadPageBasedOnHash();
  };

  const chatPageBtnClickHandler = () => {
    console.log('Chat Page Button Clicked');
    window.location.hash = 'chat-page';
    loadPageBasedOnHash();
  };

  const analyticsBtnClickHandler = () => {
    console.log('Analytics Button Clicked');
    window.location.hash = 'analytics';
    loadPageBasedOnHash();
  };

  const messagesBtnClickHandler = () => {
    console.log('Messages Button Clicked');
    window.location.hash = 'messages';
    loadPageBasedOnHash();
  };

  const feedbackBtnClickHandler = () => {
    console.log('Feedback Button Clicked');
    window.location.hash = 'feedback';
    loadPageBasedOnHash();
  };

  const facebookBtnClickHandler = () => {
    console.log('Facebook Button Clicked');
    window.location.hash = 'facebook';
    loadPageBasedOnHash();
  };

  const logoutBtnClickHandler = async () => {
    console.log('Logout Button Clicked');
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
        localStorage.removeItem('selectedBotId');
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
  };

  const loadMessagesPage = () => {
    console.log('Loading Messages Page...');
    content.innerHTML = ''; // Clear existing content
    window.loadMessagesPage(); // Call the function from messages.js
  };

  attachEventListeners();

  async function loadPageBasedOnHash() {
    const hash = window.location.hash;
    const userRole = localStorage.getItem('role');
    const selectedBotId = localStorage.getItem('selectedBotId');

    if (!selectedBotId && botSelect.options.length > 0) {
      localStorage.setItem('selectedBotId', botSelect.options[0].value);
    }

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
    } else if (hash === '#messages') {
      if (userRole === 'superadmin') {
        loadMessagesPage();
      } else {
        window.location.hash = 'rules';
        loadRulesPage();
      }
    } else if (hash === '#feedback') {
      if (userRole === 'superadmin') {
        loadFeedbackPage();
      } else {
        window.location.hash = 'rules';
        loadRulesPage();
      }
    } else if (hash === '#facebook') {
      if (userRole === 'superadmin') {
        loadFacebookPage();
      } else {
        window.location.hash = 'rules';
        loadRulesPage();
      }
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

  // Initialize bot selector
  populateBotSelect();
});
