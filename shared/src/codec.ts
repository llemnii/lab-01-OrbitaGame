import {
  asEntityId,
  asSeq,
  asTick,
  type InputMessage,
  type SnapshotEntity
} from "./types.ts";

const VERSION = 1;
const INPUT_BYTES = 12;
const SNAPSHOT_HEADER_BYTES = 11;
const ENTITY_BYTES = 16;

export type WireSnapshot = {
  readonly tick: number;
  readonly lastProcessedSeq: number;
  readonly selfId: number;
  readonly entities: readonly SnapshotEntity[];
};

export function encodeInput(input: InputMessage): ArrayBuffer {
  const buffer = new ArrayBuffer(INPUT_BYTES);
  const view = new DataView(buffer);
  view.setUint8(0, VERSION);
  view.setUint32(1, Number(input.seq), true);
  view.setUint32(5, Number(input.tick), true);
  view.setInt8(9, Math.max(-1, Math.min(1, Math.round(input.thrust))));
  view.setInt8(10, Math.max(-1, Math.min(1, Math.round(input.turn))));
  view.setUint8(11, input.fire ? 1 : 0);
  return buffer;
}

export function decodeInput(buffer: ArrayBuffer | Uint8Array): InputMessage {
  if (buffer.byteLength !== INPUT_BYTES) throw new RangeError("invalid input length");
  const view =
    buffer instanceof Uint8Array
      ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new DataView(buffer);
  if (view.getUint8(0) !== VERSION) throw new RangeError("unsupported input version");
  const thrust = view.getInt8(9);
  const turn = view.getInt8(10);
  if (![-1, 0, 1].includes(thrust) || ![-1, 0, 1].includes(turn))
    throw new RangeError("invalid input range");
  return {
    seq: asSeq(view.getUint32(1, true)),
    tick: asTick(view.getUint32(5, true)),
    thrust,
    turn,
    fire: view.getUint8(11) === 1
  };
}

export function encodeSnapshot(snapshot: WireSnapshot): ArrayBuffer {
  const buffer = new ArrayBuffer(
    SNAPSHOT_HEADER_BYTES + snapshot.entities.length * ENTITY_BYTES
  );
  const view = new DataView(buffer);
  view.setUint8(0, VERSION);
  view.setUint32(1, snapshot.tick, true);
  view.setUint32(5, snapshot.lastProcessedSeq, true);
  view.setUint16(9, snapshot.selfId, true);
  snapshot.entities.forEach((entity, index) => {
    const offset = SNAPSHOT_HEADER_BYTES + index * ENTITY_BYTES;
    view.setUint8(offset, entity.kind === "ship" ? 1 : 2);
    view.setUint16(offset + 1, Number(entity.id), true);
    view.setFloat32(offset + 3, entity.x, true);
    view.setFloat32(offset + 7, entity.y, true);
    view.setInt16(offset + 11, Math.round(entity.angle * 1000), true);
    view.setUint8(offset + 13, Math.max(0, Math.min(255, entity.hp)));
  });
  return buffer;
}

export function decodeSnapshot(buffer: ArrayBuffer): WireSnapshot {
  if (buffer.byteLength < SNAPSHOT_HEADER_BYTES)
    throw new RangeError("snapshot is too short");
  if ((buffer.byteLength - SNAPSHOT_HEADER_BYTES) % ENTITY_BYTES !== 0)
    throw new RangeError("invalid snapshot length");
  const view = new DataView(buffer);
  if (view.getUint8(0) !== VERSION) throw new RangeError("unsupported snapshot version");
  const entities: SnapshotEntity[] = [];
  for (
    let offset = SNAPSHOT_HEADER_BYTES;
    offset < buffer.byteLength;
    offset += ENTITY_BYTES
  ) {
    const rawKind = view.getUint8(offset);
    if (rawKind !== 1 && rawKind !== 2) throw new RangeError("invalid entity kind");
    entities.push({
      kind: rawKind === 1 ? "ship" : "bullet",
      id: asEntityId(view.getUint16(offset + 1, true)),
      x: view.getFloat32(offset + 3, true),
      y: view.getFloat32(offset + 7, true),
      angle: view.getInt16(offset + 11, true) / 1000,
      hp: view.getUint8(offset + 13)
    });
  }
  return {
    tick: view.getUint32(1, true),
    lastProcessedSeq: view.getUint32(5, true),
    selfId: view.getUint16(9, true),
    entities
  };
}
