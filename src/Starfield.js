import { createConfig } from './config.js';
import Star from './Star.js';
import ShootingStar from './ShootingStar.js';

export default class Starfield {
  constructor(target, options) {
    const config = createConfig(options);
    let canvas = target;
    if (typeof target === 'string') {
      if (typeof document === 'undefined') {
        throw new Error('Starfield: a document is required to resolve a canvas selector.');
      }
      try {
        canvas = document.querySelector(target);
      } catch {
        throw new TypeError(`Starfield: invalid canvas selector "${target}".`);
      }
      if (!canvas) {
        throw new Error(`Starfield: no canvas matches selector "${target}".`);
      }
    }

    const view = canvas?.ownerDocument?.defaultView;
    if (!view || !(canvas instanceof view.HTMLCanvasElement)) {
      throw new TypeError('Starfield: target must be a canvas element or a CSS selector for one.');
    }
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
      throw new RangeError('Starfield: canvas must have a positive CSS width and height before initialization.');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Starfield: a Canvas 2D context is not available.');
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.view = view;
    this.stars = [];
    this.config = config;
    if (!this.resize()) {
      throw new RangeError('Starfield: set CSS width and height independently of the canvas backing dimensions.');
    }
    this.pointer = {
      x: this.width / 2,
      y: this.height / 2,
      normalizedX: 0,
      normalizedY: 0,
      active: true,
    };

    this.createStars();

    this.shootingStar = new ShootingStar(
      this.width,
      this.height,
      this.config,
    );
    this.lastShootingStarTime = 0;
    this.lastTime = 0;

    this.view.addEventListener('resize', () => {
      if (!this.resize()) return;
      this.createStars();
      this.shootingStar.reset(this.width, this.height);
    });

    this.view.addEventListener('mousemove', (event) => {
      this.updatePointer(event.clientX, event.clientY);
    });

    this.view.addEventListener(
      'touchmove',
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;

        this.updatePointer(touch.clientX, touch.clientY);
      },
      { passive: true },
    );

    this.animate = this.animate.bind(this);
    this.view.requestAnimationFrame(this.animate);
  }

  updatePointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.pointer.active = rect.width > 0 && rect.height > 0 &&
      x >= 0 && x < rect.width && y >= 0 && y < rect.height;
    if (!this.pointer.active) {
      this.pointer.normalizedX = 0;
      this.pointer.normalizedY = 0;
      return;
    }

    this.pointer.x = x * this.width / rect.width;
    this.pointer.y = y * this.height / rect.height;
    this.pointer.normalizedX = this.pointer.x / this.width - 0.5;
    this.pointer.normalizedY = this.pointer.y / this.height - 0.5;
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    // Keep the last valid drawing size if a running canvas becomes hidden.
    if (width <= 0 || height <= 0) return false;
    const dpr = this.view.devicePixelRatio || 1;
    const previousWidth = this.canvas.width;
    const previousHeight = this.canvas.height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Intrinsic sizing can feed the DPR-scaled buffer size back into layout.
    // Reject that layout instead of growing the buffer on every resize event.
    if (this.canvas.clientWidth !== width || this.canvas.clientHeight !== height) {
      this.canvas.width = previousWidth;
      this.canvas.height = previousHeight;
      const previousDpr = this.dpr || 1;
      this.ctx.setTransform(previousDpr, 0, 0, previousDpr, 0, 0);
      return false;
    }

    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  createStars() {
    this.stars = Array.from(
      { length: this.config.stars.count },
      () => new Star(
        this.width,
        this.height,
        this.config,
        this.pointer,
      ),
    );
  }

  animate(time) {
    const deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      star.update(this.width, this.height, deltaTime);
    }

    this.drawConnections();

    for (const star of this.stars) {
      star.draw(this.ctx, time);
    }

    if (time - this.lastShootingStarTime > 8000 && !this.shootingStar.active) {
      this.shootingStar.launch(this.width, this.height);
      this.lastShootingStarTime = time;
    }

    this.shootingStar.update(this.width, this.height, deltaTime);
    this.shootingStar.draw(this.ctx);

    this.view.requestAnimationFrame(this.animate);
  }

  drawConnections() {
    if (!this.config.connections.enabled || !this.pointer.active) return;

    const starsNearMouse = this.stars.filter((star) => {
      const dx = star.x - this.pointer.x;
      const dy = star.y - this.pointer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < this.config.connections.mouseRadius;
    });

    for (let i = 0; i < starsNearMouse.length; i++) {
      for (let j = i + 1; j < starsNearMouse.length; j++) {
        const starA = starsNearMouse[i];
        const starB = starsNearMouse[j];

        const dx = starA.x - starB.x;
        const dy = starA.y - starB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.config.connections.radius) continue;

        const opacity =
          (1 - distance / this.config.connections.radius) *
          this.config.connections.lineOpacity;

        this.ctx.beginPath();
        this.ctx.moveTo(starA.x, starA.y);
        this.ctx.lineTo(starB.x, starB.y);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.lineWidth = this.config.connections.lineWidth;
        this.ctx.stroke();
      }
    }
  }
}
