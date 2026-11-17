if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

        this.addEventListener('product-info:loaded', ({ target }) => {
          target.addPreProcessCallback(this.preprocessHTML.bind(this));
        });
      }

      connectedCallback() {
        // The buy panel is cloned straight into <body>, outside any section.
        if (this.closest('.shopify-section')) super.connectedCallback();
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        const productUrl = opener.getAttribute('data-product-url') || opener.href;
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner')?.classList.remove('hidden');

        fetch(productUrl)
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const productElement = responseHTML.querySelector('product-info');
            if (!productElement) throw new Error('No product markup in response');

            this.preprocessHTML(productElement);
            HTMLUpdateUtility.setInnerHTML(this.modalContent, productElement.outerHTML);

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            this.modalContent.querySelector('product-component')?.dispatchViewEvent?.();

            super.show(opener);
          })
          .catch(() => {
            // Fall back to the product page, which is the same component.
            window.location.href = productUrl;
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            opener.querySelector('.loading__spinner')?.classList.add('hidden');
          });
      }

      preprocessHTML(productElement) {
        // The panel takes the product section's colour scheme, Close button included.
        const dialog = this.querySelector('[role="dialog"]');
        productElement.classList.forEach((classApplied) => {
          if (classApplied.startsWith('color-') || classApplied === 'gradient') dialog.classList.add(classApplied);
        });
        const title = productElement.querySelector('.product__title h1');
        if (title) dialog.setAttribute('aria-label', title.textContent.trim());
        // The description is open on the product page and collapsed in the panel.
        productElement.querySelectorAll('.bs-buy__info').forEach((details) => details.removeAttribute('open'));
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        this.removeGalleryListSemantic(productElement);
        this.updateImageSizes(productElement);
        this.preventVariantURLSwitching(productElement);
      }

      preventVariantURLSwitching(productElement) {
        productElement.setAttribute('data-update-url', 'false');
      }

      removeDOMElements(productElement) {
        const pickupAvailability = productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        // Not shown in the panel, and as the last link it would break the focus trap.
        const viewDetails = productElement.querySelector('.product__view-details');
        if (viewDetails) viewDetails.remove();

        const modalDialog = productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;

        const oldId = sectionId;
        const newId = `quickadd-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(oldId, newId);
        Array.from(productElement.attributes).forEach((attribute) => {
          if (attribute.value.includes(oldId)) {
            productElement.setAttribute(attribute.name, attribute.value.replace(oldId, newId));
          }
        });

        productElement.dataset.originalSection = sectionId;
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        productElement
          .querySelectorAll('.product__media img')
          .forEach((img) => img.setAttribute('sizes', '(min-width: 750px) 275px, 50vw'));
      }
    }
  );

  // Product cards open the buy panel. Modified clicks and no-JS visitors follow the link.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[data-buy-panel]');
    if (!link) return;

    let panel = document.getElementById('QuickAdd-BuyPanel');
    if (!panel) {
      const template = document.querySelector('template.bs-buy-panel-template');
      if (!template) return;
      document.body.appendChild(template.content.cloneNode(true));
      panel = document.getElementById('QuickAdd-BuyPanel');
    }

    event.preventDefault();
    panel.show(link);
  });
}
