import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 10_000,
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev:client",
    cwd: "..",
    url: "http://localhost:5173",
    reuseExistingServer: !globalThis.process?.env.CI
  }
});
