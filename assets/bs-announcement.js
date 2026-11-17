/* Announcement bar: a Splide carousel of notices. Options come from the data-splide attribute. */
class BsAnnouncement extends HTMLElement {
  connectedCallback() {
    this.splide = new Splide(this).mount();
    if (window.Shopify && Shopify.designMode) {
      this.addEventListener('shopify:block:select', this.onBlockSelect.bind(this));
    }
  }

  disconnectedCallback() {
    this.splide.destroy();
  }

  /* Theme editor: show the notice whose block was selected. */
  onBlockSelect(event) {
    const slides = Array.from(this.querySelectorAll('.splide__slide:not(.splide__slide--clone)'));
    const index = slides.indexOf(event.target.closest('.splide__slide'));
    if (index > -1) this.splide.go(index);
  }
}

customElements.define('bs-announcement', BsAnnouncement);
