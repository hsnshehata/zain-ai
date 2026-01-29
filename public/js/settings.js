// public/js/settings.js

console.log("✅ settings.js started loading at", new Date().toISOString());

// Define loadSettingsPage in the global scope
async function loadSettingsPage() {
  console.log("✅ loadSettingsPage called at", new Date().toISOString());
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const selectedBotId = localStorage.getItem("selectedBotId");

  if (!token || !userId) {
    console.error("Token or userId not found in localStorage");
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-circle"></i> خطأ</h2>
        <p>يرجى تسجيل الدخول مرة أخرى للوصول إلى إعدادات المستخدم.</p>
        <a href="/login.html">تسجيل الدخول</a>
      </div>
    `;
    return;
  }

  try {
    const cachePageKey = 'settingsUser';
    const cachedUser = window.readPageCache ? window.readPageCache(cachePageKey, userId, 5 * 60 * 1000) : null;
    const fetchUser = () => handleApiRequest('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }, content, 'فشل في جلب بيانات المستخدم');

    let user = cachedUser || null;

    if (cachedUser) {
      console.log("Using cached user data for userId:", userId);
      fetchUser()
        .then((fresh) => {
          if (fresh && window.writePageCache) {
            window.writePageCache(cachePageKey, userId, fresh);
          }
        })
        .catch((err) => {
          console.warn('⚠️ Failed to refresh user settings, using cache', err);
        });
    } else {
      console.log("Fetching user data for userId:", userId);
      user = await fetchUser();
      if (window.writePageCache) {
        window.writePageCache(cachePageKey, userId, user);
      }
    }

    // جلب بيانات البوت النشط (إن وجد) مع كاش خفيف
    let activeBot = null;
    if (selectedBotId) {
      const botCacheKey = 'settingsBot';
      const cachedBot = window.readPageCache ? window.readPageCache(botCacheKey, selectedBotId, 3 * 60 * 1000) : null;
      const fetchBot = () => handleApiRequest(`/api/bots/${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, content, 'فشل في جلب بيانات البوت');

      if (cachedBot) {
        console.log("Using cached bot data for botId:", selectedBotId);
        activeBot = cachedBot;
        fetchBot()
          .then((fresh) => {
            if (fresh && window.writePageCache) {
              window.writePageCache(botCacheKey, selectedBotId, fresh);
            }
          })
          .catch((err) => {
            console.warn('⚠️ Failed to refresh bot data, using cache', err);
          });
      } else {
        activeBot = await fetchBot();
        if (window.writePageCache) {
          window.writePageCache(botCacheKey, selectedBotId, activeBot);
        }
      }
    }

    console.log("User data fetched successfully:", user);
    const botNameValue = activeBot && activeBot.name ? activeBot.name.replace(/"/g, '&quot;') : '';
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-cog"></i> إعدادات المستخدم</h2>
      </div>
      <div class="form-card">
        <form id="settingsForm">
          <div class="form-group">
            <label for="email">البريد الإلكتروني</label>
            <input type="email" id="email" value="${user.email || ''}" required>
          </div>
          <div class="form-group">
            <label for="username">اسم المستخدم</label>
            <input type="text" id="username" value="${user.username || ''}" required>
          </div>
          <div class="form-group">
            <label for="password">كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب في التغيير)</label>
            <input type="password" id="password">
          </div>
          <div class="form-group">
            <label for="confirmPassword">تأكيد كلمة المرور</label>
            <input type="password" id="confirmPassword">
          </div>
          <div class="form-group">
            <label for="whatsapp">رقم الواتساب</label>
            <input type="text" id="whatsapp" value="${user.whatsapp || ''}">
          </div>
          <button type="submit">حفظ التغييرات</button>
        </form>
        <p id="error" role="alert"></p>
      </div>

      <div class="form-card">
        <div class="form-header">
          <h3><i class="fas fa-robot"></i> اسم البوت النشط</h3>
          <p class="form-hint">سيتم تعديل اسم البوت المختار من القائمة العلوية فقط.</p>
        </div>
        ${selectedBotId ? `
        <div class="form-group">
          <label for="botName">اسم البوت</label>
          <input type="text" id="botName" value="${botNameValue}" placeholder="اكتب اسم البوت" required>
        </div>
        <button type="button" id="saveBotNameBtn" class="btn btn-primary">حفظ اسم البوت</button>
        <p id="botNameError" role="alert"></p>
        ` : `
        <div class="placeholder">
          <p>اختر بوتًا من القائمة العلوية لتعديل اسمه.</p>
        </div>
        `}
      </div>

      <div class="form-card">
        <div class="form-header">
          <h3><i class="fas fa-chart-line"></i> عدادات البوت</h3>
          <p class="form-hint">أرقام سريعة من نشاط البوت المختار.</p>
        </div>
        ${selectedBotId ? `
        <div class="stats-grid" id="botStatsGrid">
          <div class="stat-card">
            <div class="stat-label">إجمالي الرسائل</div>
            <div class="stat-value" id="statMessagesCount">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">معدل نجاح الردود</div>
            <div class="stat-value" id="statSuccessRate">--%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">القواعد الفعالة</div>
            <div class="stat-value" id="statActiveRules">--</div>
          </div>
        </div>
        ` : `
        <div class="placeholder">
          <p>اختر بوتًا من القائمة العلوية لعرض العدادات.</p>
        </div>
        `}
      </div>
    `;

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const whatsapp = document.getElementById('whatsapp').value;
      const errorDiv = document.getElementById('error');

      if (password && password !== confirmPassword) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'كلمات المرور غير متطابقة';
        return;
      }

      try {
        console.log("Updating user data for userId:", userId);
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, username, whatsapp, ...(password && { password }) })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('username', username);
          console.log("User data updated successfully, reloading page");
          await loadSettingsPage();
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = data.message || 'فشل في تحديث بيانات المستخدم';
        }
      } catch (error) {
        console.error("Error updating user data:", error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'خطأ في السيرفر، حاول مرة أخرى';
      }
    });

    // تحديث اسم البوت النشط
    if (selectedBotId) {
      const botNameInput = document.getElementById('botName');
      const saveBotNameBtn = document.getElementById('saveBotNameBtn');
      const botNameError = document.getElementById('botNameError');

      saveBotNameBtn.addEventListener('click', async () => {
        const newName = (botNameInput.value || '').trim();
        if (!newName) {
          botNameError.style.display = 'block';
          botNameError.textContent = 'يرجى إدخال اسم صالح للبوت';
          return;
        }

        try {
          botNameError.style.display = 'none';
          const updated = await handleApiRequest(`/api/bots/${selectedBotId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName })
          }, content, 'فشل في تحديث اسم البوت');

          if (updated && updated.name) {
            botNameInput.value = updated.name;
            if (window.writePageCache) {
              window.writePageCache('settingsBot', selectedBotId, updated);
            }
            alert('تم تحديث اسم البوت بنجاح');
          }
        } catch (err) {
          console.error('Error updating bot name:', err);
          botNameError.style.display = 'block';
          botNameError.textContent = 'فشل في تحديث اسم البوت، حاول مرة أخرى';
        }
      });

      // جلب عدادات البوت
      const statsEls = {
        messages: document.getElementById('statMessagesCount'),
        success: document.getElementById('statSuccessRate'),
        rules: document.getElementById('statActiveRules'),
      };

      const statsCacheKey = 'settingsBotStats';
      const cachedStats = window.readPageCache ? window.readPageCache(statsCacheKey, selectedBotId, 2 * 60 * 1000) : null;
      const fetchStats = () => handleApiRequest(`/api/analytics?botId=${selectedBotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, content, 'فشل في جلب عدادات البوت');

      const applyStats = (stats) => {
        if (!stats || !statsEls.messages) return;
        statsEls.messages.textContent = stats.messagesCount != null ? stats.messagesCount : '--';
        statsEls.success.textContent = stats.successRate != null ? `${stats.successRate}%` : '--%';
        statsEls.rules.textContent = stats.activeRules != null ? stats.activeRules : '--';
      };

      if (cachedStats) {
        applyStats(cachedStats);
        fetchStats()
          .then((fresh) => {
            if (fresh && window.writePageCache) {
              window.writePageCache(statsCacheKey, selectedBotId, fresh);
            }
            applyStats(fresh);
          })
          .catch((err) => {
            console.warn('⚠️ فشل تحديث عدادات البوت، استخدام الكاش', err);
          });
      } else {
        fetchStats()
          .then((fresh) => {
            applyStats(fresh);
            if (fresh && window.writePageCache) {
              window.writePageCache(statsCacheKey, selectedBotId, fresh);
            }
          })
          .catch((err) => {
            console.warn('⚠️ فشل جلب عدادات البوت', err);
          });
      }
    }
  } catch (err) {
    console.error("Error loading settings page:", err);
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-circle"></i> خطأ</h2>
        <p>فشل في تحميل إعدادات المستخدم. ${err.message || 'يرجى المحاولة مرة أخرى لاحقًا.'}</p>
        <a href="/login.html">تسجيل الدخول مرة أخرى</a>
      </div>
    `;
  }
}

// Make loadSettingsPage globally accessible
window.loadSettingsPage = loadSettingsPage;

console.log("✅ loadSettingsPage defined in global scope at", new Date().toISOString());

if (window.loadSettingsPage) {
  console.log('✅ loadSettingsPage is defined and ready at', new Date().toISOString());
} else {
  console.error('❌ loadSettingsPage is not defined at', new Date().toISOString());
}

// Add error handling for script execution
try {
  console.log("✅ settings.js fully executed at", new Date().toISOString());
} catch (err) {
  console.error("❌ Error during settings.js execution:", err);
}
