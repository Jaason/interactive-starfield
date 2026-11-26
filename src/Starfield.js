import { createConfig, equalConfigSection } from './config.js';
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
    this.document = canvas.ownerDocument;
    this.config = config;
    this.stars = [];
    this._nearbyStars = [];
    this._motionQuery = null;
    this.shootingStar = null;
    this.pointer = null;
    this._destroyed = false;
    this._started = false;
    this._frameId = null;
    this._frameCallback = null;
    this._observer = null;
    this._sizeValid = false;
    this._sizeDirty = false;
    this.lastTime = null;
    this.elapsedTime = 0;
    this.lastShootingStarTime = 0;

    this._onResize = () => {
      if (this._destroyed) return;
      this._sizeDirty = true;
      this._syncPlayback();
    };
    this._onMouseMove = (event) => {
      if (!this._destroyed) this.updatePointer(event.clientX, event.clientY);
    };
    this._onTouchMove = (event) => {
      if (this._destroyed) return;
      const touch = event.touches[0];
      if (touch) this.updatePointer(touch.clientX, touch.clientY);
    };
    this._onMotionChange = () => {
      if (!this._destroyed) this._syncPlayback();
    };
    this._onVisibility = () => {
      if (this._destroyed) return;
      this._sizeDirty = true;
      this._syncPlayback();
    };

    try {
      this.resize();
      if (!this._sizeValid) {
        throw new RangeError('Starfield: set CSS width and height independently of the canvas backing dimensions.');
      }
      this.pointer = {
        x: this.width / 2,
        y: this.height / 2,
        normalizedX: 0,
        normalizedY: 0,
        active: true,
      };
      this.stars = this.createStars();
      this.shootingStar = new ShootingStar(this.width, this.height, this.config);

      this.view.addEventListener('resize', this._onResize);
      this.view.addEventListener('mousemove', this._onMouseMove);
      this.view.addEventListener('touchmove', this._onTouchMove, { passive: true });
      this.document.addEventListener('visibilitychange', this._onVisibility);
      if (typeof this.view.ResizeObserver === 'function') {
        this._observer = new this.view.ResizeObserver(this._onResize);
        this._observer.observe(this.canvas);
      }
      if (typeof this.view.matchMedia === 'function') {
        this._motionQuery = this.view.matchMedia('(prefers-reduced-motion: reduce)');
        this._motionQuery.addEventListener('change', this._onMotionChange);
      }
      this.start();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  start() {
    if (this._destroyed) throw new Error('Starfield: cannot start a destroyed instance.');
    if (!this._started) {
      this._started = true;
      this._sizeDirty = true;
    }
    this._syncPlayback();
    return this;
  }

  stop() {
    if (this._destroyed) return this;
    this._started = false;
    this._suspend();
    return this;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._started = false;
    this._suspend();
    this.view.removeEventListener('resize', this._onResize);
    this.view.removeEventListener('mousemove', this._onMouseMove);
    this.view.removeEventListener('touchmove', this._onTouchMove);
    this.document.removeEventListener('visibilitychange', this._onVisibility);
    this._observer?.disconnect();
    this._motionQuery?.removeEventListener('change', this._onMotionChange);

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.stars.length = 0;
    this.stars = null;
    this._nearbyStars.length = 0;
    this._nearbyStars = null;
    this._motionQuery = null;
    this._onMotionChange = null;
    this.shootingStar = null;
    this.pointer = null;
    this.config = null;
    this._observer = null;
    this._onResize = null;
    this._onMouseMove = null;
    this._onTouchMove = null;
    this._onVisibility = null;
    this.canvas = null;
    this.ctx = null;
    this.document = null;
    this.view = null;
  }

  updateConfig(patch = {}) {
    if (this._destroyed) throw new Error('Starfield: cannot configure a destroyed instance.');
    const next = createConfig(patch, this.config);
    const changed = Object.keys(next).filter(name => !equalConfigSection(this.config[name], next[name]));
    if (changed.length === 0) return this;

    // Prepare replacement particles before committing any state changes.
    const regenerate = changed.some(name => ['stars', 'generation', 'galaxy'].includes(name));
    const stars = regenerate ? this.createStars(next) : this.stars;
    this.config = next;
    this.stars = stars;
    for (const star of this.stars) star.config = next;
    this.shootingStar.config = next;
    // Do not retain stars replaced by an update while stopped or hidden.
    this._nearbyStars.length = 0;
    if (changed.includes('rendering')) this._sizeDirty = true;
    if (changed.includes('rendering') || changed.includes('accessibility') || this._reducedMotion()) {
      this._syncPlayback();
    }
    return this;
  }

  _suspend() {
    if (this._frameId !== null) this.view.cancelAnimationFrame(this._frameId);
    this._frameId = null;
    this._frameCallback = null;
    this.lastTime = null;
  }

  _reducedMotion() {
    return this.config.accessibility.respectReducedMotion && this._motionQuery?.matches;
  }

  _syncPlayback() {
    if (this._destroyed) return;
    if (!this._started || this.document.hidden) {
      this._suspend();
      return;
    }
    if (this._sizeDirty) {
      this._sizeDirty = false;
      const width = this.width;
      const height = this.height;
      if (this.resize() && (width !== this.width || height !== this.height)) {
        this._nearbyStars.length = 0;
        this.stars = this.createStars();
        this.shootingStar.reset(this.width, this.height);
      }
    }
    if (!this._sizeValid) {
      this._suspend();
      return;
    }
    if (this._reducedMotion()) {
      this._suspend();
      this._render();
      return;
    }
    this._queueFrame();
  }

  _queueFrame() {
    if (this._destroyed || !this._started || !this._sizeValid ||
        this.document.hidden || this._reducedMotion() || this._frameId !== null) return;
    if (this._frameCallback === null) {
      // Reuse one callback per running period. A callback from a previous period
      // cannot consume the new frame or restart a stopped/destroyed instance.
      const callback = (time) => {
        if (this._destroyed || this._frameCallback !== callback) return;
        this._frameId = null;
        this._animate(time);
      };
      this._frameCallback = callback;
    }
    this._frameId = this.view.requestAnimationFrame(this._frameCallback);
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
    this._sizeValid = width > 0 && height > 0;
    if (!this._sizeValid) return false;
    const nativeDpr = this.view.devicePixelRatio || 1;
    const dpr = Math.min(nativeDpr, this.config.rendering.maxDpr ?? nativeDpr);
    if (width === this.width && height === this.height && dpr === this.dpr) return false;
    const previousWidth = this.canvas.width;
    const previousHeight = this.canvas.height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Prevent intrinsic sizing from feeding the scaled buffer back into layout.
    if (this.canvas.clientWidth !== width || this.canvas.clientHeight !== height) {
      this.canvas.width = previousWidth;
      this.canvas.height = previousHeight;
      const previousDpr = this.dpr || 1;
      this.ctx.setTransform(previousDpr, 0, 0, previousDpr, 0, 0);
      this._sizeValid = false;
      return false;
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  createStars(config = this.config) {
    return Array.from(
      { length: config.stars.count },
      () => new Star(this.width, this.height, config, this.pointer),
    );
  }

  _animate(time) {
    if (this._destroyed) return;
    if (!this._started || !this._sizeValid || this.document.hidden) {
      this._suspend();
      return;
    }
    if (this._reducedMotion()) {
      this._syncPlayback();
      return;
    }
    const elapsed = this.lastTime === null ? 0 : Math.max(0, Math.min(50, time - this.lastTime));
    this.lastTime = time;
    this.elapsedTime += elapsed;
    const deltaTime = elapsed / 1000;

    for (const star of this.stars) star.update(this.width, this.height, deltaTime);

    if (this.elapsedTime - this.lastShootingStarTime > 8000 && !this.shootingStar.active) {
      this.shootingStar.launch(this.width, this.height);
      this.lastShootingStarTime = this.elapsedTime;
    }
    this.shootingStar.update(this.width, this.height, deltaTime);
    this._render();
    this._queueFrame();
  }

  _render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const star of this.stars) star.updateRenderPosition();
    this.drawConnections();
    for (const star of this.stars) star.draw(this.ctx, this.elapsedTime);
    // Reduced motion presents a static starfield, without a frozen moving trail.
    if (!this._reducedMotion()) this.shootingStar.draw(this.ctx);
  }

  drawConnections() {
    this._nearbyStars.length = 0;
    if (!this.config.connections.enabled || !this.pointer.active) return;

    const starsNearMouse = this._nearbyStars;
    const mouseRadiusSquared = this.config.connections.mouseRadius ** 2;
    const radiusSquared = this.config.connections.radius ** 2;
    for (const star of this.stars) {
      const dx = star.renderX - this.pointer.x;
      const dy = star.renderY - this.pointer.y;
      if (dx * dx + dy * dy < mouseRadiusSquared) starsNearMouse.push(star);
    }

    for (let i = 0; i < starsNearMouse.length; i++) {
      for (let j = i + 1; j < starsNearMouse.length; j++) {
        const starA = starsNearMouse[i];
        const starB = starsNearMouse[j];

        const dx = starA.renderX - starB.renderX;
        const dy = starA.renderY - starB.renderY;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > radiusSquared) continue;
        const distance = Math.sqrt(distanceSquared);

        const opacity =
          (1 - distance / this.config.connections.radius) *
          this.config.connections.lineOpacity;

        this.ctx.beginPath();
        this.ctx.moveTo(starA.renderX, starA.renderY);
        this.ctx.lineTo(starB.renderX, starB.renderY);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.lineWidth = this.config.connections.lineWidth;
        this.ctx.stroke();
      }
    }
  }
}
