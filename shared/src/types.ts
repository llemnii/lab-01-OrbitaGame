export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type EntityId = Brand<number, "EntityId">;
export type Tick = Brand<number, "Tick">;
export type Seq = Brand<number, "Seq">;

export function asEntityId(value: number): EntityId {
  if (!Number.isInteger(value) || value < 0) throw new RangeError("invalid entity id");
  return value as EntityId; // Runtime representation stays a number on the wire.
}

export function asTick(value: number): Tick {
  if (!Number.isInteger(value) || value < 0) throw new RangeError("invalid tick");
  return value as Tick; // The brand exists only during type checking.
}

export function asSeq(value: number): Seq {
  if (!Number.isInteger(value) || value < 0) throw new RangeError("invalid sequence");
  return value as Seq; // The protocol still stores seq as an unsigned integer.
}

export type EntityKind = "ship" | "bullet";

export type ShipSnapshot = {
  readonly kind: "ship";
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly hp: number;
};

export type BulletSnapshot = {
  readonly kind: "bullet";
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly hp: number;
};

export type SnapshotEntity = ShipSnapshot | BulletSnapshot;

export type InputMessage = {
  readonly seq: Seq;
  readonly tick: Tick;
  readonly thrust: number;
  readonly turn: number;
  readonly fire: boolean;
};
