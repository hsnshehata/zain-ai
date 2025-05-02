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
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus({ preventScroll: true });
        // Close menu on mobile after clicking a link
        const navMenu = document.querySelector('.nav-menu');
        const menuToggle = document.querySelector('.menu-toggle');
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Toggle navigation menu on hamburger click
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  menuToggle.addEventListener('click', () => {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    navMenu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', !isExpanded);
  });

  // Handle PWA installation
  let deferredPrompt;
  const installButton = document.getElementById('installAppBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    installButton.style.display = 'inline-block';

    installButton.addEventListener('click', (e) => {
      e.preventDefault();
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
        // Hide the install button after prompt
        installButton.style.display = 'none';
      });
    });
  });

  // Hide the install button if the app is already installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installButton.style.display = 'none';
    deferredPrompt = null;
  });
});
