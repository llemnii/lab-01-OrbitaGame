import {
  addShip,
  createWorld,
  SIM_DT,
  snapshot,
  stepWorld
} from "../../shared/src/sim.js";
import { encodeSnapshot } from "../../shared/src/codec.js";

export class Match {
  constructor({ roomId, width = 900, height = 560, network = {} }) {
    this.roomId = roomId;
    this.world = createWorld(20261007, width, height);
    this.clients = new Map();
    this.nextId = 1;
    this.nextTickAt = performance.now() + SIM_DT * 1000;
    this.network = network;
    this.running = false;
  }

  add(player, socket, codec = "binary") {
    const id = this.nextId++;
    addShip(this.world, id, id - 1);
    this.clients.set(player.id, { player, socket, id, codec, input: {}, seq: 0 });
    this.start();
    return id;
  }

  remove(playerId) {
    const client = this.clients.get(playerId);
    if (!client) return;
    delete this.world.ships[client.id];
    this.clients.delete(playerId);
    if (!this.clients.size) this.running = false;
  }

  setInput(playerId, input) {
    const client = this.clients.get(playerId);
    if (!client) return;
    if (input.seq <= client.seq) return;
    client.seq = input.seq;
    client.input = input;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.schedule();
  }

  schedule() {
    if (!this.running) return;
    const delay = Math.max(0, this.nextTickAt - performance.now());
    setTimeout(() => this.tick(), delay);
  }

  tick() {
    if (!this.running) return;
    const inputs = {};
    for (const client of this.clients.values()) inputs[client.id] = client.input;
    stepWorld(this.world, inputs, SIM_DT);
    for (const client of this.clients.values()) {
      const data = snapshot(this.world, client.seq, client.id);
      const packet =
        client.codec === "json"
          ? JSON.stringify({ v: 1, type: "snapshot", ...data })
          : encodeSnapshot(data);
      this.send(client.socket, packet);
    }
    this.nextTickAt += SIM_DT * 1000;
    if (this.nextTickAt < performance.now() - 1000)
      this.nextTickAt = performance.now() + SIM_DT * 1000;
    this.schedule();
  }

  send(socket, packet) {
    if (socket.readyState !== 1 || socket.bufferedAmount > 64 * 1024) return;
    if (this.network.drop && Math.random() < this.network.drop) return;
    const jitter = this.network.jitter
      ? (Math.random() * 2 - 1) * this.network.jitter
      : 0;
    const delay = Math.max(0, (this.network.delay ?? 0) + jitter);
    if (!delay) return socket.send(packet);
    setTimeout(() => {
      if (socket.readyState === 1 && socket.bufferedAmount <= 64 * 1024)
        socket.send(packet);
    }, delay);
  }
}

export class MatchManager {
  constructor(network = {}) {
    this.network = network;
    this.matches = new Map();
  }

  get(roomId) {
    if (!this.matches.has(roomId))
      this.matches.set(roomId, new Match({ roomId, network: this.network }));
    return this.matches.get(roomId);
  }

  remove(roomId, playerId) {
    const match = this.matches.get(roomId);
    if (!match) return;
    match.remove(playerId);
    if (!match.clients.size) this.matches.delete(roomId);
  }
}
