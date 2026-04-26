const starsContainer = document.getElementById('starsContainer');
const starCount = 100;

function createStars() {
    if (!starsContainer) return;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random positions
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        // Random size
        const size = Math.random() * 2 + 1;
        
        // Random duration and delay
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 5;
        
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--duration', `${duration}s`);
        star.style.animationDelay = `${delay}s`;
        
        starsContainer.appendChild(star);
    }
}

// Subtle mouse parallax effect
document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    const moveX = (x - 0.5) * 20;
    const moveY = (y - 0.5) * 20;
    
    if (starsContainer) {
        starsContainer.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
});

createStars();