import { Entity } from "./entity.js";

export class Explosion extends Entity {
  constructor(x, y) {
    super(x, y, 18, "explosion");
    this.age = 0;
    this.ttl = 0.45;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.ttl) this.alive = false;
  }
}
