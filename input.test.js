// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";
import { createInput } from "./input.js";

describe("createInput", () => {
  let input;

  afterEach(() => {
    if (input) {
      input.destroy();
      input = null;
    }
  });

  test("зберігає клавішу після keydown і видаляє її після keyup", () => {
    input = createInput();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "W" }));
    expect(input.isDown("w")).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "W" }));
    expect(input.isDown("w")).toBe(false);
  });

  test("припиняє слухати клавіатуру після destroy", () => {
    input = createInput();
    input.destroy();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(input.isDown("a")).toBe(false);
  });
});
