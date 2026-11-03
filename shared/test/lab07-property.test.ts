import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  decodeInput,
  decodeSnapshot,
  encodeInput,
  encodeSnapshot
} from "../src/codec.ts";
import { addShip, createWorld, input, snapshot, stepWorld } from "../src/sim.ts";
import { parseClientMessage } from "../src/protocol.ts";
import { ObjectPool } from "../src/pool.ts";
import {
  asEntityId,
  asSeq,
  asTick,
  type InputMessage,
  type SnapshotEntity
} from "../src/types.ts";

const inputArb = fc.record({
  seq: fc.nat({ max: 100_000 }),
  tick: fc.nat({ max: 100_000 }),
  thrust: fc.constantFrom(-1, 0, 1),
  turn: fc.constantFrom(-1, 0, 1),
  fire: fc.boolean()
});

const wireInputArb: fc.Arbitrary<InputMessage> = inputArb.map((value) => ({
  ...value,
  seq: asSeq(value.seq),
  tick: asTick(value.tick)
}));

const entityArb = fc.record({
  id: fc.integer({ min: 1, max: 65_000 }),
  kind: fc.constantFrom<"ship" | "bullet">("ship", "bullet"),
  x: fc.float({ min: Math.fround(0), max: Math.fround(899), noNaN: true }),
  y: fc.float({ min: Math.fround(0), max: Math.fround(559), noNaN: true }),
  angle: fc.float({ min: Math.fround(-3.1), max: Math.fround(3.1), noNaN: true }),
  hp: fc.integer({ min: 0, max: 3 })
});

const snapshotEntityArb: fc.Arbitrary<SnapshotEntity> = entityArb.map((value) => ({
  ...value,
  id: asEntityId(value.id)
}));

describe("lab 7 property checks", () => {
  it("input binary round trip keeps every valid field", () => {
    fc.assert(
      fc.property(wireInputArb, (value) => {
        expect(decodeInput(encodeInput(value))).toEqual(value);
      })
    );
  });

  it("snapshot binary length follows the format", () => {
    fc.assert(
      fc.property(fc.array(snapshotEntityArb, { maxLength: 10 }), (entities) => {
        const encoded = encodeSnapshot({
          tick: 1,
          lastProcessedSeq: 2,
          selfId: 1,
          entities
        });
        expect(encoded.byteLength).toBe(11 + entities.length * 16);
      })
    );
  });

  it("broken buffers return a controlled error", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 40 }), (bytes) => {
        if (bytes.byteLength === 12 && bytes[0] === 1) return;
        expect(() => decodeInput(bytes)).toThrow(RangeError);
      })
    );
  });

  it("the simulation keeps ships inside the arena", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(-1, 0, 1), { minLength: 1, maxLength: 100 }),
        (turns) => {
          const world = createWorld(3);
          addShip(world, 1);
          for (const turn of turns)
            stepWorld(world, { 1: { thrust: 1, turn, fire: false } });
          const ship = world.ships[1];
          expect(ship).toBeDefined();
          expect(ship?.x).toBeGreaterThanOrEqual(0);
          expect(ship?.x).toBeLessThan(world.width);
          expect(ship?.y).toBeGreaterThanOrEqual(0);
          expect(ship?.y).toBeLessThan(world.height);
        }
      )
    );
  });

  it("message parsing accepts valid joins and rejects unknown input", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z]{1,12}$/), (name) => {
        expect(parseClientMessage({ type: "join", room: "arena", name }).ok).toBe(true);
        expect(parseClientMessage({ type: "join", room: 7, name }).ok).toBe(false);
      })
    );
  });

  it("the same input sequence gives the same snapshot", () => {
    fc.assert(
      fc.property(fc.array(wireInputArb, { maxLength: 20 }), (values) => {
        const left = createWorld(9);
        const right = createWorld(9);
        addShip(left, 1);
        addShip(right, 1);
        for (const value of values) {
          stepWorld(left, { 1: value });
          stepWorld(right, { 1: value });
        }
        expect(snapshot(left)).toEqual(snapshot(right));
      })
    );
  });
});

describe("small deterministic checks", () => {
  const cases = Array.from({ length: 40 }, (_, index) => index);
  for (const index of cases) {
    it(`keeps a fixed step deterministic (${index + 1})`, () => {
      const left = createWorld(index + 1);
      const right = createWorld(index + 1);
      addShip(left, 1);
      addShip(right, 1);
      for (let tick = 0; tick < 5; tick += 1) {
        const value = input(tick, tick, { thrust: tick % 2, turn: 0, fire: false });
        stepWorld(left, { 1: value });
        stepWorld(right, { 1: value });
      }
      expect(left).toEqual(right);
    });
  }
});

describe("object pool", () => {
  it("reuses released objects", () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ id: ++created }));
    const first = pool.acquire();
    pool.release(first);
    expect(pool.acquire()).toBe(first);
    expect(created).toBe(1);
  });

  it("tracks free objects", () => {
    const pool = new ObjectPool(() => ({}));
    const one = pool.acquire();
    const two = pool.acquire();
    pool.release(one);
    pool.release(two);
    expect(pool.size).toBe(2);
    pool.clear();
    expect(pool.size).toBe(0);
  });
});
