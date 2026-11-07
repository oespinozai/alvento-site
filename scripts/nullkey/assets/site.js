const menu = document.querySelector('.mobile-nav');
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
menu?.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});

const demo = document.querySelector('.demo-player');
if (demo) {
  if (matchMedia('(max-width: 780px)').matches && demo.dataset.posterPortrait) demo.poster = demo.dataset.posterPortrait;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm && 'IntersectionObserver' in window) {
    let visible = false;
    demo.addEventListener('pause', () => { if (visible) demo.dataset.userPaused = '1'; });
    demo.addEventListener('play', () => { delete demo.dataset.userPaused; });
    new IntersectionObserver(entries => entries.forEach(entry => {
      visible = entry.isIntersecting;
      if (visible) { if (!demo.dataset.userPaused) demo.play().catch(() => {}); }
      else demo.pause();
    }), { threshold: 0.5 }).observe(demo);
  }
}
