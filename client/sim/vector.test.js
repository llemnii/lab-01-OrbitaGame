import { describe, expect, test } from "vitest";
import { Vector2 } from "./vector.js";

describe("Vector2", () => {
  test("returns new vectors from pure methods", () => {
    const original = new Vector2(2, 3);
    const result = original.add(new Vector2(4, 1));

    expect(result).toEqual(new Vector2(6, 4));
    expect(original).toEqual(new Vector2(2, 3));
  });

  test("creates a vector from an angle", () => {
    expect(Vector2.fromAngle(0, 5).x).toBeCloseTo(5);
    expect(Vector2.fromAngle(Math.PI / 2, 5).y).toBeCloseTo(5);
  });
});
