import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../src/rooms.js";

test("room emits join, chat and removes a player on leave", () => {
  const events = [];
  const room = new Room("one", "One", 2);
  room.on("join", () => events.push("join"));
  room.on("chat", () => events.push("chat"));
  room.on("leave", () => events.push("leave"));
  const player = { id: "p1", name: "Slavi" };
  room.join(player);
  room.chat(player, "hi");
  room.leave(player);
  assert.deepEqual(events, ["join", "chat", "leave"]);
  assert.equal(room.players.size, 0);
});
