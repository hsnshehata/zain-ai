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
          <button id="whatsappMessagesTab" class="rule-type-btn">رسائل الواتساب</button>
        </div>
        <div class="messages-actions">
          <div class="filter-group">
            <div class="form-group">
              <label>فلترة الرسائل حسب الفترة:</label>
              <div class="date-filter">
                <input type="date" id="startDateFilter" placeholder="من تاريخ" />
                <input type="date" id="endDateFilter" placeholder="إلى تاريخ" />
                <button id="applyFilterBtn">تطبيق الفلتر</button>
              </div>
            </div>
          </div>
        </div>
        <div class="users-list-container">
          <div id="usersLoadingSpinner" class="spinner" style="display: none;">
            <div class="loader"></div>
          </div>
          <div id="usersList" class="users-grid"></div>
          <div id="pagination" class="pagination"></div>
        </div>
        <div class="action-buttons">
          <button id="downloadMessagesBtn" class="download-btn">تنزيل جميع الرسائل</button>
          <button id="deleteAllConversationsBtn" class="delete-btn">حذف كل المحادثات</button>
        </div>
      </div>
      <div id="error" style="display: none; text-align: center; margin-top: 10px; color: #dc3545;"></div>
    `;

    const botSelect = document.getElementById('botSelectMessages');
    const botSelectorContainer = document.getElementById('botSelectorContainer');
    const messagesContent = document.getElementById('messagesContent');
    const facebookMessagesTab = document.getElementById('facebookMessagesTab');
    const webMessagesTab = document.getElementById('webMessagesTab');
    const whatsappMessagesTab = document.getElementById('whatsappMessagesTab');
    const usersList = document.getElementById('usersList');
    const usersLoadingSpinner = document.getElementById('usersLoadingSpinner');
    const pagination = document.getElementById('pagination');
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
    let currentPage = 1;
    const cardsPerPage = 30;

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
        currentPage = 1; // Reset to first page
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
      whatsappMessagesTab.classList.remove('active');
      currentTab = 'facebook';
      currentPage = 1; // Reset to first page
      loadConversations(currentBotId);
    });

    webMessagesTab.addEventListener('click', () => {
      webMessagesTab.classList.add('active');
      facebookMessagesTab.classList.remove('active');
      whatsappMessagesTab.classList.remove('active');
      currentTab = 'web';
      currentPage = 1; // Reset to first page
      loadConversations(currentBotId);
    });

    whatsappMessagesTab.addEventListener('click', () => {
      whatsappMessagesTab.classList.add('active');
      facebookMessagesTab.classList.remove('active');
      webMessagesTab.classList.remove('active');
      currentTab = 'whatsapp';
      currentPage = 1; // Reset to first page
      loadConversations(currentBotId);
    });

    // Filter messages by date
    applyFilterBtn.addEventListener('click', () => {
      currentPage = 1; // Reset to first page
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

          currentPage = 1; // Reset to first page
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
      usersLoadingSpinner.style.display = 'flex';
      usersList.style.display = 'none';
      messagesContent.style.display = 'none';
      errorDiv.style.display = 'none';

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
        usersLoadingSpinner.style.display = 'none';
        usersList.style.display = 'grid';
        messagesContent.style.display = 'block';

        // Display users with pagination
        usersList.innerHTML = '';
        const userIds = [...new Set(conversations.map(conv => conv.userId))];
        webUserCounter = 1; // Reset counter for web users

        // Sort users by the timestamp of their latest message (newest first)
        const sortedUserIds = userIds.sort((a, b) => {
          const convA = conversations.find(conv => conv.userId === a);
          const convB = conversations.find(conv => conv.userId === b);
          const latestMessageA = convA.messages[convA.messages.length - 1].timestamp;
          const latestMessageB = convB.messages[convB.messages.length - 1].timestamp;
          return new Date(latestMessageB) - new Date(latestMessageA); // Newest first
        });

        // Pagination logic
        const totalPages = Math.ceil(sortedUserIds.length / cardsPerPage);
        const startIndex = (currentPage - 1) * cardsPerPage;
        const endIndex = startIndex + cardsPerPage;
        const paginatedUserIds = sortedUserIds.slice(startIndex, endIndex);

        for (const userId of paginatedUserIds) {
          const userConversations = conversations.filter(conv => conv.userId === userId);
          let userName = userId;
          let isWebUser = userId === 'anonymous';
          let isWhatsAppUser = userId.startsWith('whatsapp_');

          // Apply tab filtering
          if (currentTab === 'facebook' && (isWebUser || isWhatsAppUser)) continue;
          if (currentTab === 'web' && !isWebUser) continue;
          if (currentTab === 'whatsapp' && !isWhatsAppUser) continue;

          if (currentTab === 'facebook') {
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
          } else if (currentTab === 'whatsapp') {
            userName = `واتساب ${webUserCounter++}`;
          } else {
            userName = `مستخدم ${webUserCounter++}`;
          }

          const userCard = document.createElement('div');
          userCard.className = 'user-card';
          userCard.innerHTML = `
            <h3>${userName}</h3>
            <p>عدد الرسائل: ${userConversations[0].messages.length}</p>
            <p>آخر رسالة: ${new Date(userConversations[0].messages[userConversations[0].messages.length - 1].timestamp).toLocaleString('ar-EG')}</p>
            <div class="chat-container" id="chat-${userId}" style="display: none;"></div>
          `;
          userCard.addEventListener('click', () => {
            // Toggle chat visibility
            const chatContainer = userCard.querySelector(`#chat-${userId}`);
            const isVisible = chatContainer.style.display === 'block';
            document.querySelectorAll('.chat-container').forEach(container => {
              container.style.display = 'none';
            });
            if (!isVisible) {
              chatContainer.style.display = 'block';
              currentUserId = userId;
              loadUserMessages(userId, userName, chatContainer);
            }
          });
          usersList.appendChild(userCard);
        }

        // Render pagination only if there are more than 1 page
        pagination.innerHTML = '';
        if (totalPages > 1) {
          pagination.style.display = 'flex';
          for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === currentPage ? 'pagination-btn active' : 'pagination-btn';
            pageButton.addEventListener('click', () => {
              currentPage = i;
              loadConversations(currentBotId);
            });
            pagination.appendChild(pageButton);
          }
        } else {
          pagination.style.display = 'none';
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
        usersLoadingSpinner.style.display = 'none';
        messagesContent.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء تحميل الرسائل، حاول مرة أخرى لاحقًا';
      }
    }

    async function loadUserMessages(userId, userName, chatContainer) {
      chatContainer.innerHTML = `
        <div class="chat-header">
          <div class="chat-header-left">
            <h3>${userName}</h3>
            <div class="search-in-chat">
              <input type="text" id="searchInChatInput-${userId}" placeholder="ابحث في المحادثة..." />
              <button id="searchInChatBtn-${userId}" class="search-btn">بحث</button>
            </div>
          </div>
          <button id="closeChatBtn-${userId}" class="close-btn">إغلاق</button>
        </div>
        <div class="chat-messages" style="max-height: 400px; overflow-y: auto;"></div>
        <div class="chat-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 10px;">
          <button id="deleteSelectedMessagesBtn-${userId}" class="delete-btn">حذف الرسائل المحددة</button>
          <button class="delete-btn delete-conversation-btn" data-user-id="${userId}">حذف المحادثة</button>
        </div>
      `;
      const chatMessages = chatContainer.querySelector('.chat-messages');
      const searchInChatInput = chatContainer.querySelector(`#searchInChatInput-${userId}`);
      const searchInChatBtn = chatContainer.querySelector(`#searchInChatBtn-${userId}`);
      const closeChatBtn = chatContainer.querySelector(`#closeChatBtn-${userId}`);
      const deleteSelectedMessagesBtn = chatContainer.querySelector(`#deleteSelectedMessagesBtn-${userId}`);

      const userConversations = conversations.filter(conv => conv.userId === userId);
      let messages = userConversations[0].messages.map((msg, index) => ({
        ...msg,
        originalIndex: index // Keep track of the original index for deletion
      }));

      function renderMessages(messagesToShow) {
        chatMessages.innerHTML = '';
        messagesToShow.forEach((msg, index) => {
          const messageDiv = document.createElement('div');
          messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
          messageDiv.style.opacity = '0';
          messageDiv.style.transform = 'translateY(20px)';
          messageDiv.style.display = 'flex';
          messageDiv.style.alignItems = 'center';
          messageDiv.style.gap = '10px';
          messageDiv.innerHTML = `
            <input type="checkbox" class="message-checkbox" data-index="${msg.originalIndex}" style="margin-right: 10px;">
            <div style="flex: 1;">
              <p>${msg.content}</p>
              <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
            </div>
          `;
          chatMessages.appendChild(messageDiv);

          // Animation for showing messages
          setTimeout(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
          }, 100);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      renderMessages(messages);

      // Search in chat
      searchInChatBtn.addEventListener('click', () => {
        const searchTerm = searchInChatInput.value.trim().toLowerCase();
        const filtered = messages.filter(msg => msg.content.toLowerCase().includes(searchTerm));
        renderMessages(filtered);
      });

      searchInChatInput.addEventListener('input', () => {
        if (!searchInChatInput.value.trim()) {
          renderMessages(messages);
        }
      });

      // Close chat
      closeChatBtn.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        currentUserId = '';
      });

      // Delete selected messages
      deleteSelectedMessagesBtn.addEventListener('click', async () => {
        const checkboxes = chatMessages.querySelectorAll('.message-checkbox:checked');
        if (checkboxes.length === 0) {
          alert('يرجى تحديد رسائل لحذفها.');
          return;
        }

        if (confirm('هل أنت متأكد من حذف الرسائل المحددة؟')) {
          try {
            const indicesToDelete = Array.from(checkboxes).map(checkbox => parseInt(checkbox.dataset.index));
            const response = await fetch(`/api/messages/delete-selected/${currentBotId}/${userId}?type=${currentTab}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ messageIndices: indicesToDelete })
            });

            if (!response.ok) {
              throw new Error('فشل في حذف الرسائل المحددة');
            }

            // Update local messages array
            messages = messages.filter(msg => !indicesToDelete.includes(msg.originalIndex));
            userConversations[0].messages = messages; // Update the conversations array
            renderMessages(messages);

            // If no messages left, close the chat
            if (messages.length === 0) {
              chatContainer.style.display = 'none';
              currentUserId = '';
              await loadConversations(currentBotId); // Refresh the user list
            }
          } catch (err) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = err.message || 'حدث خطأ أثناء حذف الرسائل المحددة';
          }
        }
      });

      // Delete entire conversation
      const deleteConversationBtn = chatContainer.querySelector('.delete-conversation-btn');
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

            currentPage = 1; // Reset to first page
            await loadConversations(currentBotId);
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
