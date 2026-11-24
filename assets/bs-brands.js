/*
  Brands catalogue: filters the brands by category and switches between the grid
  and the list. The state lives in the URL (?category=tea&view=list) so a
  filtered view can be linked. Without this script every brand is shown.
*/
if (!customElements.get('bs-brand-catalogue')) {
  customElements.define(
    'bs-brand-catalogue',
    class BsBrandCatalogue extends HTMLElement {
      connectedCallback() {
        this.brands = this.querySelectorAll('[data-brand]');
        this.filters = Array.from(this.querySelectorAll('[data-brands-filter]'));
        this.views = this.querySelectorAll('[data-brands-view]');
        this.onPopState = () => this.readUrl();
        this.addEventListener('click', this.onClick.bind(this));
        window.addEventListener('popstate', this.onPopState);
        this.readUrl();
      }

      disconnectedCallback() {
        window.removeEventListener('popstate', this.onPopState);
      }

      readUrl() {
        const params = new URLSearchParams(window.location.search);
        this.render(params.get('category') || '', params.get('view'));
      }

      onClick(event) {
        const link = event.target.closest('[data-brands-filter], [data-brands-view]');
        if (!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();

        const isFilter = link.hasAttribute('data-brands-filter');
        this.render(isFilter ? link.dataset.brandsFilter : this.category, isFilter ? this.dataset.view : link.dataset.brandsView);

        const url = new URL(window.location.href);
        this.category ? url.searchParams.set('category', this.category) : url.searchParams.delete('category');
        this.dataset.view === this.dataset.defaultView
          ? url.searchParams.delete('view')
          : url.searchParams.set('view', this.dataset.view);
        window.history.pushState({}, '', url);

        if (isFilter) {
          this.querySelector('[data-brands-status]').textContent = `${this.label}, ${this.countText}`;
        }
      }

      render(category, view) {
        const filter = this.filters.find((link) => link.dataset.brandsFilter === category) || this.filters[0];
        this.category = filter ? filter.dataset.brandsFilter : '';
        this.dataset.view = view === 'list' || view === 'grid' ? view : this.dataset.defaultView;

        this.brands.forEach((brand) => {
          brand.hidden = this.category !== '' && brand.dataset.category !== this.category;
        });

        this.filters.forEach((link) => {
          const current = link === filter;
          link.classList.toggle('bs-category-nav__link--current', current);
          current ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        });

        this.views.forEach((link) => {
          link.dataset.brandsView === this.dataset.view
            ? link.setAttribute('aria-current', 'true')
            : link.removeAttribute('aria-current');
        });

        this.dispatchEvent(new CustomEvent('bs-brands:render'));

        if (!filter) return;
        const total = Number(filter.dataset.brandsTotal);
        this.label = filter.dataset.brandsLabel;
        this.countText = (total === 1 ? this.dataset.countOne : this.dataset.countOther).replace('[count]', total);
        this.querySelector('[data-brands-title]').textContent = this.label;
        this.querySelector('[data-brands-count]').textContent = total;
        this.querySelector('[data-brands-count-text]').textContent = this.countText;
      }
    }
  );
}
