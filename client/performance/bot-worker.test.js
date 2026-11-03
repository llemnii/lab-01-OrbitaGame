import { describe, expect, it } from "vitest";

describe("bot worker contract", () => {
  it("uses a browser worker entry point", async () => {
    const source = await import.meta.glob("./bot-worker.js", {
      query: "?raw",
      import: "default",
      eager: true
    });
    expect(Object.keys(source)).toContain("./bot-worker.js");
  });
});
