import { describe, expect, test, vi } from "vitest";
import { createLoop } from "./loop.js";

describe("createLoop", () => {
  test("робить кілька фіксованих кроків після затримки кадру", () => {
    let frameCallback;
    const requestFrame = vi.fn((callback) => {
      frameCallback = callback;
      return 1;
    });
    const update = vi.fn();
    const render = vi.fn();
    const loop = createLoop(update, render, { requestFrame });

    loop.start();
    frameCallback(0);
    frameCallback(100);

    expect(update.mock.calls.length).toBe(6);
    expect(update.mock.calls[0][0]).toBeCloseTo(1 / 60);
    expect(render).toHaveBeenCalledTimes(2);
    expect(render.mock.calls[1][1]).toBeCloseTo(100);
    expect(render.mock.calls[1][2]).toBe(6);
  });
});
