/*
  Image effects for the homepage hero.

  At rest the images sit where CSS puts them. Two effects reuse those same
  image elements, so no elements are created, and animate transform and
  opacity only:

  - Cycle (every device, and the opening state): images arrive in bursts of
    two or three, popping in one after another as a loose cluster, hold, and
    pop out as the next cluster arrives somewhere else, working through the
    list in order. Phones place clusters around set spots from Figma; wider
    screens pick a random place clear of the last clusters.
  - Trail (mouse): the first pointer move over the hero hurries the cycle's
    images away. Every time the pointer has travelled far enough, the next
    image eases in at the pointer, lingers, then shrinks away. When the pointer
    stops or leaves and the last trail image has gone, the cycle starts again.

  Visitors who prefer reduced motion get neither and see the resting arc.
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
        this.mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
        this.narrow = window.matchMedia('(max-width: 749px)');
        this.queries = [this.motion, this.mouse, this.narrow];
        this.onQueryChange = () => this.toggle();
        this.queries.forEach((query) => query.addEventListener('change', this.onQueryChange));
        this.onPointerMove = this.onPointerMove.bind(this);
        this.tick = this.tick.bind(this);
        this.toggle();
      }

      disconnectedCallback() {
        if (!this.queries) return;
        this.queries.forEach((query) => query.removeEventListener('change', this.onQueryChange));
        this.disable();
      }

      toggle() {
        let mode = null;
        if (this.motion.matches) mode = this.mouse.matches ? 'trail' : 'cycle';
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

        if (mode === 'trail') {
          this.lastSpawn = 0;
          this.anchor = null;
          // How long one image lives. Shorter when there are few images, so one
          // is rarely needed again while it is still on screen.
          this.life = Math.min(1100, Math.max(500, this.items.length * 70));
          this.trailing = false;
          this.addEventListener('pointermove', this.onPointerMove, { passive: true });
        }
        this.spot = 0;
        this.recent = [];
        this.cycling = false;
      }

      disable() {
        if (!this.mode) return;
        this.mode = null;
        this.removeEventListener('pointermove', this.onPointerMove);
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.clearBursts();
        this.cycling = false;
        this.animations.forEach((animation) => animation.cancel());
        this.rest();
        this.classList.remove('is-enhanced');
      }

      // Each image's resting centre, relative to the stage, and the distance the
      // pointer must travel between images.
      measure() {
        this.origins = this.items.map((item) => [item.offsetLeft, item.offsetTop]);
        this.distance = Math.max(60, this.items[0].offsetWidth * 0.55);
        if (!this.cycling && !this.trailing) this.startCycle();
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

      // The cursor takes over: no new pops, and the ones showing leave quickly.
      stopCycle() {
        if (!this.cycling) return;
        this.cycling = false;
        this.clearBursts();
        this.animations.forEach((animation) => {
          if (animation.playState === 'running') animation.playbackRate = 4;
        });
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

      onPointerMove(event) {
        if (event.pointerType === 'touch' || !this.onScreen) return;
        this.trailing = true;
        this.stopCycle();
        this.pointer = [event.clientX, event.clientY];
        if (!this.anchor) {
          this.lag = [...this.pointer];
          this.anchor = [...this.pointer];
        }
        if (!this.frame) this.frame = requestAnimationFrame(this.tick);
      }

      tick(now) {
        this.frame = 0;
        if (document.hidden || !this.onScreen || !this.origins) return;

        const [x, y] = this.pointer;
        this.lag[0] += (x - this.lag[0]) * 0.2;
        this.lag[1] += (y - this.lag[1]) * 0.2;

        const travelled = Math.hypot(x - this.anchor[0], y - this.anchor[1]);
        if (travelled >= this.distance && now - this.lastSpawn >= 70) {
          this.spawn();
          this.anchor = [x, y];
          this.lastSpawn = now;
        }

        // Keep going until the lagging point has caught up with the pointer.
        if (Math.hypot(x - this.lag[0], y - this.lag[1]) > 0.5) {
          this.frame = requestAnimationFrame(this.tick);
        }
      }

      spawn() {
        const stage = this.stage.getBoundingClientRect();
        const toX = this.pointer[0] - stage.left;
        const toY = this.pointer[1] - stage.top;
        const fromX = this.lag[0] - stage.left;
        const fromY = this.lag[1] - stage.top;

        this.show(
          (at) => [
            { opacity: 0, transform: at(fromX, fromY, 0.7), easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
            { opacity: 1, transform: at(toX, toY, 1), offset: 0.3 },
            { opacity: 1, transform: at(toX, toY, 1), offset: 0.6, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
            { opacity: 0, transform: at(toX, toY, 0.6) },
          ],
          this.life
        );

        // Back to the cycle once the last image of the trail has gone.
        clearTimeout(this.restTimer);
        this.restTimer = setTimeout(() => {
          this.trailing = false;
          this.anchor = null;
          this.startCycle();
        }, this.life + 50);
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
        clearTimeout(this.restTimer);
        this.classList.remove('is-active');
        this.depth = 1;
        this.items.forEach((item) => item.style.removeProperty('z-index'));
      }
    }
  );
}
