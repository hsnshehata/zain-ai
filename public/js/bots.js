let selectedBotId = null;

async function loadBotsPage() {
  const content = document.getElementById('content');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  content.innerHTML = `
    <h2>إدارة البوتات</h2>
    <div class="bots-container">
      <div class="spinner"><div class="loader"></div></div>
      <div id="botsContent" style="display: none;">
        <div class="form-group">
          <select id="botSelect" onchange="selectBot(this.value)"></select>
          <label for="botSelect">اختر بوت</label>
        </div>
        <div class="admin-actions">
          ${role === 'superadmin' ? `
            <button onclick="showCreateUserForm()">إنشاء مستخدم جديد</button>
            <button onclick="showCreateBotForm()">إنشاء بوت جديد</button>
          ` : ''}
        </div>
        <div id="formContainer"></div>
        <div id="usersTable" class="users-grid"></div>
      </div>
    </div>
  `;

  const botsContent = document.getElementById('botsContent');
  const spinner = document.querySelector('.spinner');

  try {
    spinner.style.display = 'flex';
    await fetchUsers();
    await populateBotSelect();
    botsContent.style.display = 'block';
    spinner.style.display = 'none';
    if (!selectedBotId && document.getElementById('botSelect').options.length > 0) {
      selectBot(document.getElementById('botSelect').options[0].value);
    }
  } catch (err) {
    console.error('خطأ في تحميل البوتات:', err);
    botsContent.innerHTML = `<p style="color: red;">تعذر تحميل البيانات، حاول مرة أخرى لاحقًا.</p>`;
    spinner.style.display = 'none';
  }
}

async function populateBotSelect() {
  const botSelect = document.getElementById('botSelect');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  try {
    const res = await fetch('/api/bots', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب البوتات');
    }
    const bots = await res.json();

    botSelect.innerHTML = '';
    const userBots = role === 'superadmin' ? bots : bots.filter((bot) => bot.userId._id === userId);
    userBots.forEach((bot) => {
      botSelect.innerHTML += `<option value="${bot._id}">${bot.name}</option>`;
    });
  } catch (err) {
    console.error('خطأ في جلب البوتات:', err);
    alert('خطأ في جلب البوتات');
  }
}

function selectBot(botId) {
  selectedBotId = botId;
  const botSelect = document.getElementById('botSelect');
  for (let option of botSelect.options) {
    option.classList.remove('selected-bot');
    if (option.value === botId) {
      option.classList.add('selected-bot');
    }
  }
}

