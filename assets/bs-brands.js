/*
  Brands catalogue: filters the brands by category and switches between the grid
  and the list. The state lives in the URL (?category=tea&view=list) so a
  filtered view can be linked. Without this script every brand is shown in the grid.

  The switch animates with GSAP Flip, after Osmo Supply's "List/Grid Toggle (Flip)":
  - [data-list-grid-flip] elements (each brand's panel, the toggle's indicator) move and
    resize from their old place to their new one;
  - [data-list-grid-fade] elements fade out where they are before the layout changes, then
    those shown in the new view fade back in ("" shows in both views, "grid" or "list" in that
    one only). They are not part of the Flip: scaled from one view's box to the other's, the
    text stretched (giant category labels, smeared list rows).
  Changes from Osmo: the view is data-view (set before first paint by the section's inline
  script), the switch runs through render() so the URL, back button and category filter share
  it, brands hidden by the filter are not animated (their fades are set straight away), and the
  animations share one timeline whose clock starts on the next tick (see playView).
  Without GSAP or with reduced motion the views swap without animation.
*/
if (!customElements.get('bs-brand-catalogue')) {
  customElements.define(
    'bs-brand-catalogue',
    class BsBrandCatalogue extends HTMLElement {
      connectedCallback() {
        this.brands = this.querySelectorAll('[data-brand]');
        this.filters = Array.from(this.querySelectorAll('[data-brands-filter]'));
        this.toggles = this.querySelectorAll('[data-list-grid-toggle]');
        this.animates = Boolean(window.gsap && window.Flip);
        if (this.animates) {
          gsap.registerPlugin(Flip);
          this.reduceMotion = false;
          this.motion = gsap.matchMedia();
          this.motion.add('(prefers-reduced-motion: reduce)', () => {
            this.reduceMotion = true;
            return () => {
              this.reduceMotion = false;
            };
          });
        }
        this.onPopState = () => this.readUrl();
        this.addEventListener('click', this.onClick.bind(this));
        window.addEventListener('popstate', this.onPopState);
        this.readUrl();
      }

      disconnectedCallback() {
        window.removeEventListener('popstate', this.onPopState);
        if (this.flip) this.flip.kill();
        if (this.motion) this.motion.revert();
      }

      readUrl() {
        const params = new URLSearchParams(window.location.search);
        this.render(params.get('category') || '', params.get('view'));
      }

      onClick(event) {
        const control = event.target.closest('[data-brands-filter], [data-list-grid-toggle]');
        if (!control) return;
        const isFilter = control.hasAttribute('data-brands-filter');
        if (isFilter && (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
        event.preventDefault();
        if (!isFilter && control.dataset.listGridToggle === this.dataset.view) return;

        if (isFilter) {
          this.update(control.dataset.brandsFilter, this.dataset.view, true);
        } else {
          this.fadeOut(() => this.update(this.category, control.dataset.listGridToggle, false));
        }
      }

      update(category, view, isFilter) {
        this.render(category, view);

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
        const nextView = view === 'list' || view === 'grid' ? view : this.dataset.defaultView;
        const viewChanges = this.rendered && nextView !== this.dataset.view;
        // Flip reads where everything is before the brands and the view change.
        const before = viewChanges ? this.captureView() : null;
        this.category = filter ? filter.dataset.brandsFilter : '';

        this.brands.forEach((brand) => {
          brand.hidden = this.category !== '' && brand.dataset.category !== this.category;
        });

        this.filters.forEach((link) => {
          const current = link === filter;
          link.classList.toggle('bs-category-nav__link--current', current);
          current ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        });

        this.dataset.view = nextView;
        this.toggles.forEach((toggle) => {
          toggle.setAttribute('aria-pressed', String(toggle.dataset.listGridToggle === nextView));
        });
        if (!this.rendered) this.initFades();
        if (viewChanges) this.playView(nextView, before);
        this.rendered = true;

        this.dispatchEvent(new CustomEvent('bs-brands:render'));

        if (!filter) return;
        const total = Number(filter.dataset.brandsTotal);
        this.label = filter.dataset.brandsLabel;
        this.countText = (total === 1 ? this.dataset.countOne : this.dataset.countOther).replace('[count]', total);
        this.querySelector('[data-brands-title]').textContent = this.label;
        this.querySelector('[data-brands-count]').textContent = total;
        this.querySelector('[data-brands-count-text]').textContent = this.countText;
      }

      // Before a view switch the text fades out in place; render() then flips the panels.
      fadeOut(done) {
        if (!this.animates || this.reduceMotion || !this.rendered) return done();
        if (this.flip) this.flip.kill();
        this.flip = gsap.to(this.visible('[data-list-grid-fade]'), {
          autoAlpha: 0,
          duration: 0.15,
          ease: 'power1.in',
          overwrite: 'auto',
          onComplete: done,
        });
      }

      shownIn(el, view) {
        return ['', view].includes(el.getAttribute('data-list-grid-fade'));
      }

      // Only brands left in by the category filter are animated.
      visible(selector) {
        return [...this.querySelectorAll(selector)].filter((el) => !el.closest('[hidden]'));
      }

      // Osmo's start state: what the first view does not show is hidden. (CSS does this until GSAP loads.)
      initFades() {
        if (!this.animates) return;
        const view = this.dataset.view;
        gsap.set(
          [...this.querySelectorAll('[data-list-grid-fade]')].filter((el) => !this.shownIn(el, view)),
          { autoAlpha: 0 }
        );
      }

      captureView() {
        if (!this.animates) return null;
        const cornerRadius = (el) => parseFloat(getComputedStyle(el).borderTopLeftRadius);
        const fadeTargets = this.visible('[data-list-grid-fade]');
        const flipElements = this.visible('[data-list-grid-flip]');
        if (this.flip) this.flip.kill();
        gsap.killTweensOf(fadeTargets, 'opacity,visibility');
        gsap.killTweensOf(flipElements);
        const startRadii = flipElements.map((el) => cornerRadius(el) * gsap.getProperty(el, 'scaleX'));
        const panels = flipElements.filter((el) => el.querySelector('.bs-brand-card__media'));
        gsap.killTweensOf(panels.map((el) => el.querySelector('.bs-brand-card__media')));
        // The view this captures is left, so the next one is the other.
        const unit = this.dataset.view === 'list' ? '%' : 'px';
        const startLooks = panels.map((el) => this.panelLook(el, unit));
        const state = Flip.getState(flipElements);
        gsap.set(flipElements, { clearProps: 'borderRadius,backgroundColor' });
        gsap.set(panels.map((el) => el.querySelector('.bs-brand-card__media')), { clearProps: 'top,right,bottom,left' });
        return { fadeTargets, flipElements, startRadii, state, cornerRadius, panels, startLooks, unit };
      }

      // A brand panel's colour and where its image sits in it: the list view drops the colour and
      // widens the logo. The inset is in % of the panel while Flip scales it (to the grid), and in
      // px while Flip resizes it (to the list): with the panel's size and the px insets eased
      // together, the image shrinks steadily with it, where % made it grow first.
      panelLook(panel, unit) {
        const media = panel.querySelector('.bs-brand-card__media');
        const box = panel.getBoundingClientRect();
        const rect = media.getBoundingClientRect();
        const edge = (value, size) => (unit === '%' ? `${((value / size) * 100).toFixed(3)}%` : `${value.toFixed(2)}px`);
        return {
          backgroundColor: getComputedStyle(panel).backgroundColor,
          inset: {
            top: edge(rect.top - box.top, box.height),
            right: edge(box.right - rect.right, box.width),
            bottom: edge(box.bottom - rect.bottom, box.height),
            left: edge(rect.left - box.left, box.width),
          },
        };
      }

      playView(view, before) {
        if (!before) return;
        const { fadeTargets, flipElements, startRadii, state, cornerRadius, panels, startLooks, unit } = before;
        const fadeIn = fadeTargets.filter((el) => this.shownIn(el, view));
        // Brands hidden by the filter take the new view's fades without animating.
        const skipped = [...this.querySelectorAll('[data-list-grid-fade]')].filter((el) => !fadeTargets.includes(el));
        gsap.set(skipped, { autoAlpha: (index, el) => (this.shownIn(el, view) ? 1 : 0) });

        if (this.reduceMotion) {
          gsap.set(fadeTargets, { autoAlpha: (index, el) => (fadeIn.includes(el) ? 1 : 0) });
          return;
        }

        // Normally already faded out by fadeOut(); after the back button they go at once.
        gsap.set(fadeTargets, { autoAlpha: 0 });
        const endRadii = flipElements.map(cornerRadius);
        const endLooks = panels.map((el) => this.panelLook(el, unit));
        const timeline = gsap.timeline();
        // Scaling from a smaller box up pixelates (the logo is drawn at the small size), so going to
        // the list the panels animate their real size; they are out of the flow there (CSS).
        timeline.add(Flip.from(state, { duration: 0.8, ease: 'expo.inOut', scale: view === 'grid' }), 0);
        flipElements.forEach((el, index) => {
          timeline.fromTo(
            el,
            { borderRadius: startRadii[index] / gsap.getProperty(el, 'scaleX') },
            { borderRadius: endRadii[index], duration: 0.8, ease: 'expo.inOut', clearProps: 'borderRadius' },
            0
          );
        });
        const morph = { duration: 0.8, ease: 'expo.inOut' };
        panels.forEach((el, index) => {
          const [from, to] = [startLooks[index], endLooks[index]];
          // Fade the panel colour itself: 'transparent' is black at 0, which greys the panel on the way.
          const clear = (color) => color.replace(/rgba?\(([^,]+),([^,]+),([^,)]+).*\)/, 'rgba($1,$2,$3,0)');
          const isClear = (color) => gsap.utils.splitColor(color, false)[3] === 0;
          const fromColor = isClear(from.backgroundColor) ? clear(to.backgroundColor) : from.backgroundColor;
          const toColor = isClear(to.backgroundColor) ? clear(from.backgroundColor) : to.backgroundColor;
          timeline.fromTo(
            el,
            { backgroundColor: fromColor },
            { ...morph, backgroundColor: toColor, clearProps: 'backgroundColor' },
            0
          );
          timeline.fromTo(
            el.querySelector('.bs-brand-card__media'),
            from.inset,
            { ...morph, ...to.inset, clearProps: 'top,right,bottom,left' },
            0
          );
        });
        timeline.to(fadeIn, { autoAlpha: 1, duration: 0.3, ease: 'power1.out', stagger: { amount: 0.2 } }, 0.55);
        // Measuring every brand can take longer than a frame. The clock starts on the next tick,
        // so that time is not taken out of the start of the animation.
        timeline.pause();
        gsap.ticker.add(() => {
          if (this.flip === timeline) timeline.resume();
        }, true);
        this.flip = timeline;
      }
    }
  );
}
