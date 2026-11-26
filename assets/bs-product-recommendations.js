/*
  "You might also like" (sections/bs-product-recommendations.liquid). The page already shows the
  fallback products; this fetches Shopify's recommendations for the product and lists them first,
  then the fallback products that are not among them, up to the set number. On a failed fetch
  the fallback products stay.
*/
if (!customElements.get('bs-product-recommendations')) {
  customElements.define(
    'bs-product-recommendations',
    class BsProductRecommendations extends HTMLElement {
      connectedCallback() {
        this.list = this.querySelector('[data-list]');
        if (!this.list || this.loaded) return;
        this.loaded = true;
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            this.load();
          },
          { rootMargin: '0px 0px 400px 0px' }
        );
        observer.observe(this);
      }

      async load() {
        try {
          const response = await fetch(this.dataset.url);
          if (!response.ok) return;
          const html = new DOMParser().parseFromString(await response.text(), 'text/html');
          const recommended = [...html.querySelectorAll('[data-list] > [data-product-id]')];
          if (!recommended.length) return;
          const limit = Number(this.dataset.limit) || 4;
          const seen = new Set([this.dataset.productId]);
          const items = [];
          for (const item of [...recommended, ...this.list.children]) {
            const id = item.dataset.productId;
            if (seen.has(id)) continue;
            seen.add(id);
            items.push(item);
            if (items.length === limit) break;
          }
          this.list.replaceChildren(...items);
        } catch (error) {
          // Keep the fallback products.
        }
      }
    }
  );
}
