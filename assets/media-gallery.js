if (!customElements.get('media-gallery')) {
  // Brew Society: Splide is fetched only when a phone-width gallery needs it.
  let splideLoading;
  const loadSplide = (src) => {
    if (window.Splide) return Promise.resolve();
    splideLoading =
      splideLoading ||
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
    return splideLoading;
  };

  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (this.dataset.phoneCarousel) {
          this.mql.addEventListener('change', this.togglePhoneCarousel.bind(this));
          this.togglePhoneCarousel();
        }
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      // Brew Society: below 750px the main images are a swipeable Splide carousel, one image per
      // slide. The thumbnails under it show the position. Desktop keeps Dawn's gallery.
      togglePhoneCarousel() {
        if (this.mql.matches) {
          this.destroyPhoneCarousel(null);
        } else {
          this.mountPhoneCarousel();
        }
      }

      getCarouselSlides() {
        return Array.from(this.elements.viewer.querySelectorAll('.splide__list > [data-media-id]'));
      }

      async mountPhoneCarousel() {
        if (this.splide) return;
        try {
          await loadSplide(this.dataset.splideSrc);
        } catch (error) {
          return;
        }
        if (this.splide || this.mql.matches) return;

        const slides = this.getCarouselSlides();
        const ids = slides.map((slide) => slide.id);
        const start = Math.max(
          0,
          slides.findIndex((slide) => slide.classList.contains('is-active'))
        );
        // Splide needs the root class; it is added only now so the gallery shows before Splide loads.
        this.classList.add('splide');
        this.splide = new Splide(this, { ...JSON.parse(this.dataset.phoneCarousel), start });
        this.splide.on('moved', this.onCarouselMoved.bind(this));
        this.splide.mount();
        // Splide renames the slides; Dawn's slider and variant code find them by their own ids.
        slides.forEach((slide, index) => (slide.id = ids[index]));
      }

      destroyPhoneCarousel(activeSlide) {
        if (!this.splide) return;
        const slides = this.getCarouselSlides();
        const ids = slides.map((slide) => slide.id);
        activeSlide = activeSlide || slides[this.splide.index];
        this.splide.destroy(true);
        this.splide = null;
        this.classList.remove('splide');
        slides.forEach((slide, index) => (slide.id = ids[index]));
        if (activeSlide) activeSlide.classList.add('is-active');
      }

      onCarouselMoved(index) {
        const slide = this.getCarouselSlides()[index];
        if (!slide) return;
        window.pauseAllMedia();
        if (!this.elements.thumbnails) return;
        this.setActiveThumbnail(this.elements.thumbnails.querySelector(`[data-target="${slide.dataset.mediaId}"]`));
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail && activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        if (this.splide) {
          if (prepend) {
            // Variant change: the slides were reordered, so rebuild the carousel on the new order.
            this.destroyPhoneCarousel(activeMedia);
            this.mountPhoneCarousel();
          } else {
            this.splide.go(this.getCarouselSlides().indexOf(activeMedia));
          }
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
