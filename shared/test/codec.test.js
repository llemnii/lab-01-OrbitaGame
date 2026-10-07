import { describe, expect, it } from "vitest";
import {
  decodeInput,
  decodeSnapshot,
  encodeInput,
  encodeSnapshot
} from "../src/codec.js";

describe("binary protocol", () => {
  it("round trips an input in little-endian format", () => {
    const input = { seq: 42, tick: 8, thrust: 1, turn: -1, fire: true };
    expect(decodeInput(encodeInput(input))).toMatchObject(input);
  });

  it("round trips a quantized snapshot", () => {
    const value = {
      tick: 12,
      lastProcessedSeq: 4,
      selfId: 2,
      entities: [{ id: 2, kind: 1, hp: 3, x: 10.5, y: 20.25, angle: 1.234 }]
    };
    const decoded = decodeSnapshot(encodeSnapshot(value));
    expect(decoded.tick).toBe(value.tick);
    expect(decoded.entities[0].x).toBeCloseTo(value.entities[0].x, 3);
    expect(decoded.entities[0].angle).toBeCloseTo(value.entities[0].angle, 3);
  });
});
