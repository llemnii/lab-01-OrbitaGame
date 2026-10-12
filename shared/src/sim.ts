import {
  asEntityId,
  asSeq,
  asTick,
  type EntityId,
  type InputMessage,
  type SnapshotEntity
} from "./types.ts";

export const SIM_HZ = 30;
export const SIM_DT = 1 / SIM_HZ;

export type ShipState = {
  id: EntityId;
  kind: "ship";
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
};

export type BulletState = {
  id: EntityId;
  kind: "bullet";
  owner: EntityId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
};

export type World = {
  seed: number;
  width: number;
  height: number;
  tick: number;
  ships: Record<number, ShipState>;
  bullets: BulletState[];
  nextBullet: number;
};

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed = 1, width = 900, height = 560): World {
  return { seed, width, height, tick: 0, ships: {}, bullets: [], nextBullet: 1 };
}

export function addShip(world: World, id: number, index = 0): ShipState {
  const ship: ShipState = {
    id: asEntityId(id),
    kind: "ship",
    x: world.width * (index === 0 ? 0.25 : 0.75),
    y: world.height * 0.5,
    vx: 0,
    vy: 0,
    angle: index ? Math.PI : 0,
    hp: 3
  };
  world.ships[id] = ship;
  return ship;
}

export function applyInput(
  ship: ShipState,
  input: Partial<InputMessage>,
  dt: number,
  world: World
): void {
  const thrust = Math.max(-1, Math.min(1, Number(input.thrust) || 0));
  const turn = Math.max(-1, Math.min(1, Number(input.turn) || 0));
  ship.angle += turn * 3.2 * dt;
  ship.vx += Math.cos(ship.angle) * 180 * thrust * dt;
  ship.vy += Math.sin(ship.angle) * 180 * thrust * dt;
  const drag = Math.pow(0.98, dt * 60);
  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > 260) {
    ship.vx = (ship.vx / speed) * 260;
    ship.vy = (ship.vy / speed) * 260;
  }
  ship.x = (ship.x + ship.vx * dt + world.width) % world.width;
  ship.y = (ship.y + ship.vy * dt + world.height) % world.height;
  if (input.fire && world.tick % 7 === 0) {
    world.bullets.push({
      id: asEntityId(world.nextBullet++),
      kind: "bullet",
      owner: ship.id,
      x: ship.x + Math.cos(ship.angle) * 24,
      y: ship.y + Math.sin(ship.angle) * 24,
      vx: ship.vx + Math.cos(ship.angle) * 420,
      vy: ship.vy + Math.sin(ship.angle) * 420,
      angle: ship.angle,
      hp: 1
    });
  }
}

export function stepWorld(
  world: World,
  inputs: Record<number, Partial<InputMessage>> = {},
  dt = SIM_DT
): World {
  for (const id of Object.keys(world.ships).sort((a, b) => Number(a) - Number(b))) {
    const ship = world.ships[Number(id)];
    if (ship) applyInput(ship, inputs[Number(id)] ?? {}, dt, world);
  }
  for (const bullet of world.bullets) {
    bullet.x = (bullet.x + bullet.vx * dt + world.width) % world.width;
    bullet.y = (bullet.y + bullet.vy * dt + world.height) % world.height;
    bullet.hp -= dt;
  }
  world.bullets = world.bullets.filter((bullet) => bullet.hp > 0);
  world.tick += 1;
  return world;
}

export function snapshot(
  world: World,
  lastProcessedSeq = 0,
  selfId = 0
): {
  readonly tick: number;
  readonly lastProcessedSeq: number;
  readonly selfId: number;
  readonly entities: readonly SnapshotEntity[];
} {
  return {
    tick: world.tick,
    lastProcessedSeq,
    selfId,
    entities: [...Object.values(world.ships), ...world.bullets].map((entity) => ({
      id: entity.id,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
      angle: entity.angle,
      hp: entity.hp
    }))
  };
}

export function input(
  seq: number,
  tick: number,
  values: Omit<InputMessage, "seq" | "tick">
): InputMessage {
  return { ...values, seq: asSeq(seq), tick: asTick(tick) };
}
