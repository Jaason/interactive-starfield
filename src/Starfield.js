import defaultConfig from './defaultConfig.js';
import Star from './Star.js';
import ShootingStar from './ShootingStar.js';

export default class Starfield {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.stars = [];
    this.config = defaultConfig;
    this.pointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      normalizedX: 0,
      normalizedY: 0,
    };

    this.resize();
    this.createStars();

    this.shootingStar = new ShootingStar(
      window.innerWidth,
      window.innerHeight,
      this.config,
    );
    this.lastShootingStarTime = 0;
    this.lastTime = 0;

    window.addEventListener('resize', () => {
      this.resize();
      this.createStars();
      this.shootingStar.reset(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (event) => {
      this.updatePointer(event.clientX, event.clientY);
    });

    window.addEventListener(
      'touchmove',
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;

        this.updatePointer(touch.clientX, touch.clientY);
      },
      { passive: true },
    );

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  updatePointer(clientX, clientY) {
    this.pointer.x = clientX;
    this.pointer.y = clientY;

    this.pointer.normalizedX = clientX / window.innerWidth - 0.5;
    this.pointer.normalizedY = clientY / window.innerHeight - 0.5;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;

    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  createStars() {
    this.stars = Array.from(
      { length: this.config.stars.count },
      () => new Star(
        window.innerWidth,
        window.innerHeight,
        this.config,
        this.pointer,
      ),
    );
  }

  animate(time) {
    const deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const star of this.stars) {
      star.update(window.innerWidth, window.innerHeight, deltaTime);
    }

    this.drawConnections();

    for (const star of this.stars) {
      star.draw(this.ctx, time);
    }

    if (time - this.lastShootingStarTime > 8000 && !this.shootingStar.active) {
      this.shootingStar.launch(window.innerWidth, window.innerHeight);
      this.lastShootingStarTime = time;
    }

    this.shootingStar.update(window.innerWidth, window.innerHeight, deltaTime);
    this.shootingStar.draw(this.ctx);

    requestAnimationFrame(this.animate);
  }

  drawConnections() {
    if (!this.config.connections.enabled) return;

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
