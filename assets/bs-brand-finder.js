/*
  A to Z brand finder on the Brands catalogue (snippets/bs-brand-finder.liquid).
  - Shown from when the grid or list reaches the bar until its end rises above
    the middle of the screen.
  - A letter scrolls to the first brand starting with it in the current view,
    clear of the sticky header (an instant jump with reduced motion).
  - The current letter (aria-current) follows the brand at the top of the screen.
  - Letters with no brand in the current view are disabled; this follows the
    category links and the grid/list switch (the 'bs-brands:render' event).
  Names are matched ignoring a leading "The " and accents; anything else goes under #.
*/
if (!customElements.get('bs-brand-finder')) {
  customElements.define(
    'bs-brand-finder',
    class BsBrandFinder extends HTMLElement {
      connectedCallback() {
        this.catalogue = this.closest('bs-brand-catalogue');
        if (!this.catalogue) return;
        this.buttons = Array.from(this.querySelectorAll('[data-letter]'));
        this.header = document.querySelector('.section-header');
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.pinned = null;
        this.frame = null;

        this.catalogue.querySelectorAll('[data-brand]').forEach((brand) => {
          const name = brand.querySelector('.bs-brand-card__name, .bs-brand-list__link');
          brand.dataset.letter = this.letterOf(name ? name.textContent : '');
        });
        this.querySelector('[data-letter="#"]').parentElement.hidden = !this.catalogue.querySelector(
          '[data-brand][data-letter="#"]'
        );

        this.onClick = this.onClick.bind(this);
        this.onUpdate = () => this.update();
        this.onScroll = () => {
          if (this.jumping) {
            // Scroll events from a jump: the chosen letter stays current until they stop.
            clearTimeout(this.jumpTimer);
            this.jumpTimer = setTimeout(() => (this.jumping = false), 150);
          } else {
            this.pinned = null;
          }
          if (!this.frame) this.frame = requestAnimationFrame(() => this.track());
        };

        this.addEventListener('click', this.onClick);
        this.catalogue.addEventListener('bs-brands:render', this.onUpdate);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onScroll, { passive: true });
        this.update();
      }

      disconnectedCallback() {
        if (!this.catalogue) return;
        this.catalogue.removeEventListener('bs-brands:render', this.onUpdate);
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onScroll);
        if (this.frame) cancelAnimationFrame(this.frame);
        clearTimeout(this.jumpTimer);
      }

      letterOf(name) {
        const first = name
          .trim()
          .replace(/^the\s+/i, '')
          .normalize('NFD')
          .charAt(0)
          .toUpperCase();
        return first >= 'A' && first <= 'Z' ? first : '#';
      }

      // Brands shown in the current view and category, in page order.
      brands() {
        const view = this.catalogue.dataset.view === 'list' ? '.bs-brands__list' : '.bs-brand-grid';
        return Array.from(this.catalogue.querySelectorAll(`${view} [data-brand]:not([hidden])`));
      }

      update() {
        const present = new Set(this.brands().map((brand) => brand.dataset.letter));
        this.buttons.forEach((button) => {
          const disabled = !present.has(button.dataset.letter);
          button.setAttribute('aria-disabled', disabled);
          disabled ? button.setAttribute('tabindex', '-1') : button.removeAttribute('tabindex');
        });
        if (this.pinned && !present.has(this.pinned)) this.pinned = null;
        this.track();
      }

      // The bottom edge of the sticky header while it is on screen, else 0.
      headerBottom() {
        if (!this.header || this.header.classList.contains('shopify-section-header-hidden')) return 0;
        return Math.max(0, this.header.getBoundingClientRect().bottom);
      }

      track() {
        this.frame = null;
        const brands = this.brands();
        const container = brands[0] && brands[0].closest('.bs-brand-grid, .bs-brands__list');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // In from when the brands reach the bar, out once their end rises above the middle of the screen.
        const zone = window.innerHeight - this.firstElementChild.offsetHeight;
        this.toggleAttribute('data-visible', rect.top < zone && rect.bottom > window.innerHeight / 2);

        let letter = this.pinned;
        if (!letter) {
          const line = this.headerBottom() + 1;
          const top = brands.find((brand) => brand.getBoundingClientRect().bottom > line) || brands[0];
          letter = top.dataset.letter;
        }
        this.buttons.forEach((button) => {
          button.dataset.letter === letter
            ? button.setAttribute('aria-current', 'true')
            : button.removeAttribute('aria-current');
        });
      }

      onClick(event) {
        const button = event.target.closest('[data-letter]');
        if (!button || button.getAttribute('aria-disabled') === 'true') return;
        const target = this.brands().find((brand) => brand.dataset.letter === button.dataset.letter);
        if (!target) return;

        const targetTop = target.getBoundingClientRect().top;
        // The header hides on the way down and comes back on the way up.
        const offset = (targetTop < 0 && this.header ? this.header.offsetHeight : 0) + 16;
        const top = Math.max(0, window.scrollY + targetTop - offset);

        this.pinned = button.dataset.letter;
        if (Math.abs(top - window.scrollY) > 1) {
          this.jumping = true;
          clearTimeout(this.jumpTimer);
          this.jumpTimer = setTimeout(() => (this.jumping = false), 1000);
        }
        window.scrollTo({ top, behavior: this.reducedMotion.matches ? 'auto' : 'smooth' });
        this.track();

        // Keyboard users carry on from the brand they jumped to (a click from a key has no detail).
        const link = target.querySelector('a');
        if (link && event.detail === 0) link.focus({ preventScroll: true });
      }
    }
  );
}
