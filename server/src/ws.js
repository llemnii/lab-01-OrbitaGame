import { randomUUID } from "node:crypto";
import { jsonMessage, parseMessage } from "./protocol.js";

const CLOSE_BAD_MESSAGE = 1008;

export function attachSocket(socket, manager, { maxPlayers = 8 } = {}) {
  const player = { id: randomUUID(), name: "" };
  let room = null;
  let joined = false;
  let joinTimer = setTimeout(() => socket.close(1008, "join timeout"), 5000);
  let pong = true;
  let missedPongs = 0;
  let count = 0;
  let windowStart = Date.now();

  const send = (message, critical = true) => {
    if (socket.readyState !== 1) return;
    if (socket.bufferedAmount > 64 * 1024 && !critical) return;
    socket.send(message);
  };
  const sendRoster = () =>
    room && send(jsonMessage("roster", { players: room.roster() }));
  const onError = (error) => {
    if (socket.readyState === 1) socket.close(1011, error.message);
  };
  socket.on("error", onError);
  socket.on("pong", () => {
    pong = true;
    missedPongs = 0;
  });
  const heartbeat = setInterval(() => {
    if (!pong) missedPongs += 1;
    if (missedPongs >= 2) return socket.terminate();
    pong = false;
    socket.ping();
  }, 15000);

  socket.on("message", (raw) => {
    if (Date.now() - windowStart >= 1000) {
      windowStart = Date.now();
      count = 0;
    }
    if (++count > 12) return socket.close(CLOSE_BAD_MESSAGE, "rate limit");
    const parsed = parseMessage(raw);
    if (parsed.error) return socket.close(CLOSE_BAD_MESSAGE, parsed.error);
    const message = parsed.value;
    try {
      if (message.type === "join") {
        if (joined) return socket.close(CLOSE_BAD_MESSAGE, "already joined");
        const name = message.name.trim().slice(0, 32);
        room = manager.getOrCreate({
          id: message.room,
          name: message.room,
          limit: maxPlayers
        });
        player.name = name;
        room.join(player);
        joined = true;
        clearTimeout(joinTimer);
        room.on("join", sendRoster);
        room.on("leave", sendRoster);
        room.on("chat", (chat) => send(jsonMessage("chat", chat), false));
        sendRoster();
      } else if (!joined) socket.close(CLOSE_BAD_MESSAGE, "join first");
      else if (message.type === "chat") room.chat(player, message.text.trim());
      else if (message.type === "leave") socket.close(1000, "bye");
    } catch (error) {
      onError(error);
    }
  });

  socket.on("close", () => {
    clearTimeout(joinTimer);
    clearInterval(heartbeat);
    if (room) room.leave(player);
  });
}
