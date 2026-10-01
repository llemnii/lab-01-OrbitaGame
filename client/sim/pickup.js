import { Entity } from "./entity.js";

export class Pickup extends Entity {
  constructor(x, y, type = "shield") {
    super(x, y, 13, "pickup");
    this.type = type;
    this.angle = 0;
  }

  update(dt) {
    this.angle += dt;
  }

  collect(ship) {
    if (this.type === "shield") ship.shieldTime = 5;
    if (this.type === "rapid") ship.rapidTime = 5;
    this.alive = false;
  }
}
