/*
  Image effects for the homepage hero.

  At rest the images sit where CSS puts them. The cycle reuses those same
  image elements, so no elements are created, and animates transform and
  opacity only: images arrive in bursts of two or three, popping in one after
  another as a loose cluster, hold, and pop out as the next cluster arrives
  somewhere else, working through the list in order. Phones place clusters
  around set spots from Figma; wider screens pick a random place clear of the
  last clusters. The images do not follow the mouse (the client found the
  trail distracting).

  Visitors who prefer reduced motion see the resting arc.
*/
if (!customElements.get('bs-hero-trail')) {
  // Where images pop on phones: centre x and y, percent of the image area.
  // The first three are the resting places from Figma (mobile 4203:4836).
  const CYCLE_SPOTS = [
    [25.55, 61.73],
    [62.11, 24.32],
    [84.61, 63.11],
    [20, 20],
  ];
  const BURST_INTERVAL = 1900; // phones: time between clusters
  const BURST_INTERVAL_WIDE = 1700;
  const BURST_GAP = 140; // between the images of one cluster
  const BURST_OVERLAP = 700; // a cluster is still leaving as the next arrives

  customElements.define(
    'bs-hero-trail',
    class BsHeroTrail extends HTMLElement {
      connectedCallback() {
        this.stage = this.querySelector('.bs-hero-trail__stage');
        if (!this.hasAttribute('data-trail') || !this.stage) return;

        this.items = Array.from(this.stage.children);
        this.motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
        this.narrow = window.matchMedia('(max-width: 749px)');
        this.queries = [this.motion, this.narrow];
        this.onQueryChange = () => this.toggle();
        this.queries.forEach((query) => query.addEventListener('change', this.onQueryChange));
        this.toggle();
      }

      disconnectedCallback() {
        if (!this.queries) return;
        this.queries.forEach((query) => query.removeEventListener('change', this.onQueryChange));
        this.disable();
      }

      toggle() {
        const mode = this.motion.matches ? 'cycle' : null;
        if (mode === this.mode) return;
        this.disable();
        if (mode) this.enable(mode);
      }

      enable(mode) {
        this.mode = mode;
        this.index = 0;
        this.depth = 1;
        this.animations = new Map();
        this.classList.add('is-enhanced');

        this.resizeObserver = new ResizeObserver(() => this.measure());
        this.resizeObserver.observe(this.stage);
        this.intersectionObserver = new IntersectionObserver(([entry]) => {
          this.onScreen = entry.isIntersecting;
        });
        this.intersectionObserver.observe(this);

        this.spot = 0;
        this.recent = [];
        this.cycling = false;
      }

      disable() {
        if (!this.mode) return;
        this.mode = null;
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        this.clearBursts();
        this.cycling = false;
        this.animations.forEach((animation) => animation.cancel());
        this.rest();
        this.classList.remove('is-enhanced');
      }

      // Each image's resting centre, relative to the stage.
      measure() {
        this.origins = this.items.map((item) => [item.offsetLeft, item.offsetTop]);
        if (!this.cycling) this.startCycle();
      }

      // Opens with a cluster straight away, then one every interval.
      startCycle() {
        if (this.cycling) return;
        this.cycling = true;
        this.classList.add('is-active');
        this.interval = this.narrow.matches ? BURST_INTERVAL : BURST_INTERVAL_WIDE;
        this.burstTimers = [];
        this.burst();
        this.cycleTimer = setInterval(() => this.burst(), this.interval);
      }

      clearBursts() {
        clearInterval(this.cycleTimer);
        (this.burstTimers || []).forEach((timer) => clearTimeout(timer));
        this.burstTimers = [];
      }

      // Two or three images pop in one after another around one place.
      burst() {
        if (document.hidden || this.onScreen === false || !this.origins) return;
        const count = 2 + (Math.random() < 0.55 ? 1 : 0);
        const centre = this.clusterCentre(count);
        const life = this.interval + BURST_OVERLAP;
        this.burstTimers = [];
        for (let i = 0; i < count; i += 1) {
          const spot = this.spotNear(centre, i, count);
          this.burstTimers.push(setTimeout(() => this.pop(life, spot), i * BURST_GAP));
        }
      }

      // Plays one appearance of the next image in the list. `keyframes` receives
      // a function that builds a transform for a point in the stage and a scale.
      show(keyframes, duration) {
        const position = this.index % this.items.length;
        const item = this.items[position];
        const [originX, originY] = this.origins[position];
        const rotation = (Math.random() * 36 - 18).toFixed(1);
        const at = (x, y, scale) =>
          `translate(calc(-50% + ${(x - originX).toFixed(1)}px), calc(-50% + ${(y - originY).toFixed(1)}px)) rotate(${rotation}deg) scale(${scale})`;

        this.index += 1;
        this.classList.add('is-active');
        item.style.zIndex = this.depth += 1;

        const previous = this.animations.get(item);
        if (previous) previous.cancel();
        this.animations.set(item, item.animate(keyframes(at), { duration }));
      }

      pop(duration, spot) {
        if (document.hidden || this.onScreen === false || !this.origins) return;
        // Wait for the next image rather than pop an empty box.
        const next = this.items[this.index % this.items.length];
        if (!next.complete || !next.naturalWidth) return;

        const [x, y] = spot;

        this.show(
          (at) => [
            { opacity: 0, transform: at(x, y, 0.6), easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
            { opacity: 1, transform: at(x, y, 1), offset: 0.12 },
            { opacity: 1, transform: at(x, y, 1), offset: 0.9, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
            { opacity: 0, transform: at(x, y, 0.6) },
          ],
          duration
        );
      }

      // Where a cluster goes, in px within the stage. Phones take the set spots in
      // turn; wider screens a random place clear of the last two clusters.
      clusterCentre(count) {
        const width = this.stage.offsetWidth;
        const height = this.stage.offsetHeight;
        if (this.narrow.matches) {
          const [spotX, spotY] = CYCLE_SPOTS[this.spot % CYCLE_SPOTS.length];
          this.spot += 1;
          return [((spotX + Math.random() * 6 - 3) / 100) * width, ((spotY + Math.random() * 6 - 3) / 100) * height];
        }
        const size = this.items[0].offsetWidth;
        const half = (size * (1 + 0.7 * (count - 1))) / 2;
        let centre;
        for (let tries = 0; tries < 16; tries += 1) {
          centre = [
            half + Math.random() * Math.max(0, width - half * 2),
            size * 0.8 + Math.random() * Math.max(0, height - size * 1.6),
          ];
          if (this.recent.every(([x, y]) => Math.hypot(centre[0] - x, centre[1] - y) > size * 2.2)) break;
        }
        this.recent = [centre, ...this.recent].slice(0, 2);
        return centre;
      }

      // The i-th of `count` images in a cluster: side by side and slightly
      // overlapping, loosely staggered up and down, kept inside the stage.
      spotNear([cx, cy], i, count) {
        const size = this.items[0].offsetWidth;
        const step = size * (this.narrow.matches ? 0.5 : 0.7);
        const x = cx + (i - (count - 1) / 2) * step + (Math.random() - 0.5) * size * 0.2;
        const y = cy + (Math.random() - 0.5) * size * 0.6;
        const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));
        return [
          clamp(x, size / 2, this.stage.offsetWidth - size / 2),
          clamp(y, size * 0.6, this.stage.offsetHeight - size * 0.6),
        ];
      }

      rest() {
        this.classList.remove('is-active');
        this.depth = 1;
        this.items.forEach((item) => item.style.removeProperty('z-index'));
      }
    }
  );
}
