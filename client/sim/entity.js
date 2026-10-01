import { Vector2 } from "./vector.js";

export class Entity {
  static #nextId = 1;
  #id = Entity.#nextId++;

  constructor(x, y, radius, kind) {
    this.pos = new Vector2(x, y);
    this.previousPos = this.pos;
    this.vel = new Vector2();
    this.angle = 0;
    this.radius = radius;
    this.kind = kind;
    this.alive = true;
  }

  get id() {
    return this.#id;
  }

  update() {}
}
