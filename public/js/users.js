// public/js/users.js (Updated for new dashboard design)

async function loadUsersPage() {
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role"); // Check user role

  // Basic role check - Assuming only superadmin can manage users
  if (userRole !== "superadmin") {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> وصول غير مصرح به</h2>
        <p>ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.</p>
      </div>
    `;
    return;
  }

  if (!token) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض صفحة إدارة المستخدمين.</p>
        </div>
      `;
      return;
  }

  // Main structure for the users management page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-users-cog"></i> إدارة المستخدمين</h2>
      <div class="header-actions">
        <button id="addUserBtn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة مستخدم جديد</button>
      </div>
    </div>

    <div id="loadingSpinner" class="spinner" style="display: none;"><div class="loader"></div></div>
    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div class="table-responsive">
        <table class="table table-hover" id="usersTable">
            <thead>
                <tr>
                    <th>اسم المستخدم</th>
                    <th>الدور</th>
                    <th>تاريخ الإنشاء</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody id="usersTableBody">
                <!-- User rows will be populated here -->
            </tbody>
        </table>
    </div>

    <!-- Add/Edit User Modal -->
    <div id="userModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="userModalTitle">إضافة مستخدم جديد</h3>
          <button id="closeUserModalBtn" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <form id="userForm">
            <input type="hidden" id="userId">
            <div class="form-group">
              <label for="username">اسم المستخدم:</label>
              <input type="text" id="username" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="password">كلمة المرور (اتركه فارغاً لعدم التغيير عند التعديل):</label>
              <input type="password" id="password" class="form-control">
            </div>
            <div class="form-group">
              <label for="confirmPassword">تأكيد كلمة المرور:</label>
              <input type="password" id="confirmPassword" class="form-control">
            </div>
            <div class="form-group">
              <label for="role">الدور:</label>
              <select id="role" class="form-control" required>
                <option value="user">مستخدم عادي (User)</option>
                <option value="superadmin">مدير النظام (Superadmin)</option>
              </select>
            </div>
            <p id="userFormError" class="error-message small-error" style="display: none;"></p>
          </form>
        </div>
        <div class="modal-footer">
          <button id="saveUserBtn" class="btn btn-primary">حفظ</button>
          <button id="cancelUserBtn" class="btn btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  `;

  // --- Element References ---
  const loadingSpinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const usersTableBody = document.getElementById("usersTableBody");
  const addUserBtn = document.getElementById("addUserBtn");

  // Modal Elements
  const userModal = document.getElementById("userModal");
  const userModalTitle = document.getElementById("userModalTitle");
  const closeUserModalBtn = document.getElementById("closeUserModalBtn");
  const saveUserBtn = document.getElementById("saveUserBtn");
  const cancelUserBtn = document.getElementById("cancelUserBtn");
  const userForm = document.getElementById("userForm");
  const userIdInput = document.getElementById("userId");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const roleInput = document.getElementById("role");
  const userFormError = document.getElementById("userFormError");

  // --- Functions ---

  function showLoading() {
    loadingSpinner.style.display = "flex";
    errorMessage.style.display = "none";
    usersTableBody.innerHTML = ""; // Clear table while loading
  }

  function showError(message) {
    loadingSpinner.style.display = "none";
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }

  function showContent() {
    loadingSpinner.style.display = "none";
    errorMessage.style.display = "none";
  }

  async function fetchUsers() {
    showLoading();
    try {
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) throw new Error("جلسة غير صالحة");
      if (!response.ok) throw new Error("فشل جلب قائمة المستخدمين");

      const users = await response.json();
      renderUsersTable(users);
      showContent();
    } catch (err) {
      console.error("Error fetching users:", err);
      showError(err.message || "حدث خطأ أثناء جلب المستخدمين.");
      if (err.message === "جلسة غير صالحة") logoutUser();
    }
  }

  function renderUsersTable(users) {
    usersTableBody.innerHTML = ""; // Clear existing rows
    if (!users || users.length === 0) {
      usersTableBody.innerHTML = 
`<tr><td colspan="4" class="text-center">لا يوجد مستخدمين لعرضهم.</td></tr>`;
      return;
    }

    users.forEach(user => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(user.username)}</td>
        <td>${user.role === "superadmin" ? "مدير النظام" : "مستخدم عادي"}</td>
        <td>${new Date(user.createdAt).toLocaleDateString("ar-EG")}</td>
        <td>
          <button class="btn btn-sm btn-secondary edit-user-btn" data-id="${user._id}" data-username="${escapeHtml(user.username)}" data-role="${user.role}" title="تعديل"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user._id}" title="حذف"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;

      // Add event listeners for buttons in this row
      row.querySelector(".edit-user-btn").addEventListener("click", handleEditClick);
      row.querySelector(".delete-user-btn").addEventListener("click", handleDeleteClick);

      usersTableBody.appendChild(row);
    });
  }

  function openUserModal(mode = "add", userData = null) {
    userForm.reset(); // Clear form
    userIdInput.value = "";
    userFormError.style.display = "none";
    passwordInput.required = (mode === "add"); // Password required only for adding
    confirmPasswordInput.required = (mode === "add");

    if (mode === "edit" && userData) {
      userModalTitle.textContent = "تعديل مستخدم";
      userIdInput.value = userData.id;
      usernameInput.value = userData.username;
      roleInput.value = userData.role;
      passwordInput.placeholder = "اتركه فارغاً لعدم التغيير";
      confirmPasswordInput.placeholder = "اتركه فارغاً لعدم التغيير";
    } else {
      userModalTitle.textContent = "إضافة مستخدم جديد";
      passwordInput.placeholder = "";
      confirmPasswordInput.placeholder = "";
    }

    userModal.style.display = "flex";
  }

  function closeUserModal() {
    userModal.style.display = "none";
  }

  function handleEditClick(event) {
    const button = event.currentTarget;
    const userData = {
      id: button.dataset.id,
      username: button.dataset.username,
      role: button.dataset.role,
    };
    openUserModal("edit", userData);
  }

  async function handleDeleteClick(event) {
    const button = event.currentTarget;
    const userIdToDelete = button.dataset.id;

    if (!userIdToDelete) return;

    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.")) {
      button.disabled = true;
      button.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i>`;

      try {
        const response = await fetch(`/api/users/${userIdToDelete}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) throw new Error("جلسة غير صالحة");
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "فشل حذف المستخدم");
        }

        alert("تم حذف المستخدم بنجاح.");
        await fetchUsers(); // Refresh the list

      } catch (err) {
        console.error("Error deleting user:", err);
        alert(`خطأ: ${err.message}`);
        if (err.message === "جلسة غير صالحة") logoutUser();
        // Re-enable button on error
        button.disabled = false;
        button.innerHTML = 
`<i class="fas fa-trash-alt"></i>`;
      }
    }
  }

  async function handleSaveUser() {
    userFormError.style.display = "none";
    const userId = userIdInput.value;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const role = roleInput.value;

    // Validation
    if (!username || !role) {
      userFormError.textContent = "يرجى ملء اسم المستخدم والدور.";
      userFormError.style.display = "block";
      return;
    }
    if (password !== confirmPassword) {
      userFormError.textContent = "كلمتا المرور غير متطابقتين.";
      userFormError.style.display = "block";
      return;
    }
    if (!userId && !password) { // Password required for new users
        userFormError.textContent = "كلمة المرور مطلوبة للمستخدم الجديد.";
        userFormError.style.display = "block";
        return;
    }

    const isEditMode = !!userId;
    const url = isEditMode ? `/api/users/${userId}` : "/api/users";
    const method = isEditMode ? "PUT" : "POST";

    const body = {
      username,
      role,
    };
    // Only include password if it's provided (for creation or update)
    if (password) {
      body.password = password;
      body.confirmPassword = confirmPassword; // API might need confirmation for updates too
    }

    saveUserBtn.disabled = true;
    saveUserBtn.innerHTML = 
`<i class="fas fa-spinner fa-spin"></i> جار الحفظ...`;

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) throw new Error("جلسة غير صالحة");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isEditMode ? "فشل تعديل المستخدم" : "فشل إنشاء المستخدم"));
      }

      alert(isEditMode ? "تم تعديل المستخدم بنجاح." : "تم إنشاء المستخدم بنجاح.");
      closeUserModal();
      await fetchUsers(); // Refresh list

    } catch (err) {
      console.error("Error saving user:", err);
      userFormError.textContent = err.message;
      userFormError.style.display = "block";
      if (err.message === "جلسة غير صالحة") logoutUser();
    } finally {
      saveUserBtn.disabled = false;
      saveUserBtn.innerHTML = "حفظ";
    }
  }

  // --- Event Listeners Setup ---
  addUserBtn.addEventListener("click", () => openUserModal("add"));
  closeUserModalBtn.addEventListener("click", closeUserModal);
  cancelUserBtn.addEventListener("click", closeUserModal);
  saveUserBtn.addEventListener("click", handleSaveUser);
  // Close modal if clicking outside the content
  userModal.addEventListener("click", (event) => {
    if (event.target === userModal) {
      closeUserModal();
    }
  });

  // --- Initial Load ---
  await fetchUsers();
}

// Helper function to escape HTML (Corrected)
function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/\n/g, "<br>"); // Corrected regex for newline
 }

// Make loadUsersPage globally accessible
window.loadUsersPage = loadUsersPage;

