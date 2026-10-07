export const MAX_MESSAGE_BYTES = 4096;
const types = new Set(["join", "chat", "leave", "ping"]);

export function parseMessage(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buffer.length > MAX_MESSAGE_BYTES) return { error: "message too large" };
  let message;
  try {
    message = JSON.parse(buffer.toString("utf8"));
  } catch {
    return { error: "invalid json" };
  }
  if (!message || typeof message !== "object" || !types.has(message.type))
    return { error: "unknown type" };
  if (message.type === "join" && (!isText(message.room) || !isText(message.name)))
    return { error: "invalid join" };
  if (message.type === "chat" && (!isText(message.text) || message.text.length > 500))
    return { error: "invalid chat" };
  if (message.type === "ping" && typeof message.t !== "number")
    return { error: "invalid ping" };
  return { value: message };
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 80;
}

export function jsonMessage(type, payload = {}) {
  return JSON.stringify({ v: 0, type, ...payload });
}
