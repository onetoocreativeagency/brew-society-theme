/*
  Footer parallax (Osmo Supply, "Footer Parallax Effect"). Markup in sections/footer.liquid,
  styles in section-footer.css.

  Scrubbed to the scroll: as the footer's wrapper comes up from the bottom of the screen the
  footer starts 25% higher and settles into place, while the dark veil over it fades from 50%
  to nothing. Tune the amount with yPercent only.

  Needs gsap.min.js and ScrollTrigger.min.js, loaded deferred before this file (layout/theme.liquid).
  With reduced motion, or without GSAP, the footer stays still and the veil stays invisible.
*/
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Osmo's code, unchanged.
  gsap.registerPlugin(ScrollTrigger);
  function initFooterParallax(){
    document.querySelectorAll('[data-footer-parallax]').forEach(el => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'clamp(top bottom)', end: 'clamp(top top)', scrub: true } });
      const inner = el.querySelector('[data-footer-parallax-inner]');
      const dark  = el.querySelector('[data-footer-parallax-dark]');
      if (inner) { tl.from(inner, { yPercent: -25, ease: 'linear' }); }
      if (dark) { tl.from(dark, { opacity: 0.5, ease: 'linear' }, '<'); }
    });
  }
  document.addEventListener('DOMContentLoaded', () => { initFooterParallax(); });
})();
