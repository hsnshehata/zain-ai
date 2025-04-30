// public/js/auth.js
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
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'فشل تسجيل الدخول');
        }

        const data = await response.json();
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
        console.error('❌ Error during login:', err);
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || 'حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى';
      }
    });
  }

  // Handle logout buttons
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = localStorage.getItem('username');
      const errorDiv = document.querySelector('#error');

      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          // Clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          console.log('✅ Logout successful, localStorage cleared');
          window.location.href = '/';
        } else {
          throw new Error(data.message || 'فشل تسجيل الخروج');
        }
      } catch (err) {
        console.error('❌ Error during logout:', err);
        if (errorDiv) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = err.message || 'حدث خطأ أثناء تسجيل الخروج';
        } else {
          alert('حدث خطأ أثناء تسجيل الخروج، حاول مرة أخرى');
        }
      }
    });
  });
});
