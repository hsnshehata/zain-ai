document.addEventListener('DOMContentLoaded', () => {
  async function loadMessagesPage() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    // Initial HTML with bot selector and loading spinner
    content.innerHTML = `
      <h2>الرسائل</h2>
      <div class="spinner">
        <div class="loader"></div>
      </div>
      <div id="botSelectorContainer" style="display: none;">
        <div class="form-group bot-selector">
          <select id="botSelectMessages" name="botSelectMessages">
            <option value="">اختر بوت</option>
          </select>
          <label for="botSelectMessages">اختر البوت</label>
        </div>
      </div>
      <div id="messagesContent" style="display: none;">
        <div class="messages-tabs">
          <button id="facebookMessagesTab" class="rule-type-btn active">رسائل الفيسبوك</button>
          <button id="webMessagesTab" class="rule-type-btn">رسائل الويب</button>
        </div>
        <div class="messages-actions">
          <div class="form-group">
            <label>فلترة الرسائل حسب الفترة:</label>
            <input type="date" id="startDateFilter" />
            <input type="date" id="endDateFilter" />
            <button id="applyFilterBtn">تطبيق الفلتر</button>
          </div>
          <button id="downloadMessagesBtn" class="download-btn">تنزيل جميع الرسائل</button>
          <button id="deleteAllConversationsBtn" class="delete-btn">حذف كل المحادثات</button>
        </div>
        <div id="usersList" class="users-grid"></div>
        <div id="userMessages" class="chat-container" style="display: none;"></div>
      </div>
      <div id="error" style="display: none; text-align: center; margin-top: 10px; color: #dc3545;"></div>
    `;

    const botSelect = document.getElementById('botSelectMessages');
    const botSelectorContainer = document.getElementById('botSelectorContainer');
    const messagesContent = document.getElementById('messagesContent');
    const facebookMessagesTab = document.getElementById('facebookMessagesTab');
    const webMessagesTab = document.getElementById('webMessagesTab');
    const usersList = document.getElementById('usersList');
    const userMessages = document.getElementById('userMessages');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const downloadMessagesBtn = document.getElementById('downloadMessagesBtn');
    const deleteAllConversationsBtn = document.getElementById('deleteAllConversationsBtn');
    const errorDiv = document.getElementById('error');
    const spinner = document.querySelector('.spinner');

    let currentBotId = '';
    let currentUserId = '';
    let currentTab = 'facebook'; // Default tab
    let conversations = [];
    let userNamesCache = {}; // Cache for Facebook user names
    let webUserCounter = 1; // Counter for web user names

    // Fetch bots
    let bots = [];
    try {
      const response = await fetch('/api/bots', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('التوكن غير صالح، من فضلك سجل دخول مرة أخرى');
        }
        throw new Error(`فشل في جلب البوتات: ${response.status} ${response.statusText}`);
      }

      bots = await response.json();
    } catch (err) {
      console.error('❌ Error fetching bots:', err);
      spinner.style.display = 'none';
      botSelectorContainer.style.display = 'none';
      messagesContent.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.textContent = err.message || 'تعذر جلب البوتات، حاول مرة أخرى لاحقًا';
      if (err.message.includes('التوكن غير صالح')) {
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
      return;
    }

    // Populate bot selector
    botSelect.innerHTML = '<option value="">اختر بوت</option>';
    const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId && bot.userId._id === userId);
    userBots.forEach((bot) => {
      const option = document.createElement('option');
      option.value = bot._id;
      option.textContent = bot.name;
      botSelect.appendChild(option);
    });

    if (userBots.length === 0) {
      spinner.style.display = 'none';
      botSelectorContainer.style.display = 'none';
      messagesContent.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'لا توجد بوتات متاحة لعرض رسائلها.';
      return;
    }

    // Show bot selector and hide spinner
    spinner.style.display = 'none';
    botSelectorContainer.style.display = 'block';

    // Automatically load messages for the first bot
    currentBotId = userBots[0]._id;
    botSelect.value = currentBotId;
    await loadConversations(currentBotId);

    // Add event listener to reload messages when a different bot is selected
    botSelect.addEventListener('change', async () => {
      currentBotId = botSelect.value;
      if (currentBotId) {
        await loadConversations(currentBotId);
      } else {
        messagesContent.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'يرجى اختيار بوت لعرض رسائله.';
      }
    });

    // Tab switching
    facebookMessagesTab.addEventListener('click', () => {
      facebookMessagesTab.classList.add('active');
      webMessagesTab.classList.remove('active');
      currentTab = 'facebook';
      loadConversations(currentBotId);
    });

    webMessagesTab.addEventListener('click', () => {
      webMessagesTab.classList.add('active');
      facebookMessagesTab.classList.remove('active');
      currentTab = 'web';
      loadConversations(currentBotId);
    });

    // Filter messages by date
    applyFilterBtn.addEventListener('click', () => {
      loadConversations(currentBotId);
    });

    // Delete all conversations
    deleteAllConversationsBtn.addEventListener('click', async () => {
      if (confirm('هل أنت متأكد من حذف كل المحادثات؟')) {
        try {
          const response = await fetch(`/api/messages/delete-all/${currentBotId}?type=${currentTab}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error('فشل في حذف المحادثات');
          }

          await loadConversations(currentBotId);
        } catch (err) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = err.message || 'حدث خطأ أثناء حذف المحادثات';
        }
      }
    });

    // Download all messages
    downloadMessagesBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(`/api/messages/download/${currentBotId}?type=${currentTab}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('فشل في تنزيل الرسائل');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages_${currentTab}_${currentBotId}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء تنزيل الرسائل';
      }
    });

    async function loadConversations(botId) {
      spinner.style.display = 'flex';
      messagesContent.style.display = 'none';
      errorDiv.style.display = 'none';
      userMessages.style.display = 'none';

      try {
        const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
        const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;

        const response = await fetch(`/api/messages/${botId}?type=${currentTab}${startDate ? `&startDate=${startDate.toISOString()}` : ''}${endDate ? `&endDate=${endDate.toISOString()}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('فشل في جلب المحادثات');
        }

        conversations = await response.json();
        if (!Array.isArray(conversations)) {
          throw new Error('البيانات المستلمة غير متوقعة');
        }

        // Show messages content
        spinner.style.display = 'none';
        messagesContent.style.display = 'block';

        // Display users
        usersList.innerHTML = '';
        const userIds = [...new Set(conversations.map(conv => conv.userId))];
        webUserCounter = 1; // Reset counter for web users

        for (const userId of userIds) {
          const userConversations = conversations.filter(conv => conv.userId === userId);
          let userName = userId;
          let isWebUser = userId === 'anonymous' || userId.startsWith('web_'); // Check if user is a web user

          // Apply tab filtering
          if (currentTab === 'facebook' && isWebUser) continue; // Skip web users in Facebook tab
          if (currentTab === 'web' && !isWebUser) continue; // Skip non-web users in Web tab

          if (currentTab === 'facebook') {
            // Fetch Facebook user name
            if (userNamesCache[userId]) {
              userName = userNamesCache[userId];
            } else {
              try {
                const fbUserResponse = await fetch(`/api/messages/facebook-user/${userId}`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                if (fbUserResponse.ok) {
                  const fbUser = await fbUserResponse.json();
                  userName = fbUser.name || userId;
                  userNamesCache[userId] = userName;
                }
              } catch (err) {
                console.error('Error fetching Facebook user name:', err);
              }
            }
          } else {
            // Web users
            userName = `مستخدم ${webUserCounter++}`;
          }

          const userCard = document.createElement('div');
          userCard.className = 'user-card';
          userCard.innerHTML = `
            <h3>${userName}</h3>
            <p>عدد الرسائل: ${userConversations[0].messages.length}</p>
            <p>آخر رسالة: ${new Date(userConversations[0].messages[userConversations[0].messages.length - 1].timestamp).toLocaleString('ar-EG')}</p>
            <button class="delete-btn delete-user-btn" data-user-id="${userId}">حذف المستخدم</button>
          `;
          userCard.addEventListener('click', () => {
            currentUserId = userId;
            loadUserMessages(userId, userName);
          });
          usersList.appendChild(userCard);
        }

        // Add event listeners for delete user buttons
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute('data-user-id');
            if (confirm('هل أنت متأكد من حذف هذا المستخدم ومحادثاته؟')) {
              try {
                const response = await fetch(`/api/messages/delete-user/${currentBotId}/${userId}?type=${currentTab}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                  throw new Error('فشل في حذف المستخدم');
                }

                await loadConversations(currentBotId);
                userMessages.style.display = 'none';
              } catch (err) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = err.message || 'حدث خطأ أثناء حذف المستخدم';
              }
            }
          });
        });
      } catch (err) {
        console.error('Error loading conversations:', err);
        spinner.style.display = 'none';
        messagesContent.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء تحميل الرسائل، حاول مرة أخرى لاحقًا';
      }
    }

    async function loadUserMessages(userId, userName) {
      userMessages.innerHTML = `
        <div class="chat-header">
          <h3>${userName}</h3>
          <button class="delete-btn delete-conversation-btn" data-user-id="${userId}">حذف المحادثة</button>
        </div>
        <div class="chat-messages"></div>
      `;
      const chatMessages = userMessages.querySelector('.chat-messages');
      userMessages.style.display = 'block';

      const userConversations = conversations.filter(conv => conv.userId === userId);
      const messages = userConversations[0].messages;

      messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        messageDiv.innerHTML = `
          <p>${msg.content}</p>
          <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
        `;
        chatMessages.appendChild(messageDiv);

        // Animation
        setTimeout(() => {
          messageDiv.style.transition = 'all 0.3s ease';
          messageDiv.style.opacity = '1';
          messageDiv.style.transform = 'translateY(0)';
        }, 100);
      });

      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Add event listener for delete conversation button
      const deleteConversationBtn = userMessages.querySelector('.delete-conversation-btn');
      deleteConversationBtn.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
          try {
            const response = await fetch(`/api/messages/delete-user/${currentBotId}/${userId}?type=${currentTab}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
              throw new Error('فشل في حذف المحادثة');
            }

            await loadConversations(currentBotId);
            userMessages.style.display = 'none';
          } catch (err) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = err.message || 'حدث خطأ أثناء حذف المحادثة';
          }
        }
      });
    }
  }

  // Define the function globally so dashboard.js can call it
  window.loadMessagesPage = loadMessagesPage;
});
