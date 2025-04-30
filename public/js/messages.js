// public/js/messages.js (Updated for new dashboard design)

document.addEventListener("DOMContentLoaded", () => {
  async function loadMessagesPage() {
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

    if (!selectedBotId) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
          <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض الرسائل.</p>
        </div>
      `;
      return;
    }

    if (!token) {
        content.innerHTML = `
          <div class="placeholder error">
            <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
            <p>يرجى تسجيل الدخول لعرض الرسائل.</p>
          </div>
        `;
        return;
    }

    // Main structure for the messages page
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-envelope"></i> سجل الرسائل</h2>
        <div class="header-actions filter-group">
          <label for="startDateFilter">من:</label>
          <input type="date" id="startDateFilter" class="form-control form-control-sm">
          <label for="endDateFilter">إلى:</label>
          <input type="date" id="endDateFilter" class="form-control form-control-sm">
          <button id="applyFilterBtn" class="btn btn-secondary btn-sm"><i class="fas fa-filter"></i> تطبيق</button>
          <button id="resetFilterBtn" class="btn btn-outline-secondary btn-sm"><i class="fas fa-undo"></i> إعادة تعيين</button>
        </div>
      </div>

      <div class="tabs-container">
        <div class="tabs">
          <button id="facebookMessagesTab" class="tab-button active" data-channel="facebook"><i class="fab fa-facebook-square"></i> فيسبوك</button>
          <button id="webMessagesTab" class="tab-button" data-channel="web"><i class="fas fa-globe"></i> ويب</button>
          <button id="whatsappMessagesTab" class="tab-button" data-channel="whatsapp"><i class="fab fa-whatsapp"></i> واتساب</button>
        </div>
        <div class="tab-actions">
           <button id="downloadMessagesBtn" class="btn btn-secondary btn-sm" title="تنزيل رسائل القناة الحالية (TXT)"><i class="fas fa-download"></i> تنزيل</button>
           <button id="deleteAllConversationsBtn" class="btn btn-danger btn-sm" title="حذف كل محادثات القناة الحالية"><i class="fas fa-trash-alt"></i> حذف الكل</button>
        </div>
      </div>

      <div id="loadingSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
      <div id="errorMessage" class="error-message" style="display: none;"></div>

      <div id="conversationsContainer" class="conversations-grid"></div>
      <div id="pagination" class="pagination"></div>

      <!-- Chat Modal Structure (initially hidden) -->
      <div id="chatModal" class="modal" style="display: none;">
        <div class="modal-content chat-modal-content">
          <div class="modal-header chat-header">
            <h3 id="chatModalTitle">محادثة</h3>
            <button id="closeChatModalBtn" class="close-button">&times;</button>
          </div>
          <div id="chatModalBody" class="modal-body chat-messages"></div>
          <div class="modal-footer chat-footer">
            <button id="deleteSingleConversationBtn" class="btn btn-danger"><i class="fas fa-trash-alt"></i> حذف هذه المحادثة</button>
          </div>
        </div>
      </div>
    `;

    // --- Element References ---
    const loadingSpinner = document.getElementById("loadingSpinner");
    const errorMessage = document.getElementById("errorMessage");
    const conversationsContainer = document.getElementById("conversationsContainer");
    const paginationContainer = document.getElementById("pagination");
    const tabs = document.querySelectorAll(".tab-button");
    const startDateFilter = document.getElementById("startDateFilter");
    const endDateFilter = document.getElementById("endDateFilter");
    const applyFilterBtn = document.getElementById("applyFilterBtn");
    const resetFilterBtn = document.getElementById("resetFilterBtn");
    const downloadMessagesBtn = document.getElementById("downloadMessagesBtn");
    const deleteAllConversationsBtn = document.getElementById("deleteAllConversationsBtn");

    // Chat Modal Elements
    const chatModal = document.getElementById("chatModal");
    const chatModalTitle = document.getElementById("chatModalTitle");
    const chatModalBody = document.getElementById("chatModalBody");
    const closeChatModalBtn = document.getElementById("closeChatModalBtn");
    const deleteSingleConversationBtn = document.getElementById("deleteSingleConversationBtn");

    // --- State Variables ---
    let currentChannel = "facebook";
    let allConversations = [];
    let userNamesCache = {};
    let webUserCounter = 1;
    let currentPage = 1;
    const itemsPerPage = 12; // Number of conversation cards per page
    let currentOpenConversationId = null;

    // --- Functions ---

    function showLoading() {
        loadingSpinner.style.display = "flex";
        conversationsContainer.style.display = "none";
        paginationContainer.style.display = "none";
        errorMessage.style.display = "none";
    }

    function showError(message) {
        loadingSpinner.style.display = "none";
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }

    function showContent() {
        loadingSpinner.style.display = "none";
        errorMessage.style.display = "none";
        conversationsContainer.style.display = "grid";
        paginationContainer.style.display = "flex";
    }

    async function fetchConversations(botId, channel, startDate, endDate) {
        showLoading();
        try {
            const params = new URLSearchParams({ type: channel });
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const response = await fetch(`/api/messages/${botId}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) throw new Error("فشل جلب المحادثات");

            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("بيانات غير متوقعة من الخادم");

            allConversations = data;
            console.log(`Loaded ${allConversations.length} conversations for ${channel}`);
            currentPage = 1; // Reset page on new data load
            renderConversations();
            showContent();
        } catch (err) {
            console.error("Error fetching conversations:", err);
            showError(err.message || "حدث خطأ أثناء جلب المحادثات.");
            if (err.message === "جلسة غير صالحة") logoutUser();
        }
    }

    function renderConversations() {
        conversationsContainer.innerHTML = "";
        webUserCounter = 1; // Reset web user counter for each render

        if (allConversations.length === 0) {
            conversationsContainer.innerHTML = 
`<div class="placeholder">لا توجد محادثات لعرضها لهذه القناة والفترة.</div>`;
            paginationContainer.innerHTML = "";
            return;
        }

        // Sort conversations by the timestamp of their latest message (newest first)
        const sortedConversations = [...allConversations].sort((a, b) => {
            const lastMsgA = a.messages[a.messages.length - 1]?.timestamp;
            const lastMsgB = b.messages[b.messages.length - 1]?.timestamp;
            return new Date(lastMsgB || 0) - new Date(lastMsgA || 0);
        });

        const totalItems = sortedConversations.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedConversations = sortedConversations.slice(startIndex, endIndex);

        paginatedConversations.forEach(conv => {
            const card = createConversationCard(conv);
            conversationsContainer.appendChild(card);
        });

        renderPagination(totalPages);
    }

    function createConversationCard(conv) {
        const card = document.createElement("div");
        card.className = "card conversation-card";
        card.dataset.conversationId = conv._id; // Use conversation ID

        let userName = conv.username || conv.userId;
        let userIdentifier = conv.userId;

        if (currentChannel === "web" && conv.userId === "anonymous") {
            userName = `زائر ويب ${webUserCounter++}`;
            userIdentifier = `web-${webUserCounter - 1}`; // Unique identifier for web users
        } else if (currentChannel === "whatsapp") {
            // Extract number if possible, otherwise use generic name
            const phoneMatch = conv.userId.match(/whatsapp_(\d+)/);
            userName = phoneMatch ? `واتساب ${phoneMatch[1]}` : `مستخدم واتساب`;
            userIdentifier = conv.userId;
        } else if (currentChannel === "facebook") {
            userName = conv.username || `فيسبوك ${conv.userId}`;
            userIdentifier = conv.userId;
        }

        userNamesCache[conv._id] = userName; // Cache name against conversation ID

        const lastMessage = conv.messages[conv.messages.length - 1];
        const lastMessageTimestamp = lastMessage ? new Date(lastMessage.timestamp).toLocaleString("ar-EG") : "لا يوجد";
        const messageCount = conv.messages.length;

        card.innerHTML = `
            <div class="card-body">
                <h4 class="card-title"><i class="fas fa-user"></i> ${escapeHtml(userName)}</h4>
                <p class="card-text"><small>المعرف: ${escapeHtml(userIdentifier)}</small></p>
                <p class="card-text">عدد الرسائل: ${messageCount}</p>
                <p class="card-text">آخر رسالة: ${lastMessageTimestamp}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-primary view-chat-btn"><i class="fas fa-eye"></i> عرض المحادثة</button>
            </div>
        `;

        card.querySelector(".view-chat-btn").addEventListener("click", () => openChatModal(conv._id));
        return card;
    }

    function renderPagination(totalPages) {
        paginationContainer.innerHTML = "";
        if (totalPages <= 1) return;

        // Previous Button
        const prevButton = document.createElement("button");
        prevButton.innerHTML = "&laquo;";
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderConversations();
            }
        });
        paginationContainer.appendChild(prevButton);

        // Page Numbers (simplified for brevity, consider adding ellipsis for many pages)
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement("button");
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            if (i === currentPage) pageButton.classList.add("active");
            pageButton.addEventListener("click", () => {
                currentPage = i;
                renderConversations();
            });
            paginationContainer.appendChild(pageButton);
        }

        // Next Button
        const nextButton = document.createElement("button");
        nextButton.innerHTML = "&raquo;";
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderConversations();
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    function openChatModal(conversationId) {
        const conversation = allConversations.find(conv => conv._id === conversationId);
        if (!conversation) return;

        currentOpenConversationId = conversationId;
        const userName = userNamesCache[conversationId] || "مستخدم";
        chatModalTitle.textContent = `محادثة مع ${escapeHtml(userName)}`;
        chatModalBody.innerHTML = ""; // Clear previous messages

        conversation.messages.forEach((msg, index) => {
            const messageDiv = document.createElement("div");
            messageDiv.className = `message ${msg.role === "user" ? "user-message" : "bot-message"}`;
            let messageContentHtml = `<p>${escapeHtml(msg.content)}</p><small>${new Date(msg.timestamp).toLocaleString("ar-EG")}</small>`;

            // Add "Save as Rule" button for bot messages, linking to the preceding user message
            if (msg.role === "assistant" && index > 0) {
                let precedingUserMessage = null;
                for (let i = index - 1; i >= 0; i--) {
                    if (conversation.messages[i].role === "user") {
                        precedingUserMessage = conversation.messages[i];
                        break;
                    }
                }
                if (precedingUserMessage) {
                    messageContentHtml += `
                        <button class="btn btn-sm btn-secondary save-rule-btn" 
                                data-question="${escapeHtml(precedingUserMessage.content)}" 
                                data-answer="${escapeHtml(msg.content)}">
                            <i class="fas fa-plus"></i> حفظ كقاعدة
                        </button>`;
                }
            }

            messageDiv.innerHTML = messageContentHtml;
            chatModalBody.appendChild(messageDiv);
        });

        // Add event listeners for "Save as Rule" buttons within the modal
        chatModalBody.querySelectorAll(".save-rule-btn").forEach(button => {
            button.addEventListener("click", handleSaveRuleClick);
        });

        chatModal.style.display = "flex";
        chatModalBody.scrollTop = chatModalBody.scrollHeight; // Scroll to bottom
    }

    function closeChatModal() {
        chatModal.style.display = "none";
        currentOpenConversationId = null;
    }

    async function handleSaveRuleClick(event) {
        const button = event.currentTarget;
        const question = button.dataset.question;
        const answer = button.dataset.answer;

        if (!question || !answer) {
            alert("خطأ: لم يتم العثور على السؤال أو الجواب.");
            return;
        }

        // Simple prompt for confirmation or modification (Could be a modal)
        const confirmedAnswer = prompt("تأكيد أو تعديل الجواب للقاعدة الجديدة؟", answer);
        if (confirmedAnswer === null) return; // User cancelled

        button.disabled = true;
        button.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار الحفظ...`;

        try {
            const response = await fetch("/api/rules", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    botId: selectedBotId,
                    type: "qa", // Default to QA rule type
                    content: { question: question, answer: confirmedAnswer },
                    channel: currentChannel // Optional: associate rule with channel?
                }),
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "فشل حفظ القاعدة");
            }

            alert("تم حفظ القاعدة بنجاح!");
            button.innerHTML = 
`<i class="fas fa-check"></i> تم الحفظ`;
            // Optionally remove the button or change its state permanently

        } catch (err) {
            console.error("Error saving rule:", err);
            alert(`خطأ: ${err.message}`);
            button.innerHTML = 
`<i class="fas fa-plus"></i> حفظ كقاعدة`; // Reset button text
            if (err.message === "جلسة غير صالحة") logoutUser();
        } finally {
            button.disabled = false; // Re-enable button unless permanently changed
        }
    }

    async function deleteConversation(conversationId) {
        if (!conversationId) return;
        if (!confirm("هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.")) return;

        // Show loading state (e.g., disable button)
        deleteSingleConversationBtn.disabled = true;
        deleteSingleConversationBtn.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار الحذف...`;

        try {
            const response = await fetch(`/api/messages/${conversationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "فشل حذف المحادثة");
            }

            alert("تم حذف المحادثة بنجاح.");
            closeChatModal();
            // Refresh the conversation list
            await fetchConversations(selectedBotId, currentChannel, startDateFilter.value, endDateFilter.value);

        } catch (err) {
            console.error("Error deleting conversation:", err);
            alert(`خطأ: ${err.message}`);
            if (err.message === "جلسة غير صالحة") logoutUser();
        } finally {
            // Reset button state
            deleteSingleConversationBtn.disabled = false;
            deleteSingleConversationBtn.innerHTML = 
`<i class="fas fa-trash-alt"></i> حذف هذه المحادثة`;
        }
    }

    async function deleteAllChannelConversations() {
        if (!confirm(`هل أنت متأكد من حذف جميع محادثات قناة ${currentChannel}؟ لا يمكن التراجع.`)) return;

        deleteAllConversationsBtn.disabled = true;
        deleteAllConversationsBtn.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار الحذف...`;

        try {
            const response = await fetch(`/api/messages/delete-all/${selectedBotId}?type=${currentChannel}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "فشل حذف المحادثات");
            }

            alert(`تم حذف جميع محادثات قناة ${currentChannel} بنجاح.`);
            await fetchConversations(selectedBotId, currentChannel, startDateFilter.value, endDateFilter.value);

        } catch (err) {
            console.error("Error deleting all conversations:", err);
            alert(`خطأ: ${err.message}`);
            if (err.message === "جلسة غير صالحة") logoutUser();
        } finally {
            deleteAllConversationsBtn.disabled = false;
            deleteAllConversationsBtn.innerHTML = 
`<i class="fas fa-trash-alt"></i> حذف الكل`;
        }
    }

    async function downloadChannelMessages() {
        downloadMessagesBtn.disabled = true;
        downloadMessagesBtn.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار التنزيل...`;

        try {
            // Construct the URL with potential date filters
            const params = new URLSearchParams({ type: currentChannel });
            const startDate = startDateFilter.value;
            const endDate = endDateFilter.value;
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const response = await fetch(`/api/messages/download/${selectedBotId}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) throw new Error("جلسة غير صالحة");
            if (!response.ok) {
                 // Try to get error message from JSON response if possible
                try {
                    const errData = await response.json();
                    throw new Error(errData.message || `فشل تنزيل الرسائل (${response.status})`);
                } catch (e) {
                    throw new Error(`فشل تنزيل الرسائل (${response.status})`);
                }
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                alert("لا توجد رسائل للتنزيل لهذه القناة والفترة.");
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `messages_${currentChannel}_${selectedBotId}_${new Date().toISOString().split("T")[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (err) {
            console.error("Error downloading messages:", err);
            alert(`خطأ: ${err.message}`);
            if (err.message === "جلسة غير صالحة") logoutUser();
        } finally {
            downloadMessagesBtn.disabled = false;
            downloadMessagesBtn.innerHTML = 
`<i class="fas fa-download"></i> تنزيل`;
        }
    }

    // --- Event Listeners Setup ---
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentChannel = tab.dataset.channel;
            fetchConversations(selectedBotId, currentChannel, startDateFilter.value, endDateFilter.value);
        });
    });

    applyFilterBtn.addEventListener("click", () => {
        fetchConversations(selectedBotId, currentChannel, startDateFilter.value, endDateFilter.value);
    });

    resetFilterBtn.addEventListener("click", () => {
        startDateFilter.value = "";
        endDateFilter.value = "";
        fetchConversations(selectedBotId, currentChannel, null, null);
    });

    deleteAllConversationsBtn.addEventListener("click", deleteAllChannelConversations);
    downloadMessagesBtn.addEventListener("click", downloadChannelMessages);

    // Chat Modal Listeners
    closeChatModalBtn.addEventListener("click", closeChatModal);
    deleteSingleConversationBtn.addEventListener("click", () => deleteConversation(currentOpenConversationId));
    // Close modal if clicking outside the content
    chatModal.addEventListener("click", (event) => {
        if (event.target === chatModal) {
            closeChatModal();
        }
    });

    // --- Initial Load ---
    await fetchConversations(selectedBotId, currentChannel, null, null);
  }

  // Helper function to escape HTML
  function escapeHtml(unsafe) {
      if (typeof unsafe !== "string") return unsafe;
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/
/g, "<br>"); // Replace newlines with <br> for display
   }

  // Make loadMessagesPage globally accessible
  window.loadMessagesPage = loadMessagesPage;
});

