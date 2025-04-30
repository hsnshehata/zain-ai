document.addEventListener('DOMContentLoaded', () => {
  const themeToggleButton = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'dark'; // Default to dark mode

  // Apply the saved theme on initial load
  if (currentTheme === 'light') {
    document.body.classList.replace('dark-mode', 'light-mode');
  } else {
    document.body.classList.add('dark-mode'); // Ensure dark-mode is present if no theme saved
  }

  // Toggle theme on button click
  themeToggleButton.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.replace('dark-mode', 'light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.replace('light-mode', 'dark-mode');
      localStorage.setItem('theme', 'dark');
    }
  });
});

