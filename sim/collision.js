import { Explosion } from "./explosion.js";

function overlaps(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const distance = Math.hypot(dx, dy);
  return distance <= a.radius + b.radius;
}

export function resolveCollisions(world) {
  const entities = [...world];
  for (let first = 0; first < entities.length; first += 1) {
    for (let second = first + 1; second < entities.length; second += 1) {
      const a = entities[first];
      const b = entities[second];
      if (!a.alive || !b.alive || !overlaps(a, b)) continue;

      const bullet = a.kind === "bullet" ? a : b.kind === "bullet" ? b : null;
      const asteroid = a.kind === "asteroid" ? a : b.kind === "asteroid" ? b : null;
      if (bullet && asteroid) {
        bullet.alive = false;
        asteroid.takeDamage(bullet.damage);
        if (!asteroid.alive) {
          world.score += 10;
          world.spawn(new Explosion(asteroid.pos.x, asteroid.pos.y));
        }
        continue;
      }

      const ship = a.kind === "ship" ? a : b.kind === "ship" ? b : null;
      if (ship && asteroid && ship.takeDamage()) {
        world.score = Math.max(0, world.score - 5);
      }

      const pickup = a.kind === "pickup" ? a : b.kind === "pickup" ? b : null;
      if (ship && pickup) {
        pickup.collect(ship);
        world.score += 25;
      }
    }
  }
}
