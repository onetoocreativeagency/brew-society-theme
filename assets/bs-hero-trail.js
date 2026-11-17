/*
  Image trail for the homepage hero.

  At rest the images sit in the arc that CSS gives them. Once a mouse moves over
  the hero the arc fades out and the same image elements are reused as the
  trail: every time the pointer has travelled far enough, the next image eases
  in at the pointer, lingers, then shrinks away. When the pointer leaves or
  stops, the last trail images finish and the arc fades back in.

  Only transform and opacity are animated. The pool is the images already in
  the page, so no elements are created.
*/
if (!customElements.get('bs-hero-trail')) {
  customElements.define(
    'bs-hero-trail',
    class BsHeroTrail extends HTMLElement {
      connectedCallback() {
        this.stage = this.querySelector('.bs-hero-trail__stage');
        if (!this.hasAttribute('data-trail') || !this.stage) return;

        this.items = Array.from(this.stage.children);
        this.queries = [
          window.matchMedia('(hover: hover) and (pointer: fine)'),
          window.matchMedia('(prefers-reduced-motion: no-preference)'),
        ];
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
        if (this.queries.every((query) => query.matches)) this.enable();
        else this.disable();
      }

      enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.index = 0;
        this.depth = 1;
        this.lastSpawn = 0;
        this.animations = new Map();
        // How long one image lives. Shorter when there are few images, so one is
        // rarely needed again while it is still on screen.
        this.life = Math.min(1100, Math.max(500, this.items.length * 70));
        this.classList.add('is-enhanced');

        this.resizeObserver = new ResizeObserver(() => this.measure());
        this.resizeObserver.observe(this.stage);
        this.intersectionObserver = new IntersectionObserver(([entry]) => {
          this.onScreen = entry.isIntersecting;
        });
        this.intersectionObserver.observe(this);
        this.addEventListener('pointermove', this.onPointerMove, { passive: true });
      }

      disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.removeEventListener('pointermove', this.onPointerMove);
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.animations.forEach((animation) => animation.cancel());
        this.rest();
        this.classList.remove('is-enhanced');
      }

      // Each image's resting centre, relative to the stage, and the distance the
      // pointer must travel between images.
      measure() {
        this.origins = this.items.map((item) => [item.offsetLeft, item.offsetTop]);
        this.distance = Math.max(60, this.items[0].offsetWidth * 0.55);
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
        const position = this.index % this.items.length;
        const item = this.items[position];
        const [originX, originY] = this.origins[position];
        const stage = this.stage.getBoundingClientRect();
        const toX = this.pointer[0] - stage.left - originX;
        const toY = this.pointer[1] - stage.top - originY;
        const fromX = this.lag[0] - stage.left - originX;
        const fromY = this.lag[1] - stage.top - originY;
        const rotation = (Math.random() * 36 - 18).toFixed(1);
        const at = (dx, dy, scale) =>
          `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) rotate(${rotation}deg) scale(${scale})`;

        this.index += 1;
        this.classList.add('is-trailing');
        item.style.zIndex = this.depth += 1;

        const previous = this.animations.get(item);
        if (previous) previous.cancel();
        this.animations.set(
          item,
          item.animate(
            [
              { opacity: 0, transform: at(fromX, fromY, 0.7), easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
              { opacity: 1, transform: at(toX, toY, 1), offset: 0.3 },
              { opacity: 1, transform: at(toX, toY, 1), offset: 0.6, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
              { opacity: 0, transform: at(toX, toY, 0.6) },
            ],
            { duration: this.life }
          )
        );

        // Back to the resting arc once the last image of the trail has gone.
        clearTimeout(this.restTimer);
        this.restTimer = setTimeout(() => this.rest(), this.life + 50);
      }

      rest() {
        clearTimeout(this.restTimer);
        this.classList.remove('is-trailing');
        this.depth = 1;
        this.items.forEach((item) => item.style.removeProperty('z-index'));
      }
    }
  );
}
