document.addEventListener('DOMContentLoaded', () => {
  async function loadMessagesPage() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const selectedBotId = localStorage.getItem('selectedBotId');

    if (!selectedBotId) {
      content.innerHTML = `
        <h2>الرسائل</h2>
        <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
      `;
      return;
    }

    content.innerHTML = `
      <h2>الرسائل</h2>
      <div class="spinner">
        <div class="loader"></div>
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

    let currentBotId = selectedBotId;
    let currentUserId = '';
    let currentTab = 'facebook'; // Default tab
    let conversations = [];
    let userNamesCache = {}; // Cache for Facebook user names
    let webUserCounter = 1; // Counter for web user names
    let currentPage = 1;
    const cardsPerPage = 30;

    // Hide spinner and show content
    spinner.style.display = 'none';
    messagesContent.style.display = 'block';

    await loadConversations(currentBotId);

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

        // لوج عشان نشوف شكل البيانات
        console.log('بيانات المحادثات:', conversations);

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
              // التحقق إذا كان الـ username موجود في بيانات المحادثة نفسها
              const conv = userConversations[0];
              if (conv.username) {
                userName = conv.username;
                userNamesCache[userId] = userName;
              } else {
                // لو مش موجود، نعمل طلب منفصل لجلب الاسم
                try {
                  // افترضنا إن فيه endpoint لجلب بيانات المستخدم
                  const userResponse = await fetch(`/api/users/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  });
                  if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log(`بيانات المستخدم ${userId}:`, userData);
                    userName = userData.username || `مستخدم فيسبوك ${userId}`;
                    userNamesCache[userId] = userName;
                  } else {
                    console.error(`فشل في جلب بيانات المستخدم ${userId}:`, userResponse.status);
                    userName = `مستخدم فيسبوك ${userId}`;
                    userNamesCache[userId] = userName;
                  }
                } catch (err) {
                  console.error(`خطأ في جلب اسم المستخدم ${userId}:`, err);
                  userName = `مستخدم فيسبوك ${userId}`;
                  userNamesCache[userId] = userName;
                }
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
          `;
          userCard.addEventListener('click', () => {
            // Create the chat modal
            const modal = document.createElement('div');
            modal.className = 'chat-modal';
            modal.innerHTML = `
              <div class="chat-modal-content">
                <div class="chat-header">
                  <h3>${userName}</h3>
                  <button id="closeChatBtn-${userId}" class="chat-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-messages"></div>
                <div class="chat-footer">
                  <button class="delete-btn delete-conversation-btn" data-user-id="${userId}">حذف المحادثة</button>
                </div>
              </div>
            `;
            document.body.appendChild(modal);

            const chatMessages = modal.querySelector('.chat-messages');
            const closeChatBtn = modal.querySelector(`#closeChatBtn-${userId}`);
            const deleteConversationBtn = modal.querySelector('.delete-conversation-btn');

            let messages = userConversations[0].messages;

            function renderMessages(messagesToShow) {
              chatMessages.innerHTML = '';
              messagesToShow.forEach((msg, index) => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(20px)';
                let messageContent = `
                  <p>${msg.content}</p>
                  <small>${new Date(msg.timestamp).toLocaleString('ar-EG')}</small>
                `;
                // Add edit button for bot messages
                if (msg.role === 'assistant') {
                  messageContent += `
                    <button class="edit-btn" data-message-index="${index}" style="margin-left: 10px; padding: 5px 10px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">تعديل</button>
                  `;
                }
                messageDiv.innerHTML = messageContent;
                chatMessages.appendChild(messageDiv);

                // Animation for showing messages
                setTimeout(() => {
                  messageDiv.style.transition = 'all 0.3s ease';
                  messageDiv.style.opacity = '1';
                  messageDiv.style.transform = 'translateY(0)';
                }, 100);

                // Add event listener for edit button
                if (msg.role === 'assistant') {
                  const editBtn = messageDiv.querySelector('.edit-btn');
                  editBtn.addEventListener('click', () => {
                    const messageP = messageDiv.querySelector('p');
                    const originalContent = messageP.textContent;
                    messageP.innerHTML = `
                      <textarea class="edit-textarea" style="width: 100%; min-height: 100px;">${originalContent}</textarea>
                      <button class="save-rule-btn" style="margin-top: 10px; padding: 5px 10px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">حفظ قاعدة جديدة</button>
                    `;
                    editBtn.style.display = 'none';

                    const saveRuleBtn = messageDiv.querySelector('.save-rule-btn');
                    saveRuleBtn.addEventListener('click', async () => {
                      const textarea = messageDiv.querySelector('.edit-textarea');
                      const newContent = textarea.value.trim();
                      if (!newContent) {
                        alert('يرجى إدخال محتوى صالح للقاعدة');
                        return;
                      }

                      // Find the previous user message as the question
                      let question = '';
                      for (let i = index - 1; i >= 0; i--) {
                        if (messages[i].role === 'user') {
                          question = messages[i].content;
                          break;
                        }
                      }
                      if (!question) {
                        alert('لم يتم العثور على سؤال من المستخدم لهذا الرد');
                        return;
                      }

                      // Save the new rule
                      try {
                        const response = await fetch('/api/rules', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            botId: currentBotId,
                            type: 'qa',
                            content: { question, answer: newContent },
                          }),
                        });
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || 'فشل في حفظ القاعدة');
                        }
                        alert('تم حفظ القاعدة بنجاح');
                        // Restore the message display
                        messageP.innerHTML = newContent;
                        editBtn.style.display = 'inline-block';
                        saveRuleBtn.remove();
                      } catch (err) {
                        console.error('خطأ في حفظ القاعدة:', err);
                        alert(`خطأ في حفظ القاعدة: ${err.message}`);
                      }
                    });
                  });
                }
              });

              // Scroll to bottom
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            renderMessages(messages);

            // Close chat modal
            closeChatBtn.addEventListener('click', () => {
              modal.remove();
              currentUserId = '';
            });

            // Delete entire conversation
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
                  modal.remove();
                  await loadConversations(currentBotId);
                } catch (err) {
                  errorDiv.style.display = 'block';
                  errorDiv.textContent = err.message || 'حدث خطأ أثناء حذف المحادثة';
                }
              }
            });
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
  }

  // Define the function globally so dashboard.js can call it
  window.loadMessagesPage = loadMessagesPage;
});
