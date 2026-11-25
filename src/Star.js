export default class Star {
  constructor(width, height, config, pointer) {
    this.config = config;
    this.pointer = pointer;

    this.reset(width, height);

    this.radius =
      this.config.stars.minRadius +
      Math.random() * (this.config.stars.maxRadius - this.config.stars.minRadius);

    this.depth = this.radius / this.config.stars.maxRadius;

    this.baseOpacity = 0.35 + Math.random() * 0.65;
    this.twinklePhase = Math.random() * Math.PI * 2;

    this.color =
      this.config.stars.colors[
        Math.floor(Math.random() * this.config.stars.colors.length)
      ];

    this.offsetX = 0;
    this.offsetY = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed =
      this.config.stars.minSpeed +
      Math.random() * (this.config.stars.maxSpeed - this.config.stars.minSpeed);

    this.vx = Math.cos(angle) * speed * this.depth;
    this.vy = Math.sin(angle) * speed * this.depth;
  }

  reset(width, height) {
    if (this.config.generation.mode === 'galaxy') {
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

    if (this.config.repulsion.enabled && this.pointer.active) {
      this.applyMouseRepulsion();
    }

    this.offsetX *= this.config.repulsion.friction;
    this.offsetY *= this.config.repulsion.friction;
  }

  applyMouseRepulsion() {
    const dx = this.x - this.pointer.x;
    const dy = this.y - this.pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.config.repulsion.radius || distance === 0) return;

    const force = 1 - distance / this.config.repulsion.radius;
    const angle = Math.atan2(dy, dx);

    this.offsetX += Math.cos(angle) * force * this.config.repulsion.strength;
    this.offsetY += Math.sin(angle) * force * this.config.repulsion.strength;
  }

  getParallaxOffset() {
    if (!this.config.parallax.enabled) {
      return { x: 0, y: 0 };
    }

    return {
      x: this.pointer.normalizedX * this.config.parallax.strength * this.depth,
      y: this.pointer.normalizedY * this.config.parallax.strength * this.depth,
    };
  }

  draw(ctx, time) {
    const parallax = this.getParallaxOffset();

    const x = this.x + parallax.x + this.offsetX;
    const y = this.y + parallax.y + this.offsetY;

    let opacity = this.baseOpacity;

    if (this.config.twinkle.enabled) {
      opacity +=
        Math.sin(time * this.config.twinkle.speed + this.twinklePhase) *
        this.config.twinkle.strength;

      opacity = Math.max(0.15, Math.min(1, opacity));
    }

    ctx.save();

    if (this.config.glow.enabled) {
      ctx.shadowBlur = Math.max(
        1,
        this.radius * this.config.glow.strength * this.depth,
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

    const maxDistance = Math.min(width, height) * this.config.galaxy.spread;
    const angle = Math.random() * Math.PI * 2;

    const distance =
      Math.pow(Math.random(), this.config.galaxy.centerStrength) * maxDistance;

    const spiralAngle =
      angle + distance * 0.01 * this.config.galaxy.rotation;

    this.x = centerX + Math.cos(spiralAngle) * distance;
    this.y =
      centerY + Math.sin(spiralAngle) * distance * this.config.galaxy.flattening;
  }
}
