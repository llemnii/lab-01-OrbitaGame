import { describe, expect, test } from "vitest";
import { Entity } from "./entity.js";
import { World } from "./world.js";

describe("World", () => {
  test("stores entities in a Map and filters them by kind", () => {
    const world = new World(500, 400, { isDown: () => false });
    world.spawn(new Entity(10, 10, 4, "test"));
    world.step(1 / 60);

    expect([...world]).toHaveLength(1);
    expect([...world.ofKind("test")]).toHaveLength(1);
  });

  test("removes dead entities after a step", () => {
    const world = new World(500, 400, { isDown: () => false });
    const entity = world.spawn(new Entity(10, 10, 4, "test"));
    world.step(1 / 60);
    entity.alive = false;
    world.step(1 / 60);

    expect([...world]).toHaveLength(0);
  });
});
