import { Entity } from "./entity.js";

export class Bullet extends Entity {
  constructor(position, velocity, angle) {
    super(position.x, position.y, 4, "bullet");
    this.vel = velocity;
    this.angle = angle;
    this.ttl = 1.6;
    this.damage = 1;
  }

  update(dt, world) {
    this.previousPos = this.pos;
    this.pos = this.pos.add(this.vel.scale(dt));
    this.ttl -= dt;
    if (this.ttl <= 0) this.alive = false;
    world.wrap(this);
  }
}
