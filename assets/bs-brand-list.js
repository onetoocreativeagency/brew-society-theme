/*
  Brands list view: the hovered row's logo square eases after the mouse.
  Sets --bs-follow-x/y (viewport pixels) on the table (or the Brands catalogue's list,
  .bs-brand-grid) and .is-following while the pointer is over it. Without this script,
  or with reduced motion, the square sits over the row (assets/bs-brands.css).
*/
if (!customElements.get('bs-brand-list')) {
  customElements.define(
    'bs-brand-list',
    class BsBrandList extends HTMLElement {
      connectedCallback() {
        this.table = this.querySelector('.bs-brand-list, .bs-brand-grid');
        if (!this.table || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this.target = null;
        this.current = null;
        this.frame = null;
        this.onMove = (event) => {
          if (event.pointerType !== 'mouse') return;
          this.target = { x: event.clientX, y: event.clientY };
          // Appear at the cursor, then ease after it.
          if (!this.current) {
            this.current = { ...this.target };
            this.table.style.setProperty('--bs-follow-x', `${this.current.x}px`);
            this.table.style.setProperty('--bs-follow-y', `${this.current.y}px`);
          }
          this.table.classList.add('is-following');
          if (!this.frame) this.frame = requestAnimationFrame(this.tick);
        };
        this.onLeave = () => {
          this.table.classList.remove('is-following');
          this.current = null;
        };
        this.tick = () => {
          this.frame = null;
          if (!this.current) return;
          this.current.x += (this.target.x - this.current.x) * 0.18;
          this.current.y += (this.target.y - this.current.y) * 0.18;
          this.table.style.setProperty('--bs-follow-x', `${this.current.x.toFixed(1)}px`);
          this.table.style.setProperty('--bs-follow-y', `${this.current.y.toFixed(1)}px`);
          if (Math.abs(this.target.x - this.current.x) > 0.5 || Math.abs(this.target.y - this.current.y) > 0.5) {
            this.frame = requestAnimationFrame(this.tick);
          }
        };
        this.table.addEventListener('pointermove', this.onMove);
        this.table.addEventListener('pointerleave', this.onLeave);
      }

      disconnectedCallback() {
        if (!this.onMove) return;
        this.table.removeEventListener('pointermove', this.onMove);
        this.table.removeEventListener('pointerleave', this.onLeave);
        if (this.frame) cancelAnimationFrame(this.frame);
      }
    }
  );
}
