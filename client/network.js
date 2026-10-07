import { encodeInput } from "../shared/src/codec.js";
import { addShip, createWorld, SIM_DT, stepWorld } from "../shared/src/sim.js";

export class NetworkGame {
  constructor(connection, width, height, onStats = () => {}) {
    this.connection = connection;
    this.state = createWorld(20261007, width, height);
    this.pending = [];
    this.snapshots = [];
    this.visual = new Map();
    this.seq = 0;
    this.lastSnapshotAt = performance.now();
    this.stats = { rtt: 0, age: 0, bytesIn: 0, bytesOut: 0, correction: 0 };
    this.onStats = onStats;
    connection.addEventListener("snapshot", (event) => this.#reconcile(event.detail));
    connection.addEventListener("message", (event) => {
      if (event.detail.type === "pong") {
        this.stats.rtt = performance.now() - event.detail.t;
        this.onStats(this.#currentStats());
      }
    });
    this.pingTimer = setInterval(
      () => connection.send({ type: "ping", t: performance.now() }),
      1000
    );
  }

  step(input) {
    const packet = { seq: ++this.seq, tick: this.state.tick, ...input };
    this.pending.push(packet);
    this.connection.sendBinary(encodeInput(packet));
    if (!this.state.ships[this.selfId]) addShip(this.state, this.selfId ?? 1, 0);
    stepWorld(this.state, { [this.selfId ?? 1]: packet }, SIM_DT);
    this.stats.bytesOut += 12;
    this.onStats(this.#currentStats());
  }

  #reconcile(serverSnapshot) {
    this.stats.bytesIn += 11 + serverSnapshot.entities.length * 16;
    this.lastSnapshotAt = performance.now();
    this.selfId = serverSnapshot.selfId;
    const before = this.state.ships[this.selfId];
    const next = createWorld(20261007, this.state.width, this.state.height);
    next.tick = serverSnapshot.tick;
    for (const entity of serverSnapshot.entities) {
      if (entity.kind === 1) next.ships[entity.id] = { ...entity, vx: 0, vy: 0 };
      else next.bullets.push({ ...entity, vx: 0, vy: 0 });
    }
    this.pending = this.pending.filter(
      (input) => input.seq > serverSnapshot.lastProcessedSeq
    );
    for (const input of this.pending) stepWorld(next, { [this.selfId]: input }, SIM_DT);
    const after = next.ships[this.selfId];
    this.stats.correction =
      before && after ? Math.hypot(before.x - after.x, before.y - after.y) : 0;
    this.state = next;
    this.snapshots.push(serverSnapshot);
    if (this.snapshots.length > 3) this.snapshots.shift();
    this.onStats(this.#currentStats());
  }

  renderEntities() {
    const current = this.snapshots.at(-1);
    const previous = this.snapshots.at(-2) ?? current;
    if (!current) return [];
    const entities = current.entities.map((entity) => {
      const old = previous.entities.find(
        (candidate) => candidate.id === entity.id && candidate.kind === entity.kind
      );
      const alpha = old ? 0.5 : 1;
      const targetX = old ? old.x + (entity.x - old.x) * alpha : entity.x;
      const targetY = old ? old.y + (entity.y - old.y) * alpha : entity.y;
      const visualKey = `${entity.kind}:${entity.id}`;
      const previousVisual = this.visual.get(visualKey) ?? { x: targetX, y: targetY };
      const visual = {
        x: previousVisual.x + (targetX - previousVisual.x) * 0.33,
        y: previousVisual.y + (targetY - previousVisual.y) * 0.33
      };
      this.visual.set(visualKey, visual);
      return {
        ...entity,
        x: visual.x,
        y: visual.y
      };
    });
    return entities;
  }

  #currentStats() {
    return {
      ...this.stats,
      age: Math.max(0, performance.now() - this.lastSnapshotAt),
      pending: this.pending.length
    };
  }
}