async function fetchUsers() {
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) {
      throw new Error('فشل في جلب المستخدمين');
    }
    let users = await res.json();

    const usersGrid = document.getElementById('usersTable');
    usersGrid.innerHTML = '';

    if (role !== 'superadmin') {
      users = users.filter(user => user._id === userId);
    }

    if (users.length === 0) {
      usersGrid.innerHTML = '<div class="user-card"><p>لا توجد مستخدمين.</p></div>';
      return;
    }

    users.forEach((user) => {
      const botsList = user.bots.map((bot) => {
        if (role === 'superadmin') {
          return `
            ${bot.name}
            <button onclick="editBot('${bot._id}', '${bot.name}', '${bot.facebookApiKey || ''}', '${bot.facebookPageId || ''}')">تعديل</button>
            <button onclick="deleteBot('${bot._id}')">حذف</button>
          `;
        } else {
          return `${bot.name}`;
        }
      }).join('<br>');

      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
        <h4>${user.username}</h4>
        <p>نوع المستخدم: ${user.role === 'superadmin' ? 'سوبر أدمن' : 'مستخدم عادي'}</p>
        <p>البوتات: ${botsList || 'لا توجد بوتات'}</p>
        ${role === 'superadmin' ? `
          <div class="card-actions">
            <button onclick="editUser('${user._id}', '${user.username}', '${user.role}')">تعديل</button>
            <button onclick="deleteUser('${user._id}')">حذف</button>
          </div>
        ` : ''}
      `;
      usersGrid.appendChild(card);
    });
  } catch (err) {
    console.error('خطأ في جلب المستخدمين:', err);
    alert('خطأ في جلب المستخدمين');
  }
}

function showCreateBotForm() {
  const formContainer = document.getElementById('formContainer');
  formContainer.innerHTML = `
    <h3>إنشاء بوت جديد</h3>
    <form id="createBotForm">
      <div class="form-group">
        <input type="text" id="botName" required placeholder=" ">
        <label for="botName">اسم البوت</label>
      </div>
      <div class="form-group">
        <input type="text" id="facebookApiKey" placeholder=" ">
        <label for="facebookApiKey">رقم API لفيسبوك (اختياري)</label>
      </div>
      <div id="facebookPageIdContainer" style="display: none;">
        <div class="form-group">
          <input type="text" id="facebookPageId" placeholder=" ">
          <label for="facebookPageId">معرف صفحة الفيسبوك</label>
        </div>
      </div>
      <div class="form-group">
        <input type="text" id="userSearch" placeholder=" ">
        <label for="userSearch">ابحث عن المستخدم...</label>
        <select id="userId" required></select>
      </div>
      <button type="submit">إنشاء</button>
    </form>
    <p id="botError" style="color: red;"></p>
  `;

  const facebookApiKeyInput = document.getElementById('facebookApiKey');
  const facebookPageIdContainer = document.getElementById('facebookPageIdContainer');
  facebookApiKeyInput.addEventListener('input', () => {
    facebookPageIdContainer.style.display = facebookApiKeyInput.value ? 'block' : 'none';
  });

  const userSearch = document.getElementById('userSearch');
  const userSelect = document.getElementById('userId');
  let allUsers = [];

  fetch('/api/users', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  })
    .then((res) => res.json())
    .then((users) => {
      allUsers = users;
      users.forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
      });
    })
    .catch((err) => {
      console.error('خطأ في جلب المستخدمين:', err);
      document.getElementById('botError').textContent = 'خطأ في جلب المستخدمين';
    });

  userSearch.addEventListener('input', () => {
    const searchTerm = userSearch.value.toLowerCase();
    userSelect.innerHTML = '';
    allUsers
      .filter((user) => user.username.toLowerCase().includes(searchTerm))
      .forEach((user) => {
        userSelect.innerHTML += `<option value="${user._id}">${user.username}</option>`;
      });
  });

  document.getElementById('createBotForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('botName').value;
    const userId = document.getElementById('userId').value;
    const facebookApiKey = document.getElementById('facebookApiKey').value;
    const facebookPageId = document.getElementById('facebookPageId').value;
    const errorEl = document.getElementById('botError');

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name, userId, facebookApiKey, facebookPageId }),
      });

      const data = await res.json();
      if (res.ok) {
        formContainer.innerHTML = '<p>تم إنشاء البوت بنجاح!</p>';
        await fetchUsers();
        await populateBotSelect();
        if (!selectedBotId && document.getElementById('botSelect').options.length > 0) {
          selectBot(document.getElementById('botSelect').options[0].value);
        }
      } else {
        errorEl.textContent = data.message || 'فشل في إنشاء البوت';
      }
    } catch (err) {
      console.error('خطأ في إنشاء البوت:', err);
      errorEl.textContent = 'خطأ في السيرفر';
    }
  });
}

async function editBot(id, name, facebookApiKey, facebookPageId) {
  const newName = prompt('أدخل اسم البوت الجديد:', name);
  const newFacebookApiKey = prompt('أدخل رقم API لفيسبوك (اختياري):', facebookApiKey || '');
  let newFacebookPageId = facebookPageId;
  if (newFacebookApiKey) {
    newFacebookPageId = prompt('أدخل معرف صفحة الفيسبوك:', facebookPageId || '');
  }
  if (newName) {
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newName, facebookApiKey: newFacebookApiKey, facebookPageId: newFacebookPageId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم تعديل البوت بنجاح');
        await fetchUsers();
        await populateBotSelect();
      } else {
        alert(data.message || 'فشل في تعديل البوت');
      }
    } catch (err) {
      console.error('خطأ في تعديل البوت:', err);
      alert('خطأ في السيرفر');
    }
  }
}

async function deleteBot(id) {
  if (confirm('هل أنت متأكد من حذف هذا البوت؟')) {
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم حذف البوت بنجاح');
        await fetchUsers();
        await populateBotSelect();
        if (selectedBotId === id && document.getElementById('botSelect').options.length > 0) {
          selectBot(document.getElementById('botSelect').options[0].value);
        } else if (document.getElementById('botSelect').options.length === 0) {
          selectedBotId = null;
        }
      } else {
        alert(data.message || 'فشل في حذف البوت');
      }
    } catch (err) {
      console.error('خطأ في حذف البوت:', err);
      alert('خطأ في السيرفر');
    }
  }
}

function getSelectedBotId() {
  return selectedBotId;
}

function setSelectedBotId(botId) {
  selectedBotId = botId;
}
