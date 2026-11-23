/* Cart link in the mobile header bar: opens the cart drawer (closing the menu first if it is open)
   and mirrors the desktop header cart count. */
class BsCartLink extends HTMLElement {
  connectedCallback() {
    this.bubble = document.getElementById('cart-icon-bubble');
    this.link = this.querySelector('a');
    if (!this.bubble || !this.link) return;

    if (document.querySelector('cart-drawer')) {
      this.link.setAttribute('role', 'button');
      this.link.setAttribute('aria-haspopup', 'dialog');
    }
    this.link.addEventListener('click', this.onClick.bind(this));
    this.observer = new MutationObserver(this.syncCount.bind(this));
    this.observer.observe(this.bubble, { childList: true });
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  onClick(event) {
    const cartDrawer = document.querySelector('cart-drawer');
    if (!cartDrawer) return;

    event.preventDefault();
    const headerDrawer = this.closest('header-drawer');
    const menu = headerDrawer && headerDrawer.querySelector('details');
    if (menu && menu.hasAttribute('open')) headerDrawer.closeMenuDrawer(event, menu.querySelector('summary'));
    cartDrawer.open(this.link);
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
