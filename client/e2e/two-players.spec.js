import { test, expect } from "@playwright/test";

test("two browser clients can open the game", async ({ browser }) => {
  const first = await browser.newPage();
  const second = await browser.newPage();
  await Promise.all([first.goto("/"), second.goto("/")]);
  await expect(first.locator("#rooms .room").first()).toBeVisible();
  await expect(second.locator("#rooms .room").first()).toBeVisible();
  await first.locator("#player-name").fill("Alice");
  await second.locator("#player-name").fill("Bob");
  await first.locator("#rooms .room").first().click();
  await second.locator("#rooms .room").first().click();
  await first.locator("#join").click();
  await second.locator("#join").click();
  await expect(first.locator("#game-canvas")).toBeVisible();
  await expect(second.locator("#game-canvas")).toBeVisible();
  await first.keyboard.down("ArrowUp");
  await first.keyboard.press("Space");
  await first.keyboard.up("ArrowUp");
  await first.locator("#chat-input").fill("Привіт з тесту");
  await first.locator("#chat-form").press("Enter");
  await expect(second.locator("#chat-log")).toContainText("Привіт з тесту");
  await first.close();
  await second.close();
});
