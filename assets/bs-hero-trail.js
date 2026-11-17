/*
  Image effects for the homepage hero.

  At rest the images sit where CSS puts them. Two effects reuse those same
  image elements, so no elements are created, and animate transform and
  opacity only:

  - Trail (mouse): once the pointer moves over the hero the resting arc fades
    out. Every time the pointer has travelled far enough, the next image eases
    in at the pointer, lingers, then shrinks away. When the pointer leaves or
    stops, the last images finish and the arc fades back in.
  - Cycle (phones): three or four images at a time pop in at loosely random
    spots, hold, and pop out, working through the list in order.

  Visitors who prefer reduced motion get neither.
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
  const CYCLE_INTERVAL = 1000;

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
        if (this.motion.matches) {
          if (this.mouse.matches) mode = 'trail';
          else if (this.narrow.matches) mode = 'cycle';
        }
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
          this.addEventListener('pointermove', this.onPointerMove, { passive: true });
        } else {
          this.spot = 0;
          this.cycling = false;
        }
      }

      disable() {
        if (!this.mode) return;
        this.mode = null;
        this.removeEventListener('pointermove', this.onPointerMove);
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        clearInterval(this.cycleTimer);
        this.animations.forEach((animation) => animation.cancel());
        this.rest();
        this.classList.remove('is-enhanced');
      }

      // Each image's resting centre, relative to the stage, and the distance the
      // pointer must travel between images.
      measure() {
        this.origins = this.items.map((item) => [item.offsetLeft, item.offsetTop]);
        this.distance = Math.max(60, this.items[0].offsetWidth * 0.55);
        if (this.mode === 'cycle' && !this.cycling) this.startCycle();
      }

      // Opens with three images at once, timed to leave one by one as the
      // regular rhythm brings in their replacements.
      startCycle() {
        this.cycling = true;
        for (let count = 1; count <= 3; count += 1) this.pop(CYCLE_INTERVAL * count + 400);
        this.cycleTimer = setInterval(() => this.pop(), CYCLE_INTERVAL);
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

        // Back to the resting arc once the last image of the trail has gone.
        clearTimeout(this.restTimer);
        this.restTimer = setTimeout(() => this.rest(), this.life + 50);
      }

      pop(duration = CYCLE_INTERVAL * 3 + 400) {
        if (document.hidden || this.onScreen === false || !this.origins) return;
        // Wait for the next image rather than pop an empty box.
        const next = this.items[this.index % this.items.length];
        if (!next.complete || !next.naturalWidth) return;

        const [spotX, spotY] = CYCLE_SPOTS[this.spot % CYCLE_SPOTS.length];
        const x = ((spotX + Math.random() * 6 - 3) / 100) * this.stage.offsetWidth;
        const y = ((spotY + Math.random() * 6 - 3) / 100) * this.stage.offsetHeight;
        this.spot += 1;

        // Each image outlives three intervals, so three are up, four as they swap.
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

      rest() {
        clearTimeout(this.restTimer);
        this.classList.remove('is-active');
        this.depth = 1;
        this.items.forEach((item) => item.style.removeProperty('z-index'));
      }
    }
  );
}
