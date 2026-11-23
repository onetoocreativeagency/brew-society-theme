/*
  Scroll colour reveal ("Reveal text colour on scroll" on the Statement section).

  Splits the text into words here, not in the saved content, so the editor keeps
  plain text. Each word starts grey and turns to the text colour, one after the
  other, as the statement scrolls up the screen, and all are done by the time its
  top reaches 40% of the screen height, so it reads finished in the upper third
  (GSAP ScrollTrigger, scrubbed to the scroll position, so scrolling back greys
  them out again).

  Needs gsap.min.js and ScrollTrigger.min.js loaded first. Without them, without
  JS or with reduced motion nothing is split and the text stays in its full colour.
*/
if (!customElements.get('bs-scroll-reveal')) {
  customElements.define(
    'bs-scroll-reveal',
    class BsScrollReveal extends HTMLElement {
      connectedCallback() {
        if (!window.gsap || !window.ScrollTrigger) return;
        window.gsap.registerPlugin(window.ScrollTrigger);

        this.text = this.firstElementChild;
        if (!this.text) return;
        this.original = this.text.innerHTML;

        this.media = window.gsap.matchMedia();
        this.media.add('(prefers-reduced-motion: no-preference)', () => {
          const words = this.split();
          const styles = getComputedStyle(this.text);
          const grey = styles.getPropertyValue('--bs-color-grey').trim();

          window.gsap.fromTo(
            words,
            { color: grey },
            {
              color: styles.color,
              ease: 'none',
              stagger: 0.1,
              scrollTrigger: {
                trigger: this.text,
                start: 'top 90%',
                end: 'top 40%',
                scrub: 0.5,
              },
            }
          );

          // Undone when reduced motion is switched on, or the section is removed.
          return () => {
            this.text.innerHTML = this.original;
          };
        });
      }

      disconnectedCallback() {
        if (this.media) this.media.revert();
      }

      // Wraps every word in a span, inside any links or bold text, and keeps the spaces.
      split() {
        const walker = document.createTreeWalker(this.text, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        const words = [];
        nodes.forEach((node) => {
          const fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.append(part);
              return;
            }
            const word = document.createElement('span');
            word.className = 'bs-scroll-reveal__word';
            word.textContent = part;
            fragment.append(word);
            words.push(word);
          });
          node.replaceWith(fragment);
        });
        return words;
      }
    }
  );
}
