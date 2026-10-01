import { EventEmitter } from "node:events";

export class Room extends EventEmitter {
  constructor(id, name, limit = 8, log = () => {}) {
    super();
    this.id = id;
    this.name = name;
    this.limit = limit;
    this.players = new Map();
    this.log = log;
    this.on("error", (error) => log({ type: "error", message: error.message }));
    this.on("event", log);
  }

  join(player) {
    if (this.players.size >= this.limit) throw new Error("room is full");
    this.players.set(player.id, player);
    this.emit("join", player);
    this.emit("event", { type: "join", player: player.name });
  }

  leave(player) {
    if (!this.players.delete(player.id)) return;
    this.emit("leave", player);
    this.emit("event", { type: "leave", player: player.name });
    if (this.players.size === 0) this.emit("empty");
  }

  chat(player, text) {
    const message = { player: player.name, text };
    this.emit("chat", message);
    this.emit("event", { type: "chat", ...message });
  }

  roster() {
    return [...this.players.values()].map(({ id, name }) => ({ id, name }));
  }
}

export class RoomManager {
  constructor({ maxRooms = 20, logFactory = () => () => {} } = {}) {
    this.maxRooms = maxRooms;
    this.rooms = new Map();
    this.logFactory = logFactory;
  }

  list() {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.name,
      players: room.players.size,
      limit: room.limit
    }));
  }

  getOrCreate({ id, name = id, limit = 8 }) {
    const current = this.rooms.get(id);
    if (current) return current;
    if (this.rooms.size >= this.maxRooms) throw new Error("too many rooms");
    const room = new Room(id, name, limit, this.logFactory(id));
    room.once("empty", () => {
      this.rooms.delete(id);
      room.emit("event", { type: "empty" });
    });
    this.rooms.set(id, room);
    return room;
  }
}
