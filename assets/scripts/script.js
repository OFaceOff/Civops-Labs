lucide.createIcons();

window.onload = () => {
    const bootScreen = document.getElementById('boot-screen');
    const mainInterface = document.getElementById('main-interface');

    setTimeout(() => { document.getElementById('term-line-1').classList.remove('opacity-0'); }, 500);
    setTimeout(() => { document.getElementById('term-line-2').classList.remove('opacity-0'); }, 1200);
    setTimeout(() => { document.getElementById('term-line-3').classList.remove('opacity-0'); }, 1800);
    setTimeout(() => { document.getElementById('term-line-4').classList.remove('opacity-0'); }, 2400);

    setTimeout(() => {
        bootScreen.style.opacity = '0';
        mainInterface.classList.remove('hidden');
        
        setTimeout(() => {
            mainInterface.classList.remove('opacity-0');
            bootScreen.classList.add('hidden');
        }, 100);

    }, 3000);
};