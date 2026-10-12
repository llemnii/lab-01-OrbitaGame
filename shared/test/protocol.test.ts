import { describe, expect, it } from "vitest";
import { decodeInput } from "../src/codec.ts";
import { parseClientMessage } from "../src/protocol.ts";

describe("typed protocol boundaries", () => {
  it("narrows an unknown JSON value without throwing", () => {
    expect(parseClientMessage({ type: "join", room: "training", name: "Slavi" })).toEqual(
      {
        ok: true,
        value: { type: "join", room: "training", name: "Slavi" }
      }
    );
    expect(parseClientMessage({ type: "join", room: 42, name: "Slavi" }).ok).toBe(false);
  });

  it("rejects malformed binary before reading fields", () => {
    expect(() => decodeInput(new ArrayBuffer(2))).toThrow(/length/);
  });
});
