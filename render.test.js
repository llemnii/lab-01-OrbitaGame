// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { resizeCanvas } from "./render.js";

describe("resizeCanvas", () => {
  test("встановлює внутрішній розмір Canvas з урахуванням devicePixelRatio", () => {
    const context = {
      setTransform: vi.fn()
    };
    const canvas = {
      width: 0,
      height: 0,
      getBoundingClientRect() {
        return { width: 300, height: 200 };
      },
      getContext() {
        return context;
      }
    };
    window.devicePixelRatio = 2;

    const size = resizeCanvas(canvas);

    expect(size).toEqual({ width: 300, height: 200 });
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });
});
