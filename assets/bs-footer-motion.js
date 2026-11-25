/*
  Footer motion (sections/footer.liquid, styles in section-footer.css).

  Products around Order Wholesale: tucked behind the pill at rest, they burst out to their Figma
  places on hover of the cluster or keyboard focus on the pill, and tuck back on leave. Without
  hover (touch), the burst is scrubbed by the scroll (ScrollTrigger). With reduced motion, or
  without GSAP, they stay where the CSS puts them: out, as in Figma.

  "BrewSociety. ©2026" strip: a CSS loop; this pauses it while it is off screen.
*/
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initStrip(strip) {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => strip.classList.toggle('is-paused', !entry.isIntersecting));
    }).observe(strip);
  }

  // Tucked: smaller and less turned, spread along the pill (45% of their burst distance across)
  // and all resting at one height behind it, with the same sliver (3% of the cluster) peeking
  // over the top edge.
  const TUCK_SPREAD = 0.45;
  const TUCK_SCALE = 0.6;
  const TUCK_TURN = 0.3;
  const TUCK_PEEK = 0.03;

  function initCluster(cluster) {
    if (reduceMotion || !window.gsap) return;
    const products = Array.from(cluster.querySelectorAll('.footer__product'));
    const pill = cluster.querySelector('.footer__wholesale');
    if (!products.length || !pill) return;

    // data-tuck-x/y: distance from the product's centre to the pill's, in cluster widths.
    const rotation = (el) => parseFloat(el.dataset.rotation) || 0;
    const tucked = {
      x: (i, el) => parseFloat(el.dataset.tuckX) * cluster.offsetWidth * (1 - TUCK_SPREAD),
      y: (i, el) => {
        const width = cluster.offsetWidth;
        const centre = -pill.offsetHeight / 2 + (el.offsetHeight * TUCK_SCALE) / 2 - width * TUCK_PEEK;
        return centre + parseFloat(el.dataset.tuckY) * width;
      },
      rotation: (i, el) => rotation(el) * TUCK_TURN,
      scale: TUCK_SCALE,
    };
    gsap.set(products, { xPercent: -50, yPercent: -50, ...tucked });

    let open = false;
    const burst = () => {
      if (open) return;
      open = true;
      gsap.killTweensOf(products);
      gsap.to(products, {
        x: 0,
        y: 0,
        rotation: (i, el) => rotation(el),
        scale: 1,
        duration: 1,
        ease: 'elastic.out(1, 0.55)',
        stagger: { each: 0.04, from: 'center' },
      });
    };
    const tuck = () => {
      if (!open) return;
      open = false;
      gsap.killTweensOf(products);
      gsap.to(products, { ...tucked, duration: 0.45, ease: 'power3.inOut', stagger: { each: 0.025, from: 'edges' } });
    };

    if (window.matchMedia('(hover: hover)').matches) {
      cluster.addEventListener('mouseenter', burst);
      cluster.addEventListener('mouseleave', () => {
        if (!pill.matches(':focus-visible')) tuck();
      });
      pill.addEventListener('focus', burst);
      pill.addEventListener('blur', () => {
        if (!cluster.matches(':hover')) tuck();
      });
      // Keep the tuck in step with the pill when the layout changes size.
      window.addEventListener('resize', () => {
        if (!open) gsap.set(products, tucked);
      });
    } else if (window.ScrollTrigger) {
      // No hover (touch): the burst follows the scroll. Tucked as the cluster comes up into view,
      // fully out by the time the pill reaches the middle of the screen (or the page ends first),
      // tucked again on the way back up. Each product takes its own slice of the range.
      const tl = gsap.timeline({ paused: true }).fromTo(products, tucked, {
        x: 0,
        y: 0,
        rotation: (i, el) => rotation(el),
        scale: 1,
        duration: 1,
        ease: 'back.inOut(1.2)',
        stagger: { each: 0.12, from: 'center' },
      });
      // Measured live because the footer parallax moves the cluster while it scrolls in.
      const inner = cluster.closest('[data-footer-parallax-inner]') || cluster;
      const update = () => {
        const vh = window.innerHeight;
        const c = cluster.getBoundingClientRect();
        const p = pill.getBoundingClientRect();
        const range = Math.min(vh / 2 + (p.top + p.height / 2 - c.top), inner.getBoundingClientRect().bottom - c.top);
        const progress = gsap.utils.clamp(0, 1, (vh - c.top) / range);
        gsap.to(tl, { progress, duration: 0.4, ease: 'power1.out', overwrite: true });
      };
      ScrollTrigger.create({
        trigger: cluster.closest('[data-footer-parallax]') || cluster,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: update,
        onRefresh: update,
        onLeaveBack: () => gsap.to(tl, { progress: 0, duration: 0.4, overwrite: true }),
      });
      window.addEventListener('resize', () => {
        tl.invalidate();
        update();
      });
    } else {
      pill.addEventListener('focus', burst);
      if (!('IntersectionObserver' in window)) return burst();
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          burst();
        },
        { threshold: 0.6 }
      );
      observer.observe(cluster);
    }
  }

  function init() {
    document.querySelectorAll('[data-footer-marquee]').forEach(initStrip);
    document.querySelectorAll('[data-footer-cluster]').forEach(initCluster);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
