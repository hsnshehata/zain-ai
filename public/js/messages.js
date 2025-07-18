// public/js/messages.js
console.log("messages.js script started loading at", new Date().toISOString());

try {
  window.loadMessagesPage = async function () {
    console.log(
      "loadMessagesPage function defined and called at",
      new Date().toISOString()
    );

    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

    if (!selectedBotId) {
      console.log("No selectedBotId found, rendering error message...");
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
          <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض الرسائل.</p>
        </div>
      `;
      return;
    }

    if (!token) {
      console.log("No token found, rendering error message...");
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض الرسائل.</p>
        </div>
      `;
      return;
    }

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
          <button id="instagramMessagesTab" class="tab-button" data-channel="instagram"><i class="fab fa-instagram"></i> إنستجرام</button>
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
            <button id="closeChatModalBtn" class="close-button">×</button>
          </div>
          <div id="chatModalBody" class="modal-body chat-messages"></div>
          <div class="modal-footer chat-footer">
            <button id="deleteSingleConversationBtn" class="btn btn-danger"><i class="fas fa-trash-alt"></i> حذف هذه المحادثة</button>
          </div>
        </div>
      </div>
    `;

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
    const chatModal = document.getElementById("chatModal");
    const chatModalTitle = document.getElementById("chatModalTitle");
    const chatModalBody = document.getElementById("chatModalBody");
    const closeChatModalBtn = document.getElementById("closeChatModalBtn");
    const deleteSingleConversationBtn = document.getElementById("deleteSingleConversationBtn");

    let currentChannel = "facebook";
    let conversations = [];
    let userNamesCache = {};
    let webUserCounter = 1;
    let currentPage = 1;
    const itemsPerPage = 20;
    let totalPages = 1;
    let currentOpenConversationId = null;
    let currentOpenUserId = null;

    function showLoading() {
      console.log("showLoading called...");
      loadingSpinner.style.display = "flex";
      conversationsContainer.style.display = "none";
      paginationContainer.style.display = "none";
      errorMessage.style.display = "none";
    }

    function showError(message) {
      console.log("showError called with message:", message);
      loadingSpinner.style.display = "none";
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
    }

    function showContent() {
      console.log("showContent called...");
      loadingSpinner.style.display = "none";
      errorMessage.style.display = "none";
      conversationsContainer.style.display = "grid";
      paginationContainer.style.display = "flex";
    }

    async function fetchConversations(botId, channel, startDate, endDate, page = 1) {
      console.log(
        "fetchConversations called with botId:",
        botId,
        "channel:",
        channel,
        "page:",
        page
      );
      showLoading();
      try {
        const params = new URLSearchParams({
          type: channel,
          page: page,
          limit: itemsPerPage,
        });
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const response = await handleApiRequest(
          `/api/messages/${botId}?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
          errorMessage,
          "فشل جلب المحادثات"
        );

        conversations = response.conversations || [];
        totalPages = response.totalPages || 1;
        currentPage = response.currentPage || 1;

        console.log(
          `Loaded ${conversations.length} conversations for ${channel}, total pages: ${totalPages} on page ${currentPage}`
        );
        renderConversations();
        showContent();
      } catch (err) {
        showError(err.message || "حدث خطأ أثناء جلب المحادثات.");
      }
    }

    function renderConversations() {
      console.log("renderConversations called...");
      conversationsContainer.innerHTML = "";
      webUserCounter = 1;

      if (conversations.length === 0) {
        conversationsContainer.innerHTML =
          '<div class="placeholder">لا توجد محادثات لعرضها لهذه القناة والفترة.</div>';
        paginationContainer.innerHTML = "";
        return;
      }

      conversations.forEach((conv) => {
        const card = createConversationCard(conv);
        if (card) { // Check if card is not null before appending
          conversationsContainer.appendChild(card);
        }
      });

      renderPagination(totalPages);
    }

    function createConversationCard(conv) {
      console.log("createConversationCard called for conversation:", conv._id);
      const card = document.createElement("div");
      card.className = "card conversation-card";
      card.dataset.conversationId = conv._id;
      card.dataset.userId = conv.userId;

      let userName = conv.username || conv.userId;
      let userIdentifier = conv.userId;
      let iconClass = "fas fa-envelope";

      if (currentChannel === "web") {
        // Check if userId contains @c.us, if so, skip this conversation
        if (conv.userId.includes("@c.us")) {
          return null; // Skip rendering this conversation in web channel
        }
        userName = conv.username || `زائر ويب ${webUserCounter++}`;
        userIdentifier = conv.userId.replace("web_", "web-");
        iconClass = "fas fa-globe";
      } else if (currentChannel === "instagram") {
        if (conv.userId.startsWith("instagram_comment_")) {
          userName =
            conv.username ||
            `تعليق إنستجرام ${conv.userId.replace("instagram_comment_", "")}`;
          userIdentifier = conv.userId;
          iconClass = "fas fa-comment";
        } else {
          userName =
            conv.username ||
            `إنستجرام ${conv.userId.replace("instagram_", "")}`;
          userIdentifier = conv.userId;
        }
      } else if (currentChannel === "facebook") {
        if (conv.userId.startsWith("facebook_comment_")) {
          userName =
            conv.username ||
            `تعليق فيسبوك ${conv.userId.replace("facebook_comment_", "")}`;
          userIdentifier = conv.userId;
          iconClass = "fas fa-comment";
        } else {
          userName =
            conv.username || `فيسبوك ${conv.userId.replace("facebook_", "")}`;
          userIdentifier = conv.userId;
        }
      } else if (currentChannel === "whatsapp") {
        // Extract phone number from userId if it contains @c.us
        if (conv.userId.includes("@c.us")) {
          const phoneNumber = conv.userId.split("@c.us")[0];
          userName = conv.username || phoneNumber;
          userIdentifier = conv.userId;
        } else {
          userName =
            conv.username || `واتساب ${conv.userId.replace("whatsapp_", "")}`;
          userIdentifier = conv.userId;
        }
        iconClass = "fab fa-whatsapp";
      }

      userNamesCache[conv._id] = userName;

      const lastMessage = conv.messages[conv.messages.length - 1];
      const lastMessageTimestamp = lastMessage
        ? new Date(lastMessage.timestamp).toLocaleString("ar-EG")
        : "لا يوجد";
      const messageCount = conv.messages.filter(
        (msg) => msg.role === "assistant"
      ).length;

      card.innerHTML = `
        <div class="card-body">
          <h4 class="card-title"><i class="${iconClass}"></i> ${escapeHtml(
        userName
      )}</h4>
          <p class="card-text"><small>المعرف: ${escapeHtml(
            userIdentifier
          )}</small></p>
          <p class="card-text">عدد الرسائل: ${messageCount}</p>
          <p class="card-text">آخر رسالة: ${lastMessageTimestamp}</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-primary view-chat-btn"><i class="fas fa-eye"></i> عرض المحادثة</button>
        </div>
      `;

      card.querySelector(".view-chat-btn").addEventListener("click", () =>
        openChatModal(conv._id, conv.userId)
      );
      return card;
    }

    function renderPagination(totalPages) {
      console.log("renderPagination called with totalPages:", totalPages);
      paginationContainer.innerHTML = "";
      if (totalPages <= 1) return;

      const createPageButton = (
        pageNumber,
        text = null,
        isActive = false,
        isDisabled = false
      ) => {
        const button = document.createElement("button");
        button.textContent = text || pageNumber;
        button.disabled = isDisabled;
        if (isActive) button.classList.add("active");
        button.addEventListener("click", () => {
          if (!isDisabled && !isActive) {
            currentPage = pageNumber;
            fetchConversations(
              selectedBotId,
              currentChannel,
              startDateFilter.value,
              endDateFilter.value,
              currentPage
            );
          }
        });
        return button;
      };

      paginationContainer.appendChild(
        createPageButton(currentPage - 1, "السابق", false, currentPage === 1)
      );

      const maxButtons = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - maxButtons + 1);
      }

      if (startPage > 1) {
        paginationContainer.appendChild(createPageButton(1));
        if (startPage > 2) {
          const ellipsis = document.createElement("span");
          ellipsis.textContent = "...";
          paginationContainer.appendChild(ellipsis);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(
          createPageButton(i, null, i === currentPage)
        );
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const ellipsis = document.createElement("span");
          ellipsis.textContent = "...";
          paginationContainer.appendChild(ellipsis);
        }
        paginationContainer.appendChild(createPageButton(totalPages));
      }

      paginationContainer.appendChild(
        createPageButton(
          currentPage + 1,
          "التالي",
          false,
          currentPage === totalPages
        )
      );
    }

    function openChatModal(conversationId, userId) {
      console.log(
        "openChatModal called with conversationId:",
        conversationId,
        "userId:",
        userId
      );
      const conversation = conversations.find((conv) => conv._id === conversationId);
      if (!conversation) {
        console.error(`Conversation with ID ${conversationId} not found`);
        return;
      }

      currentOpenConversationId = conversationId;
      currentOpenUserId = userId;
      console.log(
        `Opening chat modal for conversation ${conversationId}, user ${currentOpenUserId}`
      );

      const userName = userNamesCache[conversationId] || "مستخدم";
      chatModalTitle.textContent = `محادثة مع ${escapeHtml(userName)}`;
      chatModalBody.innerHTML = "";

      conversation.messages.forEach((msg, index) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${
          msg.role === "user" ? "user-message" : "bot-message"
        }`;
        let messageContentHtml = `<p>${escapeHtml(
          msg.content
        )}</p><small>${new Date(msg.timestamp).toLocaleString("ar-EG")}</small>`;

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

      chatModalBody.querySelectorAll(".edit-rule-btn").forEach((button) => {
        button.addEventListener("click", handleEditRuleClick);
      });
      chatModalBody.querySelectorAll(".save-edited-rule-btn").forEach((button) => {
        button.addEventListener("click", handleSaveEditedRuleClick);
      });
      chatModalBody.querySelectorAll(".cancel-edit-btn").forEach((button) => {
        button.addEventListener("click", handleCancelEditClick);
      });

      chatModal.style.display = "flex";
      chatModalBody.scrollTop = chatModalBody.scrollHeight;
    }

    function closeChatModal() {
      console.log("closeChatModal called...");
      chatModal.style.display = "none";
      currentOpenConversationId = null;
      currentOpenUserId = null;
      console.log(
        "Chat modal closed, cleared currentOpenConversationId and currentOpenUserId"
      );
    }

    async function deleteSingleConversation() {
      console.log("deleteSingleConversation called...");
      console.log(
        `currentOpenConversationId: ${currentOpenConversationId}, currentOpenUserId: ${currentOpenUserId}`
      );

      if (!currentOpenConversationId || !currentOpenUserId) {
        console.error(
          "Cannot delete conversation: currentOpenConversationId or currentOpenUserId is not set"
        );
        alert("خطأ: لا يمكن حذف المحادثة، يرجى فتح المحادثة أولاً.");
        return;
      }

      if (
        !confirm(
          "هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء."
        )
      )
        return;

      deleteSingleConversationBtn.disabled = true;
      deleteSingleConversationBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جار الحذف...';

      try {
        console.log(
          `Attempting to delete conversation for bot ${selectedBotId}, user ${currentOpenUserId}, channel ${currentChannel}`
        );
        await handleApiRequest(
          `/api/messages/delete-user/${selectedBotId}/${currentOpenUserId}?type=${currentChannel}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
          errorMessage,
          "فشل حذف المحادثة"
        );
        alert("تم حذف المحادثة بنجاح.");
        closeChatModal();
        conversations = conversations.filter(
          (conv) => conv._id !== currentOpenConversationId
        );
        renderConversations();
      } catch (err) {
        console.error("Error deleting single conversation:", err.message);
        alert(`خطأ في حذف المحادثة: ${err.message}`);
      } finally {
        deleteSingleConversationBtn.disabled = false;
        deleteSingleConversationBtn.innerHTML =
          '<i class="fas fa-trash-alt"></i> حذف هذه المحادثة';
      }
    }

    async function deleteAllConversationsForChannel() {
      console.log("deleteAllConversationsForChannel called...");
      if (
        !confirm(
          `هل أنت متأكد من حذف جميع محادثات قناة ${currentChannel}؟ لا يمكن التراجع عن هذا الإجراء.`
        )
      )
        return;

      deleteAllConversationsBtn.disabled = true;
      deleteAllConversationsBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جار الحذف...';

      try {
        console.log(
          `Attempting to delete all conversations for bot ${selectedBotId}, channel ${currentChannel}`
        );
        await handleApiRequest(
          `/api/messages/delete-all/${selectedBotId}?type=${currentChannel}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
          errorMessage,
          "فشل حذف المحادثات"
        );
        alert(`تم حذف جميع محادثات قناة ${currentChannel} بنجاح.`);
        conversations = [];
        renderConversations();
      } catch (err) {
        console.error("Error deleting all conversations:", err.message);
        alert(`خطأ في حذف المحادثات: ${err.message}`);
      } finally {
        deleteAllConversationsBtn.disabled = false;
        deleteAllConversationsBtn.innerHTML =
          '<i class="fas fa-trash-alt"></i> حذف الكل';
      }
    }

    async function downloadMessagesForChannel() {
      console.log("downloadMessagesForChannel called...");
      downloadMessagesBtn.disabled = true;
      downloadMessagesBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جار التنزيل...';

      try {
        const params = new URLSearchParams({ type: currentChannel });
        if (startDateFilter.value) params.set("startDate", startDateFilter.value);
        if (endDateFilter.value) params.set("endDate", endDateFilter.value);

        const conversationsToDownload = await handleApiRequest(
          `/api/messages/${selectedBotId}?${params.toString()}&page=1&limit=1000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
          errorMessage,
          "فشل جلب المحادثات للتنزيل"
        );

        const conversationsArray = conversationsToDownload.conversations || [];

        if (!Array.isArray(conversationsArray) || conversationsArray.length === 0) {
          alert(
            `لا توجد محادثات لقناة ${currentChannel} في الفترة المحددة للتنزيل.`
          );
          return;
        }

        let txtContent = `سجل محادثات قناة ${currentChannel} للبوت ${selectedBotId}\n`;
        txtContent += `الفترة: ${startDateFilter.value || "البداية"} إلى ${
          endDateFilter.value || "النهاية"
        }\n`;
        txtContent += "========================================\n\n";

        conversationsArray.forEach((conv, index) => {
          let userName =
            userNamesCache[conv._id] ||
            conv.username ||
            conv.userId ||
            `مستخدم ${index + 1}`;
          txtContent += `--- محادثة مع: ${userName} (ID: ${conv.userId}) ---\n`;
          conv.messages.forEach((msg) => {
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
        const filename = `محادثات_${currentChannel}_${selectedBotId}_${new Date()
          .toISOString()
          .split("T")[0]}.txt`;
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error downloading messages:", err.message);
        alert(`خطأ في تنزيل المحادثات: ${err.message}`);
      } finally {
        downloadMessagesBtn.disabled = false;
        downloadMessagesBtn.innerHTML = '<i class="fas fa-download"></i> تنزيل';
      }
    }

    function handleEditRuleClick(event) {
      console.log("handleEditRuleClick called...");
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
      console.log("handleCancelEditClick called...");
      const button = event.currentTarget;
      const editArea = button.closest(".edit-area");
      const messageActions = editArea.previousElementSibling;

      editArea.style.display = "none";
      if (messageActions && messageActions.classList.contains("message-actions")) {
        messageActions.style.display = "block";
      }
    }

    async function handleSaveEditedRuleClick(event) {
      console.log("handleSaveEditedRuleClick called...");
      const saveButton = event.currentTarget;
      const editArea = saveButton.closest(".edit-area");
      const textarea = editArea.querySelector(".edit-textarea");
      const messageActions = editArea.previousElementSibling;
      const editButton = messageActions
        ? messageActions.querySelector(".edit-rule-btn")
        : null;

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
        await handleApiRequest(
          "/api/rules",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              botId: selectedBotId,
              type: "qa",
              content: { question: question, answer: editedAnswer },
              channel: currentChannel,
            }),
          },
          errorMessage,
          "فشل حفظ القاعدة"
        );
        alert("تم حفظ القاعدة الجديدة بنجاح!");
        editArea.style.display = "none";
        if (messageActions) messageActions.style.display = "block";
      } catch (err) {
        console.error("Error saving edited rule:", err.message);
        alert(`خطأ في حفظ القاعدة: ${err.message}`);
      } finally {
        saveButton.disabled = false;
        saveButton.innerHTML =
          '<i class="fas fa-save"></i> حفظ كقاعدة جديدة';
        if (cancelButton) cancelButton.disabled = false;
      }
    }

    async function handleApiRequest(url, options, errorElement, defaultErrorMessage) {
      console.log("handleApiRequest called for URL:", url);
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || defaultErrorMessage);
        }
        return await response.json();
      } catch (err) {
        console.error(`Error in API request to ${url}:`, err);
        errorElement.textContent = err.message || defaultErrorMessage;
        errorElement.style.display = "block";
        throw err;
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        console.log("Tab clicked, channel:", tab.dataset.channel);
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentChannel = tab.dataset.channel;
        currentPage = 1; // Reset to first page when changing channel
        fetchConversations(
          selectedBotId,
          currentChannel,
          startDateFilter.value,
          endDateFilter.value,
          currentPage
        );
      });
    });

    applyFilterBtn.addEventListener("click", () => {
      console.log("applyFilterBtn clicked...");
      currentPage = 1; // Reset to first page when applying filters
      fetchConversations(
        selectedBotId,
        currentChannel,
        startDateFilter.value,
        endDateFilter.value,
        currentPage
      );
    });

    resetFilterBtn.addEventListener("click", () => {
      console.log("resetFilterBtn clicked...");
      startDateFilter.value = "";
      endDateFilter.value = "";
      currentPage = 1; // Reset to first page when resetting filters
      fetchConversations(selectedBotId, currentChannel, null, null, currentPage);
    });

    closeChatModalBtn.addEventListener("click", closeChatModal);
    deleteSingleConversationBtn.addEventListener("click", () => {
      console.log("Delete single conversation button clicked");
      deleteSingleConversation();
    });
    deleteAllConversationsBtn.addEventListener("click", () => {
      console.log("Delete all conversations button clicked");
      deleteAllConversationsForChannel();
    });
    downloadMessagesBtn.addEventListener("click", () => {
      console.log("Download messages button clicked");
      downloadMessagesForChannel();
    });

    chatModal.addEventListener("click", (event) => {
      if (event.target === chatModal) {
        closeChatModal();
      }
    });

    console.log("Calling fetchConversations for initial load...");
    fetchConversations(selectedBotId, currentChannel, null, null, currentPage);
  };

  console.log("loadMessagesPage is defined:", typeof window.loadMessagesPage);
} catch (error) {
  console.error("Error in messages.js:", error.message);
  throw error;
}

function escapeHtml(unsafe) {
  console.log("escapeHtml called...");
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

console.log("messages.js script finished loading at", new Date().toISOString());
