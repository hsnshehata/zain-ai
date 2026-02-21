document.addEventListener('DOMContentLoaded', () => {
    const starContainer = document.createElement('div');
    starContainer.className = 'stars-container';
    document.body.prepend(starContainer);

    // Number of stars - kept low for performance but high enough for effect
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // Random Position
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        // Random Size (small dots)
        const size = Math.random() * 2 + 1; // 1px to 3px

        // Random Animation Delay (so they don't twinkle together)
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 2; // 2s to 5s twinkle speed

        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;

        starContainer.appendChild(star);
    }
});
