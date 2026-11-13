import { Entity } from "./entity.js";
import { Bullet } from "./bullet.js";
import { Vector2 } from "./vector.js";

export class Ship extends Entity {
  #hp = 3;

  constructor(x, y) {
    super(x, y, 18, "ship");
    this.acceleration = 180;
    this.turnSpeed = 3.2;
    this.drag = 0.98;
    this.maxSpeed = 260;
    this.thrusting = false;
    this.fireCooldown = 0;
    this.respawnTimer = 0;
    this.shieldTime = 0;
    this.rapidTime = 0;
  }

  get hp() {
    return this.#hp;
  }

  update(dt, world) {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn(world.width / 2, world.height / 2);
      return;
    }

    const input = world.input;
    const left = input.isDown("a") || input.isDown("arrowleft");
    const right = input.isDown("d") || input.isDown("arrowright");
    const forward = input.isDown("w") || input.isDown("arrowup");
    const reverse = input.isDown("s") || input.isDown("arrowdown");
    this.angle += (right ? 1 : 0) * this.turnSpeed * dt;
    this.angle -= (left ? 1 : 0) * this.turnSpeed * dt;
    const direction = forward ? 1 : reverse ? -1 : 0;
    this.vel = this.vel.add(
      Vector2.fromAngle(this.angle, this.acceleration * direction * dt)
    );
    this.vel = this.vel.scale(Math.pow(this.drag, dt * 60));
    if (this.vel.length() > this.maxSpeed)
      this.vel = this.vel.normalize().scale(this.maxSpeed);
    this.previousPos = this.pos;
    this.pos = this.pos.add(this.vel.scale(dt));
    this.thrusting = direction !== 0;
    this.fireCooldown -= dt;
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    this.rapidTime = Math.max(0, this.rapidTime - dt);
    if ((input.isDown(" ") || input.isDown("f")) && this.fireCooldown <= 0) {
      const bullet = this.fire();
      world.spawn(bullet);
      world.bus?.dispatchEvent(new CustomEvent("fired", { detail: { bullet } }));
      this.fireCooldown = this.rapidTime > 0 ? 0.08 : 0.22;
    }
    world.wrap(this);
  }

  fire() {
    const direction = Vector2.fromAngle(this.angle);
    return new Bullet(
      this.pos.add(direction.scale(this.radius + 7)),
      this.vel.add(direction.scale(420)),
      this.angle
    );
  }

  takeDamage() {
    if (this.shieldTime > 0 || this.respawnTimer > 0) return false;
    this.#hp -= 1;
    if (this.#hp <= 0) {
      this.respawnTimer = 2;
      this.vel = new Vector2();
    }
    return true;
  }

  respawn(x, y) {
    this.pos = new Vector2(x, y);
    this.previousPos = this.pos;
    this.vel = new Vector2();
    this.#hp = 3;
  }
}
