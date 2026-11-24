/*
  Smooth scrolling site-wide (Osmo Supply, "Locomotive Smooth Scroll": Locomotive Scroll 5,
  built on Lenis). Loaded from layout/theme.liquid after locomotive-scroll.min.js.

  Wheel and trackpad scrolling eases; touch keeps the phone's own scrolling (Lenis's default).
  Lenis moves the real window scroll, so window.scrollY, anchors and ScrollTrigger keep working;
  ScrollTrigger is also updated on every Lenis frame so scrubbed effects never lag a frame.

  The instance is window.bsScroll (stop(), start(), scrollTo()). Not started in the theme editor
  or with reduced motion, so window.bsScroll is then undefined.

  Scroll locks: Dawn locks the page by putting an overflow-hidden class on the body (menu, cart
  drawer, filter drawer, search, media and popup modals). Smooth scrolling stops whenever the
  body is actually locked at the current width and starts again when it is released. Elements
  that scroll on their own carry data-lenis-prevent so the wheel scrolls them, not the page.
*/
(function () {
  if (!window.LocomotiveScroll || window.bsScroll) return;
  if (window.Shopify && window.Shopify.designMode) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scroll = new window.LocomotiveScroll({
    scrollCallback: () => {
      if (window.ScrollTrigger) window.ScrollTrigger.update();
    },
  });
  window.bsScroll = scroll;

  // The breakpoint classes (overflow-hidden-mobile, -tablet) only lock below their width.
  const isLocked = () => getComputedStyle(document.body).overflowY === 'hidden';
  let locked = false;
  const sync = () => {
    if (isLocked() === locked) return;
    locked = !locked;
    locked ? scroll.stop() : scroll.start();
  };
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', sync);
  sync();
})();
