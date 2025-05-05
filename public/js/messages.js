
// Define loadMessagesPage globally first to ensure it's available
window.loadMessagesPage = async function() {
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
  const itemsPerPage = 20;
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

      allConversations = await handleApiRequest(`/api/messages/${botId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "فشل جلب المحادثات");

      console.log(`Loaded ${allConversations.length} conversations for ${channel}`);
      currentPage = 1;
      renderConversations();
      showContent();
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
      showError(err.message || "حدث خطأ أثناء جلب المحادثات.");
    }
  }

  function renderConversations() {
    conversationsContainer.innerHTML = "";
    webUserCounter = 1;

    if (allConversations.length === 0) {
      conversationsContainer.innerHTML = '<div class="placeholder">لا توجد محادثات لعرضها لهذه القناة والفترة.</div>';
      paginationContainer.innerHTML = "";
      return;
    }

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
    card.dataset.conversationId = conv._id;

    let userName = conv.username || conv.userId;
    let userIdentifier = conv.userId;

    if (currentChannel === "web" && conv.userId === "anonymous") {
      userName = `زائر ويب ${webUserCounter++}`;
      userIdentifier = `web-${webUserCounter - 1}`;
    } else if (currentChannel === "whatsapp") {
      const phoneMatch = conv.userId.match(/whatsapp_(\d+)/);
      userName = phoneMatch ? `واتساب ${phoneMatch[1]}` : `مستخدم واتساب`;
      userIdentifier = conv.userId;
    } else if (currentChannel === "facebook") {
      userName = conv.username || `فيسبوك ${conv.userId}`;
      userIdentifier = conv.userId;
    }

    userNamesCache[conv._id] = userName;

    const lastMessage = conv.messages[conv.messages.length - 1];
    const lastMessageTimestamp = lastMessage ? new Date(lastMessage.timestamp).toLocaleString("ar-EG") : "لا يوجد";
    // احسب عدد ردود البوت بس
    const messageCount = conv.messages.filter(msg => msg.role === 'assistant').length;

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

    const createPageButton = (pageNumber, text = null, isActive = false, isDisabled = false) => {
      const button = document.createElement("button");
      button.textContent = text || pageNumber;
      button.disabled = isDisabled;
      if (isActive) button.classList.add("active");
      button.addEventListener("click", () => {
        if (!isDisabled && !isActive) {
          currentPage = pageNumber;
          renderConversations();
        }
      });
      return button;
    };

    // Previous Button
    paginationContainer.appendChild(createPageButton(currentPage - 1, 'السابق', false, currentPage === 1));

    // Dynamic page numbers with ellipsis
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxButtons + 1);
    }

    if (startPage > 1) {
      paginationContainer.appendChild(createPageButton(1));
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationContainer.appendChild(createPageButton(i, null, i === currentPage));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
      paginationContainer.appendChild(createPageButton(totalPages));
    }

    // Next Button
    paginationContainer.appendChild(createPageButton(currentPage + 1, 'التالي', false, currentPage === totalPages));
  }

  function openChatModal(conversationId) {
    const conversation = allConversations.find(conv => conv._id === conversationId);
    if (!conversation) return;

    currentOpenConversationId = conversationId;
    const userName = userNamesCache[conversationId] || "مستخدم";
    chatModalTitle.textContent = `محادثة مع ${escapeHtml(userName)}`;
    chatModalBody.innerHTML = "";

    conversation.messages.forEach((msg, index) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${msg.role === "user" ? "user-message" : "bot-message"}`;
      let messageContentHtml = `<p>${escapeHtml(msg.content)}</p><small>${new Date(msg.timestamp).toLocaleString("ar-EG")}</small>`;

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
            <div class="message-actions">
              <button class="btn btn-sm btn-outline-secondary edit-rule-btn" 
                      data-message-index="${index}"
                      data-question="${escapeHtml(precedingUserMessage.content)}" 
                      data-answer="${escapeHtml(msg.content)}">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
            <div class="edit-area" id="edit-area-${index}" style="display: none;">
              <textarea class="form-control edit-textarea" rows="3"></textarea>
              <button class="btn btn-sm btn-primary save-edited-rule-btn">
                <i class="fas fa-save"></i> حفظ كقاعدة جديدة
              </button>
              <button class="btn btn-sm btn-secondary cancel-edit-btn">
                <i class="fas fa-times"></i> إلغاء
              </button>
            </div>`;
        }
      }

      messageDiv.innerHTML = messageContentHtml;
      chatModalBody.appendChild(messageDiv);
    });

    chatModalBody.querySelectorAll(".edit-rule-btn").forEach(button => {
      button.addEventListener("click", handleEditRuleClick);
    });
    chatModalBody.querySelectorAll(".save-edited-rule-btn").forEach(button => {
      button.addEventListener("click", handleSaveEditedRuleClick);
    });
    chatModalBody.querySelectorAll(".cancel-edit-btn").forEach(button => {
      button.addEventListener("click", handleCancelEditClick);
    });

    chatModal.style.display = "flex";
    chatModalBody.scrollTop = chatModalBody.scrollHeight;
  }

  function closeChatModal() {
    chatModal.style.display = "none";
    currentOpenConversationId = null;
  }

  async function deleteSingleConversation() {
    if (!currentOpenConversationId) return;
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    deleteSingleConversationBtn.disabled = true;
    deleteSingleConversationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار الحذف...';

    try {
      await handleApiRequest(`/api/messages/conversation/${currentOpenConversationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "فشل حذف المحادثة");
      alert("تم حذف المحادثة بنجاح.");
      closeChatModal();
      allConversations = allConversations.filter(conv => conv._id !== currentOpenConversationId);
      renderConversations();
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    } finally {
      deleteSingleConversationBtn.disabled = false;
      deleteSingleConversationBtn.innerHTML = '<i class="fas fa-trash-alt"></i> حذف هذه المحادثة';
    }
  }

  async function deleteAllConversationsForChannel() {
    if (!confirm(`هل أنت متأكد من حذف جميع محادثات قناة ${currentChannel}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    deleteAllConversationsBtn.disabled = true;
    deleteAllConversationsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار الحذف...';

    try {
      await handleApiRequest(`/api/messages/${selectedBotId}/channel/${currentChannel}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "فشل حذف المحادثات");
      alert(`تم حذف جميع محادثات قناة ${currentChannel} بنجاح.`);
      allConversations = [];
      renderConversations();
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    } finally {
      deleteAllConversationsBtn.disabled = false;
      deleteAllConversationsBtn.innerHTML = '<i class="fas fa-trash-alt"></i> حذف الكل';
    }
  }

  async function downloadMessagesForChannel() {
    downloadMessagesBtn.disabled = true;
    downloadMessagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار التنزيل...';

    try {
      const params = new URLSearchParams({ type: currentChannel });
      if (startDateFilter.value) params.set("startDate", startDateFilter.value);
      if (endDateFilter.value) params.set("endDate", endDateFilter.value);

      const conversationsToDownload = await handleApiRequest(`/api/messages/${selectedBotId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, errorMessage, "فشل جلب المحادثات للتنزيل");

      if (!Array.isArray(conversationsToDownload) || conversationsToDownload.length === 0) {
        alert(`لا توجد محادثات لقناة ${currentChannel} في الفترة المحددة للتنزيل.`);
        return;
      }

      let txtContent = `سجل محادثات قناة ${currentChannel} للبوت ${selectedBotId}\n`;
      txtContent += `الفترة: ${startDateFilter.value || 'البداية'} إلى ${endDateFilter.value || 'النهاية'}\n`;
      txtContent += "========================================\n\n";

      conversationsToDownload.forEach((conv, index) => {
        let userName = userNamesCache[conv._id] || conv.username || conv.userId || `مستخدم ${index + 1}`;
        txtContent += `--- محادثة مع: ${userName} (ID: ${conv.userId}) ---\n`;
        conv.messages.forEach(msg => {
          const role = msg.role === "user" ? "المستخدم" : "البوت";
          const timestamp = new Date(msg.timestamp).toLocaleString("ar-EG");
          txtContent += `[${timestamp}] ${role}: ${msg.content}\n`;
        });
        txtContent += "\n----------------------------------------\n\n";
      });

      const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const filename = `محادثات_${currentChannel}_${selectedBotId}_${new Date().toISOString().split("T")[0]}.txt`;
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    } finally {
      downloadMessagesBtn.disabled = false;
      downloadMessagesBtn.innerHTML = '<i class="fas fa-download"></i> تنزيل';
    }
  }

  function handleEditRuleClick(event) {
    const button = event.currentTarget;
    const messageIndex = button.dataset.messageIndex;
    const answer = button.dataset.answer;
    const editArea = document.getElementById(`edit-area-${messageIndex}`);
    const textarea = editArea.querySelector(".edit-textarea");

    button.closest(".message-actions").style.display = "none";
    editArea.style.display = "block";
    textarea.value = answer;
    textarea.focus();
  }

  function handleCancelEditClick(event) {
    const button = event.currentTarget;
    const editArea = button.closest(".edit-area");
    const messageActions = editArea.previousElementSibling;

    editArea.style.display = "none";
    if (messageActions && messageActions.classList.contains("message-actions")) {
      messageActions.style.display = "block";
    }
  }

  async function handleSaveEditedRuleClick(event) {
    const saveButton = event.currentTarget;
    const editArea = saveButton.closest(".edit-area");
    const textarea = editArea.querySelector(".edit-textarea");
    const messageActions = editArea.previousElementSibling;
    const editButton = messageActions ? messageActions.querySelector(".edit-rule-btn") : null;

    if (!editButton) {
      alert("خطأ: لم يتم العثور على زر التعديل الأصلي.");
      return;
    }

    const question = editButton.dataset.question;
    const editedAnswer = textarea.value.trim();

    if (!question || !editedAnswer) {
      alert("خطأ: السؤال أو الجواب المعدل فارغ.");
      return;
    }

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جار الحفظ...';
    const cancelButton = editArea.querySelector(".cancel-edit-btn");
    if (cancelButton) cancelButton.disabled = true;

    try {
      await handleApiRequest("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botId: selectedBotId,
          type: "qa",
          content: { question: question, answer: editedAnswer },
          channel: currentChannel
        }),
      }, errorMessage, "فشل حفظ القاعدة");
      alert("تم حفظ القاعدة الجديدة بنجاح!");
      editArea.style.display = "none";
      if (messageActions) messageActions.style.display = "block";
    } catch (err) {
      // الخطأ تم التعامل معه في handleApiRequest
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-save"></i> حفظ كقاعدة جديدة';
      if (cancelButton) cancelButton.disabled = false;
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

  closeChatModalBtn.addEventListener("click", closeChatModal);
  deleteSingleConversationBtn.addEventListener("click", deleteSingleConversation);
  deleteAllConversationsBtn.addEventListener("click", deleteAllConversationsForChannel);
  downloadMessagesBtn.addEventListener("click", downloadMessagesForChannel);

  chatModal.addEventListener("click", (event) => {
    if (event.target === chatModal) {
      closeChatModal();
    }
  });

  // --- Initial Load ---
  fetchConversations(selectedBotId, currentChannel, null, null);
};

  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/\n/g, "<br>");
  }
