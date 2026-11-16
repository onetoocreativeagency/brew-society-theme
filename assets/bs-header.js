/* Cart link inside the mobile menu: opens the cart drawer and mirrors the header cart count. */
class BsCartLink extends HTMLElement {
  connectedCallback() {
    this.bubble = document.getElementById('cart-icon-bubble');
    if (!this.bubble) return;

    this.querySelector('a').addEventListener('click', this.onClick.bind(this));
    this.observer = new MutationObserver(this.syncCount.bind(this));
    this.observer.observe(this.bubble, { childList: true });
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  onClick(event) {
    const cartDrawer = document.querySelector('cart-drawer');
    const headerDrawer = this.closest('header-drawer');
    if (!cartDrawer || !headerDrawer) return;

    event.preventDefault();
    const summary = headerDrawer.querySelector('summary');
    headerDrawer.closeMenuDrawer(event, summary);
    cartDrawer.open(summary);
  }

  syncCount() {
    ['.bs-menu-count', '.visually-hidden'].forEach((selector) => {
      const source = this.bubble.querySelector(selector);
      const target = this.querySelector(selector);
      if (source && target) target.textContent = source.textContent;
    });
  }
}

customElements.define('bs-cart-link', BsCartLink);
