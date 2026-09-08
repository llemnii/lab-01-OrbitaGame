import { describe, expect, test } from "vitest";
import { createShip, integrate } from "./physics.js";

function makeInput(keys) {
  return {
    isDown(key) {
      return keys.includes(key);
    }
  };
}

describe("integrate", () => {
  test("рухає корабель вперед, коли натиснута клавіша вгору", () => {
    const ship = createShip(400, 300);
    const input = makeInput(["w"]);

    integrate(ship, input, 1 / 60);

    expect(ship.velocityX).toBeGreaterThan(0);
    expect(ship.x).toBeGreaterThan(200);
  });

  test("повертає корабель, коли натиснута клавіша ліворуч", () => {
    const ship = createShip(400, 300);
    const input = makeInput(["arrowleft"]);

    integrate(ship, input, 1 / 60);

    expect(ship.angle).toBeLessThan(ship.startAngle);
  });

  test("переносить корабель з правого краю на лівий", () => {
    const ship = createShip(400, 300);
    const input = makeInput([]);
    ship.x = 399;
    ship.velocityX = 120;

    integrate(ship, input, 1 / 60);

    expect(ship.x).toBeLessThan(30);
    expect(ship.previousX).toBe(ship.x);
  });
});
