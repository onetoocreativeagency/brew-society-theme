/*
  Animated illustrations on the feature cards (sections/bs-feature-cards.liquid):

  - flags:    the Importer flag chips drop in and bounce with Matter.js physics (assets/matter.min.js,
              loaded by the section only when a card uses it). Visitors can grab and throw them with
              a mouse or a finger, and they hop when the pointer comes onto the card.
  - products: the Developer silhouettes pop in, then each keeps its own small springy move (GSAP).
  - map:      the Distributor map sends delivery dots out of Melbourne along the highways; a town
              pops while a delivery reaches it, then fades, and the hub's halo pulses (GSAP).

  Each starts when its card scrolls into view and pauses off screen. Nothing moves with reduced
  motion, in the theme editor or without the libraries: the markup is then the static Figma frame.
  The illustrations are decorative (aria-hidden in the markup).

  Touch: only the flag chips themselves have touch-action: none, so a finger on a chip drags it and
  a finger anywhere else scrolls the page. Smooth scrolling leaves touch to the phone, so no
  data-lenis-prevent is needed; the mouse wheel over a card scrolls the page as usual.
*/
(() => {
  if (customElements.get('bs-feature-illustration')) return;

  const FRAME_WIDTH = 549;
  const FRAME_HEIGHT = 373;

  /* Importer: Matter.js flag chips. */
  class Flags {
    static ready() {
      return Boolean(window.Matter);
    }

    constructor(root) {
      const { Engine, Runner, Events } = window.Matter;
      this.root = root;
      this.flags = Array.from(root.querySelectorAll('.bs-flags__flag')).slice(0, 7);
      this.design = this.flags.map((flag) => ({
        x: parseFloat(flag.style.getPropertyValue('--x')),
        y: parseFloat(flag.style.getPropertyValue('--y')),
        angle: (parseFloat(flag.style.getPropertyValue('--r')) * Math.PI) / 180,
      }));
      this.size = { width: root.clientWidth, height: root.clientHeight };

      this.engine = Engine.create({ enableSleeping: true });
      this.runner = Runner.create({ delta: 1000 / 60 });
      Events.on(this.runner, 'afterTick', () => this.render());
      Events.on(this.engine, 'beforeUpdate', () => this.limitSpeed());

      this.handlers = {
        pointerdown: this.onPointerDown.bind(this),
        pointermove: this.onPointerMove.bind(this),
        pointerup: this.onPointerUp.bind(this),
        pointercancel: this.onPointerUp.bind(this),
        pointerenter: this.onPointerEnter.bind(this),
      };
      this.forgetRect = () => (this.rect = null);
      this.resizeObserver = new ResizeObserver(([entry]) => this.resize(entry.contentRect));
    }

    start() {
      const { Bodies, Composite } = window.Matter;
      this.layout();
      const offsetX = (this.size.width - FRAME_WIDTH * this.scale) / 2;
      // Drop in from just above the card, a few at a time, each in its Figma column and turn.
      this.bodies = this.design.map((flag, index) =>
        Bodies.circle(offsetX + flag.x * this.scale, -this.radius - index * 45 - Math.random() * 30, this.radius, {
          angle: flag.angle,
          restitution: 0.55,
          friction: 0.06,
          frictionAir: 0.012,
          density: 0.0015,
          sleepThreshold: 90,
        })
      );
      this.walls = this.makeWalls();
      Composite.add(this.engine.world, [...this.walls, ...this.bodies]);

      this.root.classList.add('is-physics');
      this.root.classList.remove('is-armed');
      this.render(true);

      Object.entries(this.handlers).forEach(([type, handler]) => this.root.addEventListener(type, handler));
      window.addEventListener('scroll', this.forgetRect, { passive: true });
      this.resizeObserver.observe(this.root);
      this.started = true;
    }

    play() {
      if (!this.started) this.start();
      if (this.running) return;
      this.running = true;
      window.Matter.Runner.run(this.runner, this.engine);
    }

    pause() {
      if (!this.running) return;
      this.running = false;
      window.Matter.Runner.stop(this.runner);
    }

    destroy() {
      this.pause();
      if (!this.started) return;
      this.resizeObserver.disconnect();
      window.removeEventListener('scroll', this.forgetRect);
      Object.entries(this.handlers).forEach(([type, handler]) => this.root.removeEventListener(type, handler));
      window.Matter.Engine.clear(this.engine);
      window.Matter.Composite.clear(this.engine.world, false);
      this.root.classList.remove('is-physics', 'is-dragging');
      this.root.style.removeProperty('--bs-flag-size');
      this.flags.forEach((flag) => flag.style.removeProperty('transform'));
    }

    // The Figma frame fitted inside the panel sets the chip size (72 at full size).
    layout() {
      this.scale = Math.min(this.size.width / FRAME_WIDTH, this.size.height / FRAME_HEIGHT);
      this.radius = 36 * this.scale;
      this.root.style.setProperty('--bs-flag-size', `${this.radius * 2}px`);
    }

    makeWalls() {
      const { Bodies } = window.Matter;
      const { width, height } = this.size;
      const thick = 200;
      const tall = height * 4;
      // 8px in from the edges, so a chip in a corner clears the panel's rounded corner.
      const inset = 8;
      const options = { isStatic: true, friction: 0.2, restitution: 0.4 };
      return [
        Bodies.rectangle(width / 2, height - inset + thick / 2, width + thick * 2, thick, options),
        Bodies.rectangle(inset - thick / 2, height - tall / 2, thick, tall, options),
        Bodies.rectangle(width - inset + thick / 2, height - tall / 2, thick, tall, options),
        // A lid well above the card, so a thrown chip always falls back in.
        Bodies.rectangle(width / 2, height - tall - thick / 2, width + thick * 2, thick, options),
      ];
    }

    resize({ width, height }) {
      if (!width || !height || (width === this.size.width && height === this.size.height)) return;
      const { Body, Composite, Sleeping } = window.Matter;
      const ratioX = width / this.size.width;
      const ratioY = height / this.size.height;
      const before = this.scale;
      this.size = { width, height };
      this.layout();
      this.bodies.forEach((body) => {
        Body.scale(body, this.scale / before, this.scale / before);
        Body.setPosition(body, { x: body.position.x * ratioX, y: body.position.y * ratioY });
        Sleeping.set(body, false);
      });
      Composite.remove(this.engine.world, this.walls);
      this.walls = this.makeWalls();
      Composite.add(this.engine.world, this.walls);
      this.rect = null;
      this.render(true);
    }

    render(force) {
      for (let index = 0; index < this.bodies.length; index++) {
        const body = this.bodies[index];
        if (body.isSleeping && !force) continue;
        const radius = body.circleRadius;
        this.flags[index].style.transform = `translate3d(${body.position.x - radius}px, ${
          body.position.y - radius
        }px, 0) rotate(${body.angle}rad)`;
      }
    }

    // A hard throw stays catchable and never tunnels through a wall.
    limitSpeed() {
      const { Body } = window.Matter;
      const max = 28;
      this.bodies.forEach((body) => {
        const speed = Body.getSpeed(body);
        if (speed > max) Body.setSpeed(body, max);
      });
    }

    point(event) {
      if (!this.rect) this.rect = this.root.getBoundingClientRect();
      return { x: event.clientX - this.rect.left, y: event.clientY - this.rect.top };
    }

    onPointerDown(event) {
      const flag = event.target.closest('.bs-flags__flag');
      if (!flag || this.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const { Composite, Constraint, Sleeping } = window.Matter;
      event.preventDefault();
      this.rect = null;
      const body = this.bodies[this.flags.indexOf(flag)];
      const point = this.point(event);
      Sleeping.set(body, false);
      const constraint = Constraint.create({
        pointA: point,
        bodyB: body,
        pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
        stiffness: 0.2,
        damping: 0.1,
        length: 0,
      });
      Composite.add(this.engine.world, constraint);
      flag.setPointerCapture(event.pointerId);
      this.drag = { id: event.pointerId, body, constraint };
      this.root.classList.add('is-dragging');
    }

    onPointerMove(event) {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      this.drag.constraint.pointA = this.point(event);
      window.Matter.Sleeping.set(this.drag.body, false);
    }

    onPointerUp(event) {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      window.Matter.Composite.remove(this.engine.world, this.drag.constraint);
      this.drag = null;
      this.root.classList.remove('is-dragging');
    }

    // The chips scatter a little when the mouse comes onto the card.
    onPointerEnter(event) {
      if (event.pointerType !== 'mouse' || this.drag) return;
      const now = performance.now();
      if (now - (this.lastScatter || 0) < 600) return;
      this.lastScatter = now;
      const { Body, Sleeping } = window.Matter;
      const kick = 4 * this.scale + 2;
      this.bodies.forEach((body) => {
        Sleeping.set(body, false);
        Body.setVelocity(body, {
          x: body.velocity.x + (Math.random() - 0.5) * kick,
          y: body.velocity.y - kick * (0.6 + Math.random() * 0.6),
        });
        Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.12);
      });
    }
  }

  /* Developer: GSAP micro animations on the product silhouettes. */
  class Products {
    static ready() {
      return Boolean(window.gsap);
    }

    constructor(root) {
      this.root = root;
      this.items = {};
      root.querySelectorAll('[data-product]').forEach((item) => (this.items[item.dataset.product] = item));
    }

    start() {
      const gsap = window.gsap;
      const items = this.items;
      const all = Object.values(items);
      this.context = gsap.context(() => {
        gsap.set(all, { transformOrigin: '50% 100%' });
        this.intro = gsap.fromTo(
          all,
          { opacity: 0, y: 50, scale: 0.5 },
          { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'elastic.out(1, 0.6)', stagger: 0.09 }
        );

        // Each silhouette has its own small move, on its own beat.
        const loop = (target, delay, repeatDelay, build) => {
          if (!target) return null;
          const timeline = gsap.timeline({ delay, repeat: -1, repeatDelay });
          build(timeline, target);
          return timeline;
        };
        this.loops = [
          loop(items.bottle, 1.1, 1.8, (tl, el) =>
            tl
              .to(el, { rotation: 5, duration: 0.45, ease: 'sine.out' })
              .to(el, { rotation: -4, duration: 0.6, ease: 'sine.inOut' })
              .to(el, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })
          ),
          loop(items.pouch, 1.6, 2.2, (tl, el) =>
            tl
              .to(el, { scaleX: 1.06, scaleY: 0.9, duration: 0.25, ease: 'power2.out' })
              .to(el, { scaleX: 1, scaleY: 1, duration: 1, ease: 'elastic.out(1.1, 0.35)' })
          ),
          loop(items.carton, 2.2, 2.6, (tl, el) =>
            tl
              .to(el, { y: -18, duration: 0.3, ease: 'power2.out' })
              .to(el, { y: 0, duration: 0.7, ease: 'bounce.out' })
          ),
          loop(items.can, 2.7, 2, (tl, el) =>
            tl
              .to(el, { y: -14, rotation: -10, duration: 0.28, ease: 'power2.out' })
              .to(el, { y: 0, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' })
          ),
          loop(items.box, 3.2, 3, (tl, el) =>
            tl
              .to(el, { scale: 1.05, duration: 0.2, ease: 'power2.out' })
              .to(el, { scale: 1, duration: 0.9, ease: 'elastic.out(1.2, 0.35)' })
          ),
        ].filter(Boolean);
      }, this.root);
      this.root.classList.remove('is-armed');
      this.started = true;
    }

    play() {
      if (!this.started) return this.start();
      this.intro.resume();
      this.loops.forEach((timeline) => timeline.resume());
    }

    pause() {
      if (!this.started) return;
      this.intro.pause();
      this.loops.forEach((timeline) => timeline.pause());
    }

    destroy() {
      if (this.context) this.context.revert();
    }
  }

  /* Distributor: delivery dots along the highways, towns pop as they are reached, hub pulse. */
  class DeliveryMap {
    static ready() {
      return Boolean(window.gsap);
    }

    constructor(root) {
      this.root = root;
      this.svg = root.querySelector('svg');
      this.vic = this.svg.querySelector('[data-vic]');
      this.trucks = this.svg.querySelector('.bs-map__trucks');
      this.routes = Array.from(this.svg.querySelectorAll('[data-route]')).map((path) =>
        this.polyline(path.getAttribute('d'))
      );
      this.assignTowns(Array.from(this.svg.querySelectorAll('.bs-map__towns circle')));
    }

    // "M x y L x y ..." into points with the distance along the road at each.
    polyline(d) {
      const numbers = d.match(/-?[\d.]+/g).map(Number);
      const points = [];
      let length = 0;
      for (let index = 0; index < numbers.length; index += 2) {
        const point = { x: numbers[index], y: numbers[index + 1] };
        const last = points[points.length - 1];
        if (last) length += Math.hypot(point.x - last.x, point.y - last.y);
        point.s = length;
        points.push(point);
      }
      return { points, length, stops: [] };
    }

    // Closest point of a route to (x, y): distance and how far along the route it is.
    nearest(route, x, y) {
      let best = { distance: Infinity, s: 0 };
      for (let index = 1; index < route.points.length; index++) {
        const a = route.points[index - 1];
        const b = route.points[index];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const span = dx * dx + dy * dy;
        const t = span ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / span)) : 0;
        const distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
        if (distance < best.distance) best = { distance, s: a.s + t * Math.sqrt(span) };
      }
      return best;
    }

    // Every town is delivered by one route that passes it, shared out so each route has stops.
    assignTowns(towns) {
      towns.forEach((town) => {
        const x = Number(town.getAttribute('cx'));
        const y = Number(town.getAttribute('cy'));
        let choice = null;
        this.routes.forEach((route) => {
          const near = this.nearest(route, x, y);
          if (near.distance > 20) return;
          if (
            !choice ||
            route.stops.length < choice.route.stops.length ||
            (route.stops.length === choice.route.stops.length && near.distance < choice.near.distance)
          ) {
            choice = { route, near };
          }
        });
        if (choice) choice.route.stops.push({ town, s: choice.near.s });
      });
    }

    pointAt(route, s) {
      const points = route.points;
      let index = 1;
      while (index < points.length - 1 && points[index].s < s) index++;
      const a = points[index - 1];
      const b = points[index];
      const t = b.s === a.s ? 0 : Math.min(1, (s - a.s) / (b.s - a.s));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }

    makeTruck() {
      const ns = 'http://www.w3.org/2000/svg';
      const holder = document.createElementNS(ns, 'g');
      const truck = document.createElementNS(ns, 'g');
      const halo = document.createElementNS(ns, 'circle');
      const dot = document.createElementNS(ns, 'circle');
      halo.setAttribute('r', '8');
      dot.setAttribute('r', '4.5');
      dot.setAttribute('class', 'bs-map__truck-dot');
      truck.append(halo, dot);
      holder.append(truck);
      this.trucks.append(holder);
      return { holder, truck, halo, inVic: null };
    }

    // Moves a delivery dot; its halo takes the colour of the state under it, as in Figma.
    place(truck, point) {
      truck.holder.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
      const inVic = this.vic.isPointInFill ? this.vic.isPointInFill(new DOMPoint(point.x, point.y)) : false;
      if (inVic !== truck.inVic) {
        truck.inVic = inVic;
        truck.halo.style.fill = inVic ? 'var(--bs-illo-blue-80)' : 'var(--bs-illo-blue-60)';
      }
    }

    start() {
      const gsap = window.gsap;
      const speed = 55; // map units per second
      this.context = gsap.context(() => {
        const pulse = this.svg.querySelector('.bs-map__pulse');
        const halo = this.svg.querySelector('.bs-map__halo');
        this.timelines = [
          gsap
            .timeline({ repeat: -1, repeatDelay: 0.4 })
            .fromTo(
              pulse,
              { scale: 1, opacity: 0.8, transformOrigin: '50% 50%' },
              { scale: 2.1, opacity: 0, duration: 2, ease: 'sine.out' }
            ),
          gsap.to(halo, {
            scale: 1.12,
            transformOrigin: '50% 50%',
            duration: 1.2,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          }),
        ];

        this.routes.forEach((route, index) => {
          const truck = this.makeTruck();
          const travel = route.length / speed;
          const progress = { s: 0 };
          gsap.set(truck.truck, { scale: 0, transformOrigin: '50% 50%' });
          this.place(truck, route.points[0]);

          const timeline = gsap.timeline({
            delay: index * 0.6,
            repeat: -1,
            repeatDelay: 0.8 + ((index * 0.37) % 1.4),
          });
          timeline
            .to(truck.truck, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, 0)
            .fromTo(
              progress,
              { s: 0 },
              {
                s: route.length,
                duration: travel,
                ease: 'none',
                onUpdate: () => this.place(truck, this.pointAt(route, progress.s)),
              },
              0
            )
            .to(truck.truck, { scale: 0, duration: 0.3, ease: 'power2.in' }, travel - 0.1);

          route.stops.forEach((stop) => {
            timeline.add(
              gsap
                .timeline()
                .fromTo(
                  stop.town,
                  { opacity: 1, scale: 0, transformOrigin: '50% 50%' },
                  { scale: 1.6, duration: 0.25, ease: 'back.out(3)', immediateRender: false }
                )
                .to(stop.town, { scale: 1, duration: 0.25, ease: 'power2.out' })
                .to(stop.town, { opacity: 0, duration: 0.8, ease: 'power1.in' }, '+=0.6'),
              stop.s / speed
            );
          });
          this.timelines.push(timeline);
        });
      }, this.root);
      this.started = true;
    }

    play() {
      if (!this.started) return this.start();
      this.timelines.forEach((timeline) => timeline.resume());
    }

    pause() {
      if (!this.started) return;
      this.timelines.forEach((timeline) => timeline.pause());
    }

    destroy() {
      if (this.context) this.context.revert();
      this.trucks.replaceChildren();
    }
  }

  const KINDS = { flags: Flags, products: Products, map: DeliveryMap };

  customElements.define(
    'bs-feature-illustration',
    class BsFeatureIllustration extends HTMLElement {
      connectedCallback() {
        if (this.controller) return;
        if (window.Shopify && window.Shopify.designMode) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const Kind = KINDS[this.dataset.kind];
        if (!Kind || !Kind.ready()) return;

        this.controller = new Kind(this);
        // Hidden until it plays in, so nothing jumps from the still frame.
        if (this.dataset.kind !== 'map') this.classList.add('is-armed');
        this.observer = new IntersectionObserver(
          ([entry]) => (entry.isIntersecting ? this.controller.play() : this.controller.pause()),
          { threshold: 0.15 }
        );
        this.observer.observe(this);
      }

      disconnectedCallback() {
        if (!this.controller) return;
        this.observer.disconnect();
        this.controller.destroy();
        this.controller = null;
        this.classList.remove('is-armed');
      }
    }
  );
})();
