// Dark mode functionality
const toggle = document.querySelector('.theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Set initial theme based on system preference
if (prefersDark.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.setAttribute('aria-checked', 'true');
}

// Toggle theme
toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        toggle.setAttribute('aria-checked', 'false');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.setAttribute('aria-checked', 'true');
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        const links = document.querySelectorAll('.product-link');
        if (links[index]) {
            links[index].click();
        }
    }
});