/*
  Scroll colour reveal ("Reveal text colour on scroll" on the Statement and Steps sections).

  Splits the text into words here, not in the saved content, so the editor keeps
  plain text. Every word starts in the same faint colour and turns to its own
  designed colour, one after the other through the whole heading, as it scrolls
  up the screen. So the whole title animates the same way and ends in its
  designed two tones (strong and light); in a heading with no bold every word
  ends strong (the section CSS sets that colour). The reveal runs from the
  heading's top reaching 85% of the screen to its bottom reaching 55%, so each
  line turns while it is on screen, between about 85% and 55% of the screen height,
  however many lines the heading wraps to (a long heading on a phone runs to eight).
  GSAP ScrollTrigger, scrubbed to the scroll position, so scrolling back lightens
  them again.

  The light colour is --bs-reveal-from on the text, or the grey token. The faint
  start is that light colour 35% of the way from the background.

  Needs gsap.min.js and ScrollTrigger.min.js loaded first. Without them, without
  JS or with reduced motion nothing is split and the text shows its designed colours.
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
          const from = this.lightColour();
          const faint = this.mix(this.backgroundColour(), from, 0.35);
          const words = this.split();
          const ends = words.map((word) => this.toRgb(getComputedStyle(word).color));
          const starts = ends.map(() => faint);

          if (words.length) {
            window.gsap.fromTo(
              words,
              { color: (index) => starts[index] },
              {
                color: (index) => ends[index],
                ease: 'none',
                stagger: 0.1,
                scrollTrigger: {
                  trigger: this.text,
                  start: 'top 85%',
                  end: 'bottom 55%',
                  scrub: 0.5,
                },
              }
            );
          }

          // Undone when reduced motion is switched on, or the section is removed.
          return () => {
            this.text.innerHTML = this.original;
          };
        });
      }

      disconnectedCallback() {
        if (this.media) this.media.revert();
      }

      lightColour() {
        const probe = document.createElement('span');
        probe.style.color = 'var(--bs-reveal-from, var(--bs-color-grey))';
        this.text.append(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return this.toRgb(colour);
      }

      backgroundColour() {
        const probe = document.createElement('span');
        probe.style.color = 'rgb(var(--color-background))';
        this.text.append(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return this.toRgb(colour);
      }

      // `amount` of the way from colour a to colour b, both rgb() strings.
      mix(a, b, amount) {
        const [ra, ga, ba] = a.match(/\d+/g).map(Number);
        const [rb, gb, bb] = b.match(/\d+/g).map(Number);
        const at = (x, y) => Math.round(x + (y - x) * amount);
        return `rgb(${at(ra, rb)}, ${at(ga, gb)}, ${at(ba, bb)})`;
      }

      // Computed colours can come back as color(srgb …) from color-mix(), which GSAP
      // can't tween, so read every colour back as rgb() through a 1px canvas.
      toRgb(colour) {
        if (!this.context) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          this.context = canvas.getContext('2d', { willReadFrequently: true });
        }
        this.context.clearRect(0, 0, 1, 1);
        this.context.fillStyle = colour;
        this.context.fillRect(0, 0, 1, 1);
        const [r, g, b] = this.context.getImageData(0, 0, 1, 1).data;
        return `rgb(${r}, ${g}, ${b})`;
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
