import { EventEmitter } from "node:events";

export type Player = { readonly id: string; readonly name: string };
type RoomEvent =
  | { readonly type: "join"; readonly player: Player }
  | { readonly type: "leave"; readonly player: Player }
  | { readonly type: "chat"; readonly player: string; readonly text: string }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly error: Error };

type RoomEvents = {
  join: Player;
  leave: Player;
  chat: { readonly player: string; readonly text: string };
  empty: undefined;
  error: Error;
  event: RoomEvent;
};

export class Room extends EventEmitter {
  readonly players = new Map<string, Player>();
  readonly id: string;
  readonly name: string;
  readonly limit: number;
  readonly log: (event: RoomEvent) => void;
  constructor(
    id: string,
    name: string,
    limit = 8,
    log: (event: RoomEvent) => void = () => {}
  ) {
    super();
    this.id = id;
    this.name = name;
    this.limit = limit;
    this.log = log;
    this.on("error", (error) => log({ type: "error", error }));
    this.on("event", log);
  }

  override on<K extends keyof RoomEvents>(
    event: K,
    listener: (payload: RoomEvents[K]) => void
  ): this {
    return super.on(event, listener) as this; // Node's EventEmitter API is untyped at runtime.
  }

  emit<K extends keyof RoomEvents>(event: K, payload: RoomEvents[K]): boolean {
    return super.emit(event, payload);
  }

  join(player: Player): void {
    if (this.players.size >= this.limit) throw new Error("room is full");
    this.players.set(player.id, player);
    this.emit("join", player);
    this.emit("event", { type: "join", player });
  }

  leave(player: Player): void {
    if (!this.players.delete(player.id)) return;
    this.emit("leave", player);
    this.emit("event", { type: "leave", player });
    if (this.players.size === 0) this.emit("empty", undefined);
  }

  chat(player: Player, text: string): void {
    const message = { player: player.name, text };
    this.emit("chat", message);
    this.emit("event", { type: "chat", ...message });
  }

  roster(): Player[] {
    return [...this.players.values()].map(({ id, name }) => ({ id, name }));
  }
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  readonly options: {
    readonly maxRooms?: number;
    readonly logFactory?: (id: string) => (event: RoomEvent) => void;
  };
  constructor(
    options: {
      readonly maxRooms?: number;
      readonly logFactory?: (id: string) => (event: RoomEvent) => void;
    } = {}
  ) {
    this.options = options;
  }

  list(): Array<{ id: string; name: string; players: number; limit: number }> {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.name,
      players: room.players.size,
      limit: room.limit
    }));
  }

  getOrCreate({
    id,
    name = id,
    limit = 8
  }: {
    id: string;
    name?: string;
    limit?: number;
  }): Room {
    const current = this.rooms.get(id);
    if (current) return current;
    if (this.rooms.size >= (this.options.maxRooms ?? 20))
      throw new Error("too many rooms");
    const room = new Room(id, name, limit, this.options.logFactory?.(id));
    room.on("empty", () => {
      this.rooms.delete(id);
      room.emit("event", { type: "empty" });
    });
    this.rooms.set(id, room);
    return room;
  }
}
