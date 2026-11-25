/* Button roll on hover (Osmo Supply "Button 071").
   Osmo's timer and keyframe logic, applied at runtime to the theme's text buttons so no
   button markup changes. Each label is copied into a default and a hover copy, both
   aria-hidden, with one visually-hidden copy for screen readers. Buttons rendered later
   (cart drawer, variant changes) and labels rewritten by Dawn's JS ("Sold out") are
   picked up by a MutationObserver. */
(function () {
  if (!window.gsap || !window.SplitText) return;

  // Dawn text buttons and pills, the Steps cards' buttons (their own class, same pill), and
  // the linked pills in a brand page's header (category, website, Instagram, info pack).
  const BUTTONS = '.button, .bs-steps__button, a.bs-brand-hero__pill';
  const SKIP = '.skip-to-content-link, .button--icon-only, .bs-pill--close, .slider-button, .quantity__button, [data-button-071-off]';
  // Elements that may sit beside a label without making the button "not text-only".
  const ALLOWED_SIBLINGS = '.visually-hidden, .loading__spinner';

  const parseTimeToMs = (value) => { if (!value) return 0; const v = String(value).trim(); if (v.endsWith('ms')) return parseFloat(v); if (v.endsWith('s')) return parseFloat(v) * 1000; const n = parseFloat(v); return Number.isFinite(n) ? n * 1000 : 0; };
  const getStaggerIndex = (i, count, from) => { if (from === 'right') return count - 1 - i; if (from === 'center') { const center = (count - 1) / 2; return Math.abs(i - center); } return i; };

  const state = new WeakMap();

  // The element whose text is the label: the button itself, or (Dawn's Add to cart) its one
  // label span, which product-form.js rewrites with textContent.
  function findHost(button) {
    const elements = Array.from(button.children);
    const ownText = Array.from(button.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    const labels = elements.filter((el) => !el.matches(ALLOWED_SIBLINGS));
    if (ownText && labels.length === 0) return button;
    if (!ownText && labels.length === 1 && labels[0].tagName === 'SPAN' && labels[0].children.length === 0) return labels[0];
    return null;
  }

  function build(button, host) {
    const textNodes = Array.from(host.childNodes).filter((n) => n.nodeType === 3);
    const label = textNodes.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (!label) return false;

    const old = state.get(button);
    if (old) old.splits.forEach((s) => s.revert());

    const srLabel = document.createElement('span');
    srLabel.className = 'visually-hidden';
    srLabel.textContent = label;
    const inner = document.createElement('span');
    inner.className = 'button-071__inner';
    inner.setAttribute('aria-hidden', 'true');
    ['is--default', 'is--hover'].forEach((variant) => {
      const text = document.createElement('span');
      text.className = 'button-071__text ' + variant;
      text.setAttribute('data-button-071-text', '');
      text.textContent = label;
      inner.appendChild(text);
    });
    host.insertBefore(srLabel, textNodes[0]);
    host.insertBefore(inner, textNodes[0]);
    textNodes.forEach((n) => n.remove());

    const entry = { host, groups: [], splits: [] };
    inner.querySelectorAll('[data-button-071-text]').forEach((textEl) => {
      const split = new SplitText(textEl, {
        type: 'words,chars',
        tag: 'span',
        aria: 'none',
        wordsClass: 'button-071__split-word',
        charsClass: 'button-071__split-char',
      });
      entry.groups.push(split.chars);
      entry.splits.push(split);
    });
    state.set(button, entry);
    return true;
  }

  // Each letter travels the button's full height, so it leaves and enters at the button's edge.
  const travel = new ResizeObserver((entries) => {
    entries.forEach((entry) => entry.target.style.setProperty('--button-071-travel', entry.target.offsetHeight + 'px'));
  });

  function bind(element) {
    travel.observe(element);
    const hoverRoot = element.closest('[data-hover]') || element;
    const styles = getComputedStyle(element);
    const speedMs = parseTimeToMs(styles.getPropertyValue('--button-071-speed'));
    const staggerMs = parseTimeToMs(styles.getPropertyValue('--button-071-stagger'));
    const staggerFrom = (element.getAttribute('data-button-071-stagger-from') || 'left').toLowerCase();

    let timers = [];
    const allChars = () => state.get(element).groups.flat();
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const reset = () => { allChars().forEach((c) => c.classList.remove('is--animating')); void hoverRoot.offsetWidth; };
    const play = () => { state.get(element).groups.forEach((chars) => { const count = chars.length; chars.forEach((char, i) => { const sIndex = getStaggerIndex(i, count, staggerFrom); const startAt = sIndex * staggerMs; const endAt = startAt + speedMs; timers.push(setTimeout(() => { char.classList.add('is--animating'); }, startAt)); timers.push(setTimeout(() => { char.classList.remove('is--animating'); }, endAt)); }); }); };
    const disabled = () => element.disabled || element.getAttribute('aria-disabled') === 'true' || element.classList.contains('loading');
    const onEnter = () => { if (disabled()) return; clearTimers(); reset(); play(); };
    const onFocusIn = () => { if (hoverRoot.matches(':focus-visible') && !disabled()) { clearTimers(); reset(); play(); } };
    hoverRoot.addEventListener('pointerenter', onEnter);
    hoverRoot.addEventListener('focusin', onFocusIn);
  }

  function enhance(button) {
    if (button.matches(SKIP)) return;
    const entry = state.get(button);
    // Already split and intact.
    if (entry && entry.host.isConnected && entry.host.querySelector(':scope > .button-071__inner')) return;
    const host = findHost(button);
    if (!host || !build(button, host)) return;
    if (!button.hasAttribute('data-button-071')) {
      button.setAttribute('data-button-071', '');
      if (!button.hasAttribute('data-button-071-stagger-from')) button.setAttribute('data-button-071-stagger-from', 'center');
      button.classList.add('button-071');
      bind(button);
    }
  }

  function scan(root) {
    if (root.matches && root.matches(BUTTONS)) enhance(root);
    if (root.querySelectorAll) root.querySelectorAll(BUTTONS).forEach(enhance);
  }

  function initButton071() {
    gsap.registerPlugin(SplitText);
    scan(document);

    let pending = new Set();
    let queued = false;
    const flush = () => { queued = false; const nodes = pending; pending = new Set(); nodes.forEach((node) => { if (node.isConnected) scan(node); }); };
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.target.closest && m.target.closest('.button-071__inner')) return;
        const button = m.target.closest && m.target.closest(BUTTONS);
        pending.add(button || m.target);
      });
      if (!queued && pending.size) { queued = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => { document.fonts.ready.then(function () { initButton071(); }); });
})();
