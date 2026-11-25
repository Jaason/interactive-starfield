const CONFIG = {
  stars: {
    count: 240,
    minRadius: 0.5,
    maxRadius: 2,
    minSpeed: 8,
    maxSpeed: 18,
    colors: ['255, 255, 255', '180, 210, 255', '255, 230, 180'],
  },

  twinkle: {
    enabled: true,
    strength: 0.35,
    speed: 0.002,
  },

  parallax: {
    enabled: true,
    strength: 18,
  },

  repulsion: {
    enabled: true,
    radius: 50,
    strength: 22,
    friction: 0.9,
  },

  shootingStar: {
    minSpeed: 600,
    maxSpeed: 900,
    lineWidth: 1,
  },

  generation: {
    mode: 'galaxy', // 'random' | 'galaxy'
  },

  galaxy: {
    centerStrength: 2.2,
    spread: 0.48,
    flattening: 0.45,
    rotation: 0.8,
  },

  connections: {
    enabled: true,
    radius: 90,
    mouseRadius: 160,
    lineOpacity: 0.22,
    lineWidth: 0.5,
  },

  glow: {
    enabled: true,
    strength: 4,
  },
};

const canvas = document.querySelector('#starfield');
const ctx = canvas.getContext('2d');

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  normalizedX: 0,
  normalizedY: 0,
};

class Star {
  constructor(width, height) {
    this.reset(width, height);

    this.radius =
      CONFIG.stars.minRadius +
      Math.random() * (CONFIG.stars.maxRadius - CONFIG.stars.minRadius);

    this.depth = this.radius / CONFIG.stars.maxRadius;

    this.baseOpacity = 0.35 + Math.random() * 0.65;
    this.twinklePhase = Math.random() * Math.PI * 2;

    this.color =
      CONFIG.stars.colors[
        Math.floor(Math.random() * CONFIG.stars.colors.length)
      ];

    this.offsetX = 0;
    this.offsetY = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed =
      CONFIG.stars.minSpeed +
      Math.random() * (CONFIG.stars.maxSpeed - CONFIG.stars.minSpeed);

    this.vx = Math.cos(angle) * speed * this.depth;
    this.vy = Math.sin(angle) * speed * this.depth;
  }

  reset(width, height) {
    if (CONFIG.generation.mode === 'galaxy') {
      this.resetGalaxy(width, height);
      return;
    }

    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }

  update(width, height, deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    if (this.x < -10) this.x = width + 10;
    if (this.x > width + 10) this.x = -10;
    if (this.y < -10) this.y = height + 10;
    if (this.y > height + 10) this.y = -10;

    if (CONFIG.repulsion.enabled) {
      this.applyMouseRepulsion();
    }

    this.offsetX *= CONFIG.repulsion.friction;
    this.offsetY *= CONFIG.repulsion.friction;
  }

  applyMouseRepulsion() {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > CONFIG.repulsion.radius || distance === 0) return;

    const force = 1 - distance / CONFIG.repulsion.radius;
    const angle = Math.atan2(dy, dx);

    this.offsetX += Math.cos(angle) * force * CONFIG.repulsion.strength;
    this.offsetY += Math.sin(angle) * force * CONFIG.repulsion.strength;
  }

  getParallaxOffset() {
    if (!CONFIG.parallax.enabled) {
      return { x: 0, y: 0 };
    }

    return {
      x: mouse.normalizedX * CONFIG.parallax.strength * this.depth,
      y: mouse.normalizedY * CONFIG.parallax.strength * this.depth,
    };
  }

  draw(ctx, time) {
    const parallax = this.getParallaxOffset();

    const x = this.x + parallax.x + this.offsetX;
    const y = this.y + parallax.y + this.offsetY;

    let opacity = this.baseOpacity;

    if (CONFIG.twinkle.enabled) {
      opacity +=
        Math.sin(time * CONFIG.twinkle.speed + this.twinklePhase) *
        CONFIG.twinkle.strength;

      opacity = Math.max(0.15, Math.min(1, opacity));
    }

    ctx.save();

    if (CONFIG.glow.enabled) {
      ctx.shadowBlur = Math.max(
        1,
        this.radius * CONFIG.glow.strength * this.depth,
      );
      ctx.shadowColor = `rgba(${this.color}, ${opacity})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color}, ${opacity})`;
    ctx.fill();

    ctx.restore();
  }

  resetGalaxy(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;

    const maxDistance = Math.min(width, height) * CONFIG.galaxy.spread;
    const angle = Math.random() * Math.PI * 2;

    const distance =
      Math.pow(Math.random(), CONFIG.galaxy.centerStrength) * maxDistance;

    const spiralAngle =
      angle + distance * 0.01 * CONFIG.galaxy.rotation;

    this.x = centerX + Math.cos(spiralAngle) * distance;
    this.y =
      centerY + Math.sin(spiralAngle) * distance * CONFIG.galaxy.flattening;
  }
}

class StarField {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.stars = [];

    this.resize();
    this.createStars();

    this.shootingStar = new ShootingStar(window.innerWidth, window.innerHeight);
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
    mouse.x = clientX;
    mouse.y = clientY;

    mouse.normalizedX = clientX / window.innerWidth - 0.5;
    mouse.normalizedY = clientY / window.innerHeight - 0.5;
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
      { length: CONFIG.stars.count },
      () => new Star(window.innerWidth, window.innerHeight),
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
    if (!CONFIG.connections.enabled) return;

    const starsNearMouse = this.stars.filter((star) => {
      const dx = star.x - mouse.x;
      const dy = star.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < CONFIG.connections.mouseRadius;
    });

    for (let i = 0; i < starsNearMouse.length; i++) {
      for (let j = i + 1; j < starsNearMouse.length; j++) {
        const starA = starsNearMouse[i];
        const starB = starsNearMouse[j];

        const dx = starA.x - starB.x;
        const dy = starA.y - starB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > CONFIG.connections.radius) continue;

        const opacity =
          (1 - distance / CONFIG.connections.radius) *
          CONFIG.connections.lineOpacity;

        this.ctx.beginPath();
        this.ctx.moveTo(starA.x, starA.y);
        this.ctx.lineTo(starB.x, starB.y);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.lineWidth = CONFIG.connections.lineWidth;
        this.ctx.stroke();
      }
    }
  }
}

class ShootingStar {
  constructor(width, height) {
    this.reset(width, height);
  }

  reset(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height * 0.5;
    this.length = 80 + Math.random() * 120;

    this.speed =
      CONFIG.shootingStar.minSpeed +
      Math.random() *
        (CONFIG.shootingStar.maxSpeed - CONFIG.shootingStar.minSpeed);

    this.opacity = 0;
    this.active = false;
  }

  launch(width, height) {
    this.reset(width, height);
    this.active = true;
    this.opacity = 1;
  }

  update(width, height, deltaTime) {
    if (!this.active) return;

    this.x += this.speed * deltaTime;
    this.y += this.speed * 0.35 * deltaTime;
    this.opacity -= 1.4 * deltaTime;

    if (this.opacity <= 0 || this.x > width || this.y > height) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    const endX = this.x - this.length;
    const endY = this.y - this.length * 0.35;

    const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);

    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = CONFIG.shootingStar.lineWidth;
    ctx.stroke();
  }
}

new StarField(canvas, ctx);