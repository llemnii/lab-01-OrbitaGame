import { describe, expect, it, vi } from "vitest";
import { Lobby } from "./lobby.js";

describe("Lobby", () => {
  it("emits rooms after a successful refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "one" }] })
    );
    const lobby = new Lobby();
    const listener = vi.fn();
    lobby.addEventListener("rooms", listener);
    await lobby.refresh();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail[0].id).toBe("one");
    lobby.stop();
    vi.unstubAllGlobals();
  });
});
