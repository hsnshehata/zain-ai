// public/js/landing.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("Landing page loaded.");

  // Apply theme from localStorage
  const currentTheme = localStorage.getItem("theme") || "dark";
  document.body.classList.add(currentTheme === "light" ? "light-mode" : "dark-mode");
  if (currentTheme === "light") {
    document.body.classList.remove("dark-mode");
  }

  // Smooth scrolling for navigation links
  document.querySelectorAll('header nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        // Update focus for accessibility
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus({ preventScroll: true });
      }
    });
  });
});
