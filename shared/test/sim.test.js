import { describe, expect, it } from "vitest";
import { addShip, createWorld, stepWorld } from "../src/sim.js";

describe("shared simulation", () => {
  it("gives the same state for the same seed and inputs", () => {
    const left = createWorld(7);
    const right = createWorld(7);
    addShip(left, 1);
    addShip(right, 1);
    for (let tick = 0; tick < 20; tick += 1) {
      const input = { 1: { thrust: 1, turn: tick % 2 ? 1 : 0, fire: false } };
      stepWorld(left, input);
      stepWorld(right, input);
    }
    expect(left).toEqual(right);
  });
});
