const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
        const isOpen = navigation.classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    navigation.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navigation.classList.remove('open');
            menuButton.setAttribute('aria-expanded', 'false');
        });
    });
}

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => {
    revealObserver.observe(element);
});
