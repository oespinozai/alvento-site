// Decorative idle animation only. No audio element, playback, or audio graph.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
for (const cover of document.querySelectorAll('.foyer-cover')) {
  const canvas = cover.querySelector('canvas');
  const toggle = cover.querySelector('button');
  let orb, paused = false, visible = false, pending = false;
  async function sync() {
    if (motion.matches || paused) {
      orb?.destroy(); orb = null;
      cover.classList.remove('is-animated');
      toggle.hidden = motion.matches;
      return;
    }
    if (orb || pending || !visible) return;
    pending = true;
    try {
      const { createAlventoOrb } = await import('/alvento-orb.js');
      if (motion.matches || paused || !visible) return;
      orb = createAlventoOrb(canvas);
      cover.classList.add('is-animated');
      toggle.hidden = false;
    } catch (error) {
      // The existing orb image remains visible when WebGL/CDN is unavailable.
      console.warn('Foyer cover animation unavailable:', error);
    } finally { pending = false; }
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? 'Play animation' : 'Pause animation';
    void sync();
  });
  motion.addEventListener('change', () => void sync());
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    void sync();
  }).observe(cover);
}
