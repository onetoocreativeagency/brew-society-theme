/*
  Rolling step numbers (bs-steps: home Wholesale steps, About 01/02/03).
  The last digit is a strip of digits that rolls like a counter: when the card scrolls into view it
  starts at 0 and spins one full turn to land on its number ("03" counts 00 ... 09, 00 ... 03),
  card after card; with a mouse, hovering the card spins it one more turn.
  The digit in the flow is the real one, so the number keeps its size and place; the others sit
  above it out of the flow, and the column clips to the digit's line.
  Needs gsap.min.js and ScrollTrigger.min.js. Without them, without JS or with reduced motion the
  number is static.
*/
if (!customElements.get('bs-roll-number')) {
  customElements.define(
    'bs-roll-number',
    class BsRollNumber extends HTMLElement {
      connectedCallback() {
        if (this.strip || !window.gsap || !window.ScrollTrigger) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const text = this.textContent.trim();
        const digit = text.slice(-1);
        if (!/\d/.test(digit)) return;
        gsap.registerPlugin(ScrollTrigger);

        // Positions 0 ... 10 + n: one full turn, then on to n. The last is the digit in the flow.
        this.turns = 10 + Number(digit);
        const column = document.createElement('span');
        column.className = 'bs-roll-number__column';
        this.strip = document.createElement('span');
        this.strip.className = 'bs-roll-number__strip';
        this.strip.textContent = digit;
        for (let position = 0; position < this.turns; position += 1) {
          const ghost = document.createElement('span');
          ghost.className = 'bs-roll-number__ghost';
          ghost.style.setProperty('--bs-roll-offset', position - this.turns);
          ghost.textContent = position % 10;
          this.strip.append(ghost);
        }
        column.append(this.strip);
        this.replaceChildren(text.slice(0, -1), column);

        this.card = this.closest('.bs-steps__item') || this;
        const cards = this.card.parentElement ? [...this.card.parentElement.children] : [this.card];
        this.delay = Math.max(0, cards.indexOf(this.card)) * 0.15;
        this.state = { roll: this.turns };
        this.render();

        this.trigger = ScrollTrigger.create({
          trigger: this.card,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            this.entered = true;
            this.spin(this.turns, { duration: 1.6, ease: 'power3.out', delay: this.delay });
          },
        });
        this.onHover = (event) => {
          if (event.pointerType === 'mouse' && this.entered && !this.tween?.isActive()) {
            this.spin(10, { duration: 0.9, ease: 'power2.inOut' });
          }
        };
        this.card.addEventListener('pointerenter', this.onHover);
      }

      disconnectedCallback() {
        if (this.trigger) this.trigger.kill();
        if (this.tween) this.tween.kill();
        if (this.card) this.card.removeEventListener('pointerenter', this.onHover);
      }

      // Rolls from `from` positions back to the digit in the flow.
      spin(from, vars) {
        if (this.tween) this.tween.kill();
        this.state.roll = from;
        this.tween = gsap.to(this.state, { ...vars, roll: 0, onUpdate: () => this.render() });
      }

      render() {
        this.strip.style.setProperty('--bs-roll', this.state.roll.toFixed(4));
      }
    }
  );
}
