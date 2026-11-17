/* Pauses the ring's CSS rotation while the section is off screen. */
if (!customElements.get('bs-brand-ring')) {
  customElements.define(
    'bs-brand-ring',
    class BsBrandRing extends HTMLElement {
      connectedCallback() {
        this.observer = new IntersectionObserver(([entry]) => {
          this.classList.toggle('bs-brand-ring__stage--offscreen', !entry.isIntersecting);
        });
        this.observer.observe(this);
      }

      disconnectedCallback() {
        this.observer.disconnect();
      }
    }
  );
}
