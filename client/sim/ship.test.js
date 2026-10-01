import { describe, expect, test } from "vitest";
import { Ship } from "./ship.js";
import { World } from "./world.js";

describe("Ship", () => {
  test("fires a bullet from the ship nose", () => {
    const ship = new Ship(100, 100);
    const bullet = ship.fire();

    expect(bullet.kind).toBe("bullet");
    expect(bullet.pos.x).toBeGreaterThan(ship.pos.x);
    expect(bullet.vel.x).toBeGreaterThan(0);
  });

  test("loses hp and can respawn", () => {
    const world = new World(400, 300, { isDown: () => false });
    const ship = new Ship(100, 100);

    ship.takeDamage();
    expect(ship.hp).toBe(2);
    ship.takeDamage();
    ship.takeDamage();
    expect(ship.respawnTimer).toBeGreaterThan(0);
    ship.respawn(200, 150);
    expect(ship.hp).toBe(3);
    expect(world.width).toBe(400);
  });
});
