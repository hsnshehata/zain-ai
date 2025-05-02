// js/landing.js
// Add any JavaScript functionality for the landing page here if needed in the future.

document.addEventListener('DOMContentLoaded', () => {
    console.log("Landing page loaded.");
    // Example: Smooth scrolling for navigation links
    document.querySelectorAll('header nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

