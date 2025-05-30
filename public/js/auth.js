document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#loginForm');
  const logoutButtons = document.querySelectorAll('.logout-btn');

  // Check if token exists and redirect to dashboard if on login page
  const token = localStorage.getItem("token");
  if (token && window.location.pathname === "/login.html") {
    window.location.href = "/dashboard_new.html";
    return;
  }

  // Handle API requests with error handling
  async function handleApiRequest(url, options, errorDiv, defaultErrorMessage) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        // Check for token expiration error
        if (response.status === 401 && data.error === 'TokenExpiredError') {
          console.log('❌ Token expired, initiating auto-logout');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          console.log('✅ Auto-logout successful, redirecting to login page');
          window.location.href = '/login.html';
          throw new Error('التوكن منتهي الصلاحية، يرجى تسجيل الدخول مرة أخرى');
        }
        throw new Error(data.message || defaultErrorMessage);
      }
      return data;
    } catch (err) {
      if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || defaultErrorMessage;
      }
      throw err;
    }
  }

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.querySelector('#username').value.trim();
      const password = document.querySelector('#password').value.trim();
      const errorDiv = document.querySelector('#error');

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
          // Store user data in localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', data.role);
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('username', data.username);

          // Redirect to the new dashboard file
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

  // Handle logout buttons
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = localStorage.getItem('username');
      const errorDiv = document.querySelector('#error');

      try {
        await handleApiRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        }, errorDiv, 'فشل تسجيل الخروج');

        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        console.log('✅ Logout successful, localStorage cleared');
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
