import test from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../src/config.js";

test("config validates the port and resolves log directory", () => {
  const config = readConfig({ PORT: "9000", HOST: "localhost", LOG_DIR: "tmp-logs" });
  assert.equal(config.port, 9000);
  assert.match(config.logDir, /tmp-logs$/);
});

test("config rejects an invalid port", () => {
  assert.throws(() => readConfig({ PORT: "99999" }), /PORT/);
});
