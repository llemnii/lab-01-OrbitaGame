import { describe, expect, it, vi } from "vitest";
import { fetchJson, loadAll } from "./loaders.js";

describe("async loaders", () => {
  it("throws on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchJson("/missing")).rejects.toMatchObject({ status: 404 });
    vi.unstubAllGlobals();
  });

  it("reports each successful item", async () => {
    const progress = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    );
    await loadAll(
      { rooms: { type: "json", url: "/rooms" } },
      { onProgress: (event) => progress.push(event) }
    );
    expect(progress).toHaveLength(1);
    expect(progress[0].status).toBe("loaded");
    vi.unstubAllGlobals();
  });
});
