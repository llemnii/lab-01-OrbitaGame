import { test, expect } from "@playwright/test";

test("two browser clients can open the game", async ({ browser }) => {
  const first = await browser.newPage();
  const second = await browser.newPage();
  await Promise.all([first.goto("/"), second.goto("/")]);
  await expect(first.locator("#game-canvas, #loading-canvas").first()).toBeVisible();
  await expect(second.locator("#game-canvas, #loading-canvas").first()).toBeVisible();
  await first.keyboard.press("Space");
  await second.keyboard.press("ArrowUp");
  await expect(first.locator("body")).toContainText(/Керування|FPS|кадр/i);
  await expect(second.locator("body")).toContainText(/Керування|FPS|кадр/i);
  await first.close();
  await second.close();
});
