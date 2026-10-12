import { encodeInput, type WireSnapshot } from "../shared/src/codec.ts";
import {
  addShip,
  createWorld,
  input as makeInput,
  SIM_DT,
  stepWorld,
  type World
} from "../shared/src/sim.ts";
import type { EntityId, InputMessage, SnapshotEntity } from "../shared/src/types.ts";

type Connection = {
  addEventListener(type: string, listener: EventListener): void;
  send(message: { readonly type: string; readonly [key: string]: unknown }): void;
  sendBinary(packet: ArrayBuffer): void;
};

export type NetworkStats = {
  readonly rtt: number;
  readonly age: number;
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly correction: number;
  readonly pending: number;
};

export class NetworkGame {
  readonly connection: Connection;
  readonly state: World;
  readonly pending: InputMessage[] = [];
  readonly snapshots: WireSnapshot[] = [];
  readonly visual = new Map<string, { x: number; y: number }>();
  selfId: EntityId | undefined;
  #seq = 0;
  #lastSnapshotAt = performance.now();
  #stats = { rtt: 0, age: 0, bytesIn: 0, bytesOut: 0, correction: 0 };
  readonly #onStats: (stats: NetworkStats) => void;

  constructor(
    connection: Connection,
    width: number,
    height: number,
    onStats = (): void => {}
  ) {
    this.connection = connection;
    this.state = createWorld(20261007, width, height);
    this.#onStats = onStats;
    connection.addEventListener("snapshot", (event) =>
      this.#reconcile((event as CustomEvent<WireSnapshot>).detail)
    );
    connection.addEventListener("message", (event) => {
      const message = (event as CustomEvent<{ type: string; t?: unknown }>).detail;
      if (message.type === "pong" && typeof message.t === "number") {
        this.#stats.rtt = performance.now() - message.t;
        this.#onStats(this.#currentStats());
      }
    });
    setInterval(() => connection.send({ type: "ping", t: performance.now() }), 1000);
  }

  step(values: {
    readonly thrust: number;
    readonly turn: number;
    readonly fire: boolean;
  }): void {
    const packet = makeInput(++this.#seq, this.state.tick, values);
    this.pending.push(packet);
    this.connection.sendBinary(encodeInput(packet));
    const id = this.selfId ?? 1;
    if (!this.state.ships[id]) addShip(this.state, id, 0);
    stepWorld(this.state, { [id]: packet }, SIM_DT);
    this.#stats.bytesOut += 12;
    this.#onStats(this.#currentStats());
  }

  #reconcile(serverSnapshot: WireSnapshot): void {
    this.#stats.bytesIn += 11 + serverSnapshot.entities.length * 16;
    this.#lastSnapshotAt = performance.now();
    this.selfId = serverSnapshot.selfId as EntityId; // Decoder validates the numeric id before this boundary.
    const before = this.state.ships[this.selfId];
    const next = createWorld(20261007, this.state.width, this.state.height);
    next.tick = serverSnapshot.tick;
    for (const entity of serverSnapshot.entities) {
      if (entity.kind === "ship") next.ships[entity.id] = { ...entity, vx: 0, vy: 0 };
      else next.bullets.push({ ...entity, vx: 0, vy: 0, owner: entity.id });
    }
    const firstUnacked = this.pending.findIndex(
      (item) => Number(item.seq) > serverSnapshot.lastProcessedSeq
    );
    if (firstUnacked < 0) this.pending.length = 0;
    else if (firstUnacked > 0) this.pending.splice(0, firstUnacked);
    for (const pending of this.pending)
      stepWorld(next, { [this.selfId]: pending }, SIM_DT);
    const after = next.ships[this.selfId];
    this.#stats.correction =
      before && after ? Math.hypot(before.x - after.x, before.y - after.y) : 0;
    Object.assign(this.state, next);
    this.snapshots.push(serverSnapshot);
    if (this.snapshots.length > 3) this.snapshots.shift();
    this.#onStats(this.#currentStats());
  }

  renderEntities(): Array<SnapshotEntity & { x: number; y: number }> {
    const current = this.snapshots.at(-1);
    const previous = this.snapshots.at(-2) ?? current;
    if (!current) return [];
    return current.entities.map((entity) => {
      const old = previous?.entities.find(
        (candidate) => candidate.id === entity.id && candidate.kind === entity.kind
      );
      const alpha = old ? 0.5 : 1;
      const targetX = old ? old.x + (entity.x - old.x) * alpha : entity.x;
      const targetY = old ? old.y + (entity.y - old.y) * alpha : entity.y;
      const key = `${entity.kind}:${entity.id}`;
      const previousVisual = this.visual.get(key) ?? { x: targetX, y: targetY };
      const visual = {
        x: previousVisual.x + (targetX - previousVisual.x) * 0.33,
        y: previousVisual.y + (targetY - previousVisual.y) * 0.33
      };
      this.visual.set(key, visual);
      return { ...entity, x: visual.x, y: visual.y };
    });
  }

  #currentStats(): NetworkStats {
    return {
      ...this.#stats,
      age: Math.max(0, performance.now() - this.#lastSnapshotAt),
      pending: this.pending.length
    };
  }
}
