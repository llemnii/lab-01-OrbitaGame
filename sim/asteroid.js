import { Entity } from "./entity.js";

export class Asteroid extends Entity {
  constructor(x, y, radius = 24) {
    super(x, y, radius, "asteroid");
    this.vel.x = (Math.random() - 0.5) * 90;
    this.vel.y = (Math.random() - 0.5) * 90;
    this.hp = radius > 20 ? 2 : 1;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    this.angle = Math.random() * Math.PI * 2;
    this.behaviors = [];
  }

  update(dt, world) {
    this.previousPos = this.pos;
    for (const behavior of this.behaviors) behavior(this, dt, world);
    this.pos = this.pos.add(this.vel.scale(dt));
    this.angle += this.rotationSpeed * dt;
    if (this.pos.x < this.radius || this.pos.x > world.width - this.radius) {
      this.vel.x *= -1;
      this.pos.x = Math.max(this.radius, Math.min(world.width - this.radius, this.pos.x));
    }
    if (this.pos.y < this.radius || this.pos.y > world.height - this.radius) {
      this.vel.y *= -1;
      this.pos.y = Math.max(
        this.radius,
        Math.min(world.height - this.radius, this.pos.y)
      );
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.alive = false;
  }
}
