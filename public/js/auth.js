document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#loginForm');
  const registerForm = document.querySelector('#registerForm');
  const logoutButtons = document.querySelectorAll('.logout-btn');
  const errorDiv = document.querySelector('#error');
  const successDiv = document.querySelector('#success');

  const saveSession = (payload) => {
    const expiryMs = getTokenExpiryFromJwt(payload.token) || undefined;
    if (window.saveAuthSession) {
      window.saveAuthSession({ ...payload, expiryMs });
    } else {
      localStorage.setItem('token', payload.token);
      if (expiryMs) localStorage.setItem('tokenExpiry', `${expiryMs}`);
      if (payload.role) localStorage.setItem('role', payload.role);
      if (payload.userId) localStorage.setItem('userId', payload.userId);
      if (payload.username) localStorage.setItem('username', payload.username);
    }
  };

  const clearSession = () => {
    if (window.clearAuthSession) {
      window.clearAuthSession();
    } else {
      ['token', 'tokenExpiry', 'role', 'userId', 'username', 'selectedBotId', 'theme'].forEach((k) => localStorage.removeItem(k));
    }
  };

  const token = window.getAuthToken ? window.getAuthToken() : null;
  if (token && window.location.pathname === '/login.html') {
    window.location.href = '/dashboard_new.html';
    return;
  }

  if (!token && window.location.pathname !== '/login.html' && localStorage.getItem('token')) {
    clearSession();
    window.location.href = '/login.html';
    return;
  }

  // Handle Google Sign-In
  window.handleGoogleSignIn = async (response) => {
    const idToken = response.credential;
    try {
      const data = await handleApiRequest('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      }, errorDiv, 'فشل تسجيل الدخول بجوجل');

      if (data.success) {
        saveSession({ token: data.token, role: data.role, userId: data.userId, username: data.username });
        window.location.href = '/dashboard_new.html';
      } else {
        errorDiv.style.display = 'block';
        errorDiv.textContent = data.message || 'فشل تسجيل الدخول بجوجل، حاول مرة أخرى';
      }
    } catch (err) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول بجوجل';
    }
  };

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.querySelector('#username').value.trim();
      const password = document.querySelector('#password').value.trim();

      if (!username || !password) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'من فضلك أدخل اسم المستخدم وكلمة المرور';
        return;
      }

      try {
        const data = await handleApiRequest('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        }, errorDiv, 'فشل تسجيل الدخول');

        if (data.success) {
          saveSession({ token: data.token, role: data.role, userId: data.userId, username: data.username });
          window.location.href = '/dashboard_new.html';
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = data.message || 'فشل تسجيل الدخول، تأكد من اسم المستخدم وكلمة المرور';
        }
      } catch (err) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى أو سجل مستخدم جديد';
      }
    });
  }

  // Handle register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.querySelector('#username').value.trim();
      const password = document.querySelector('#password').value.trim();
      const confirmPassword = document.querySelector('#confirmPassword').value.trim();
      const botName = document.querySelector('#botName').value.trim();
      const whatsapp = document.querySelector('#whatsapp').value.trim();
      const email = document.querySelector('#email').value.trim();

      // Reset error message
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';

      // Validate inputs
      if (!username || !password || !confirmPassword || !botName || !email) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'جميع الحقول مطلوبة ما عدا رقم الواتساب';
        return;
      }

      if (password !== confirmPassword) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'كلمات المرور غير متطابقة';
        return;
      }

      if (!isStrongPassword(password)) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز وبدون مسافات';
        return;
      }

      if (!/^[a-z0-9_-]+$/.test(username)) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية، أرقام، _ أو - فقط';
        return;
      }

      if (email.endsWith('@gmail.com')) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'يرجى استخدام زرار تسجيل الدخول بجوجل في صفحة تسجيل الدخول لبريد Gmail';
        return;
      }

      try {
        const data = await handleApiRequest('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, botName, whatsapp, email }),
        }, errorDiv, 'فشل التسجيل');

        if (data.success) {
          successDiv.style.display = 'block';
          errorDiv.style.display = 'none';
          registerForm.reset();
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = data.message || 'فشل التسجيل، حاول مرة أخرى';
        }
      } catch (err) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء التسجيل، حاول مرة أخرى';
      }
    });
  }

  // Handle logout buttons
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = localStorage.getItem('username');

      try {
        await handleApiRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        }, errorDiv, 'فشل تسجيل الخروج');

        clearSession();
        window.location.href = '/';
      } catch (err) {
        if (!errorDiv) {
          alert('حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى');
        } else {
          errorDiv.style.display = 'block';
          errorDiv.textContent = err.message || 'حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى';
        }
      }
    });
  });
});

function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (/\s/.test(password)) return false; // spaces not allowed
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()_+\-={}\[\]|;:"'<>.,?/]/.test(password);
}

function getTokenExpiryFromJwt(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded && decoded.exp) {
      return decoded.exp * 1000;
    }
    return null;
  } catch (err) {
    return null;
  }
}
