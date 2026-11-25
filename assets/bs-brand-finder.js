/*
  A to Z brand finder on the Brands catalogue (snippets/bs-brand-finder.liquid).
  - Shown from when the grid or list reaches the bar until its last brand goes under the
    header, so it stays after a jump to a late letter (T, W...).
  - A letter scrolls to the first brand starting with it in the current view, clear of the
    sticky header (an instant jump with reduced motion). The first letter scrolls to the start
    of the list, with the list view's column heads.
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
          const name = brand.querySelector('.bs-brand-card__name');
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

      // Brands shown in the current category, in page order (the grid and list share them).
      brands() {
        return Array.from(this.catalogue.querySelectorAll('.bs-brand-grid [data-brand]:not([hidden])'));
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
        const container = brands[0] && brands[0].closest('.bs-brand-grid');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // In from when the brands reach the bar, out once the last one has gone under the header.
        const zone = window.innerHeight - this.firstElementChild.offsetHeight;
        const lastBrand = brands[brands.length - 1].getBoundingClientRect();
        const lastMiddle = lastBrand.top + lastBrand.height / 2;
        this.toggleAttribute('data-visible', rect.top < zone && lastMiddle > this.headerBottom());

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
        const brands = this.brands();
        const target = brands.find((brand) => brand.dataset.letter === button.dataset.letter);
        if (!target) return;

        // The first letter shows the start of the list (the list view's column heads too).
        const start = target === brands[0] ? target.closest('.bs-brands__items') : null;
        const targetTop = (start || target).getBoundingClientRect().top;
        // Always clear of the header: it does not always hide on the way down, and covered the start.
        const offset = (this.header ? this.header.offsetHeight : 0) + 16;
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
