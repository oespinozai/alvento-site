// Parallax for .ill-band images: the image drifts slower than the page while its band is on screen.
(function () {
  var bands = [].slice.call(document.querySelectorAll('.ill-band'));
  if (!bands.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = new Set();
  var ticking = false;

  function update() {
    ticking = false;
    if (reduce) return;
    var vh = window.innerHeight;
    active.forEach(function (band) {
      var r = band.getBoundingClientRect();
      // 0 when the band enters at the bottom, 1 when it leaves at the top
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      // image is 24% taller than the band, so it can travel 12% each way
      band._img.style.transform = 'translate3d(0,' + ((0.5 - p) * 0.24 * r.height).toFixed(1) + 'px,0)';
    });
  }
  function request() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        active.add(e.target);
      } else {
        active.delete(e.target);
      }
    });
    request();
  }, { rootMargin: '10% 0px' });

  bands.forEach(function (band) {
    band._img = band.querySelector('.ill-band__img');
    io.observe(band);
  });
  if (reduce) return;
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
})();
