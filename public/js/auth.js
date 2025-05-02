// public/js/auth.js (Updated for unified error handling)

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#loginForm');
  const logoutButtons = document.querySelectorAll('.logout-btn');

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
          throw new Error(data.message || 'فشل تسجيل الدخول');
        }
      } catch (err) {
        // الخطأ تم التعامل معه في handleApiRequest
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
        // الخطأ تم التعامل معه في handleApiRequest
        if (!errorDiv) {
          alert('حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى');
        }
      }
    });
  });
});
