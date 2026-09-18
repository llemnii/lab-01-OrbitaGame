export class World {
  #entities = new Map();
  #pending = [];

  constructor(width, height, input) {
    this.width = width;
    this.height = height;
    this.input = input;
    this.score = 0;
  }

  spawn(entity) {
    this.#pending.push(entity);
    return entity;
  }

  despawn(id) {
    const entity = this.#entities.get(id);
    if (entity) entity.alive = false;
  }

  get(id) {
    return this.#entities.get(id);
  }

  *[Symbol.iterator]() {
    yield* this.#entities.values();
  }

  *ofKind(kind) {
    for (const entity of this) if (entity.kind === kind) yield entity;
  }

  step(dt) {
    for (const entity of this.#entities.values()) {
      if (entity.alive || entity.kind === "ship") entity.update(dt, this);
    }
    for (const entity of this.#pending) this.#entities.set(entity.id, entity);
    this.#pending = [];
    for (const [id, entity] of this.#entities) {
      if (!entity.alive && entity.kind !== "ship") this.#entities.delete(id);
    }
  }

  wrap(entity) {
    entity.pos.x = (entity.pos.x + this.width) % this.width;
    entity.pos.y = (entity.pos.y + this.height) % this.height;
  }

  get size() {
    return this.#entities.size + this.#pending.length;
  }
}
