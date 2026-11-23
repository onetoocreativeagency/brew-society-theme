/*
  Brand logo ring: auto-rotation and drag to spin.

  Each ring's turn lives here and is written to --bs-ring-turn-inner and
  --bs-ring-turn-outer on the list. The CSS turns the ring's items by it and
  their links back by the same amount, so logos stay upright. Only the rotate
  property changes, so a frame does no layout.

  - Auto-rotation: one full turn every --bs-ring-duration, the outer ring the
    other way. Off when the section's Rotate setting is off and for reduced
    motion. Eases to a stop while the mouse or pen moves over a logo, or a logo
    has keyboard focus. Nothing ticks while the section is off screen or still.
  - Drag: press anywhere on the stage except the button and move. The ring under
    the pointer (picked by distance from the centre) follows it around the
    centre. On release it keeps the flick's speed and eases back to the auto
    speed. Reduced motion: no momentum, the ring stops where it is let go.
  - Touch: touch-action pan-y leaves vertical swipes to the page, and a spin
    starts only once the finger has moved a few px, mostly sideways.
  - A press that became a drag never follows a link.
*/
if (!customElements.get('bs-brand-ring')) {
  const DRAG_THRESHOLD = 6; // px a press must move to become a drag
  const EASE_SECONDS = 0.6; // how quickly a flick settles back to the auto speed
  const MAX_SPEED = 900; // deg per second, cap on a flick
  const RING_SPLIT = 0.345; // distance from the centre, as a share of the stage width, between the rings
  const DEAD_CENTRE = 0.1; // closer than this an angle is too twitchy to follow
  const SAMPLE_MS = 100; // flick speed is measured over the last 100ms of the drag
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  customElements.define(
    'bs-brand-ring',
    class BsBrandRing extends HTMLElement {
      connectedCallback() {
        this.list = this.querySelector('.bs-brand-ring__list');
        const seconds = parseFloat(this.style.getPropertyValue('--bs-ring-duration')) || 120;
        const auto = this.classList.contains('bs-brand-ring__stage--rotate') ? 360 / seconds : 0;

        // Start where the CSS animation, shown until this script runs, has got to.
        const cssAnimation = this.querySelector('.bs-brand-ring__item--inner')?.getAnimations?.()[0];
        const start = cssAnimation ? (((cssAnimation.currentTime || 0) / 1000 / seconds) * 360) % 360 : 0;

        this.rings = {
          inner: { name: 'inner', turn: start, speed: auto, auto },
          outer: { name: 'outer', turn: -start, speed: -auto, auto: -auto },
        };
        this.single = this.classList.contains('bs-brand-ring__stage--single');
        this.drag = null;
        this.dragged = false;
        this.visible = false;
        this.render();
        this.classList.add('bs-brand-ring__stage--js');

        this.tick = this.tick.bind(this);
        this.wake = this.wake.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.addEventListener('pointerdown', this.onPointerDown);
        this.addEventListener('pointermove', this.onPointerMove);
        this.addEventListener('pointerup', this.onPointerUp);
        this.addEventListener('pointercancel', this.onPointerUp);
        this.addEventListener('dragstart', (event) => event.preventDefault());
        this.addEventListener(
          'click',
          (event) => {
            // detail is 0 for a click from the keyboard, which is never a drag.
            if (this.dragged && event.detail) {
              event.preventDefault();
              event.stopPropagation();
            }
          },
          true
        );

        // Moving over a logo holds the rings. pointermove, not pointerover, so a logo
        // spinning in under a pointer that was let go of after a drag does not count.
        this.list.addEventListener('pointermove', (event) => {
          if (event.pointerType !== 'touch' && !this.drag?.active) this.hovered = true;
        });
        this.list.addEventListener('pointerout', (event) => {
          if (this.list.contains(event.relatedTarget)) return;
          this.hovered = false;
          this.wake();
        });
        this.list.addEventListener('focusin', (event) => {
          this.focused = event.target.matches(':focus-visible');
        });
        this.list.addEventListener('focusout', () => {
          this.focused = false;
          this.wake();
        });
        reducedMotion.addEventListener('change', this.wake);

        this.observer = new IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          if (this.visible) {
            this.wake();
          } else {
            cancelAnimationFrame(this.frame);
            this.frame = null;
            this.last = null;
          }
        });
        this.observer.observe(this);
      }

      disconnectedCallback() {
        this.observer.disconnect();
        reducedMotion.removeEventListener('change', this.wake);
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }

      wake() {
        if (this.visible && !this.frame) this.frame = requestAnimationFrame(this.tick);
      }

      tick(now) {
        this.frame = null;
        const seconds = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
        const dragging = this.drag?.active ? this.drag.ring : null;
        const holding = !dragging && (this.hovered || this.focused);
        let moving = Boolean(dragging);

        for (const ring of [this.rings.inner, this.rings.outer]) {
          if (ring === dragging) continue;
          if (reducedMotion.matches) {
            ring.speed = 0;
          } else {
            const target = holding ? 0 : ring.auto;
            ring.speed = target + (ring.speed - target) * Math.exp(-seconds / EASE_SECONDS);
            if (Math.abs(ring.speed - target) < 0.01) ring.speed = target;
          }
          ring.turn = (ring.turn + ring.speed * seconds) % 360;
          if (ring.speed) moving = true;
        }

        this.render();
        if (moving && this.visible) {
          this.last = now;
          this.frame = requestAnimationFrame(this.tick);
        } else {
          this.last = null;
        }
      }

      render() {
        for (const ring of [this.rings.inner, this.rings.outer]) {
          const value = `${ring.turn.toFixed(3)}deg`;
          if (ring.rendered === value) continue;
          ring.rendered = value;
          this.list.style.setProperty(`--bs-ring-turn-${ring.name}`, value);
        }
      }

      onPointerDown(event) {
        this.dragged = false;
        if (this.drag || !event.isPrimary || event.button !== 0) return;
        if (event.target.closest('.bs-brand-ring__button')) return;

        const rect = this.getBoundingClientRect();
        const centreX = rect.left + rect.width / 2;
        const centreY = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - centreX, event.clientY - centreY) / rect.width;
        if (distance < DEAD_CENTRE) return;

        this.drag = {
          id: event.pointerId,
          touch: event.pointerType === 'touch',
          ring: this.single || distance < RING_SPLIT ? this.rings.inner : this.rings.outer,
          centreX,
          centreY,
          startX: event.clientX,
          startY: event.clientY,
          angle: this.angleOf(event, centreX, centreY),
          active: false,
          samples: [],
        };
      }

      onPointerMove(event) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.id) return;

        if (!drag.active) {
          const moveX = event.clientX - drag.startX;
          const moveY = event.clientY - drag.startY;
          if (Math.hypot(moveX, moveY) < DRAG_THRESHOLD) return;
          // Mostly up or down on touch: a scroll, leave it to the page.
          if (drag.touch && Math.abs(moveY) > Math.abs(moveX)) {
            this.drag = null;
            return;
          }
          drag.active = true;
          this.dragged = true;
          drag.ring.speed = 0;
          this.setPointerCapture(drag.id);
          this.classList.add('bs-brand-ring__stage--dragging');
        }

        const angle = this.angleOf(event, drag.centreX, drag.centreY);
        let delta = angle - drag.angle;
        delta -= 360 * Math.round(delta / 360);
        drag.angle = angle;
        drag.ring.turn += delta;

        drag.samples.push({ time: event.timeStamp, turn: drag.ring.turn });
        while (drag.samples[0].time < event.timeStamp - SAMPLE_MS) drag.samples.shift();
        this.wake();
      }

      onPointerUp(event) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.id) return;
        this.drag = null;
        if (!drag.active) return;

        this.classList.remove('bs-brand-ring__stage--dragging');
        this.hovered = false;
        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1];
        let speed = 0;
        // Held still before letting go: no flick.
        if (last.time > first.time && event.timeStamp - last.time < 80) {
          speed = ((last.turn - first.turn) / (last.time - first.time)) * 1000;
        }
        drag.ring.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
        this.wake();
      }

      angleOf(event, centreX, centreY) {
        return (Math.atan2(event.clientY - centreY, event.clientX - centreX) * 180) / Math.PI;
      }
    }
  );
}
