export default class ShootingStar {
  constructor(width, height, config) {
    this.config = config;

    this.reset(width, height);
  }

  reset(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height * 0.5;
    this.length = 80 + Math.random() * 120;

    this.speed =
      this.config.shootingStar.minSpeed +
      Math.random() *
        (this.config.shootingStar.maxSpeed - this.config.shootingStar.minSpeed);

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
    ctx.lineWidth = this.config.shootingStar.lineWidth;
    ctx.stroke();
  }
}
