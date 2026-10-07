export const VERSION = 1;
export const INPUT_BYTES = 12;
const SNAPSHOT_HEADER = 11;
const ENTITY_BYTES = 16;

export function encodeInput(input) {
  const buffer = new ArrayBuffer(INPUT_BYTES);
  const view = new DataView(buffer);
  view.setUint8(0, VERSION);
  view.setUint32(1, input.seq >>> 0, true);
  view.setInt8(5, Math.max(-1, Math.min(1, input.thrust || 0)) * 127);
  view.setInt8(6, Math.max(-1, Math.min(1, input.turn || 0)) * 127);
  view.setUint8(7, input.fire ? 1 : 0);
  view.setUint32(8, input.tick >>> 0, true);
  return buffer;
}

export function decodeInput(data) {
  const view = new DataView(toArrayBuffer(data));
  if (view.byteLength !== INPUT_BYTES || view.getUint8(0) !== VERSION)
    throw new Error("invalid input packet");
  return {
    seq: view.getUint32(1, true),
    thrust: view.getInt8(5) / 127,
    turn: view.getInt8(6) / 127,
    fire: view.getUint8(7) === 1,
    tick: view.getUint32(8, true)
  };
}

export function encodeSnapshot(snapshot) {
  const buffer = new ArrayBuffer(
    SNAPSHOT_HEADER + snapshot.entities.length * ENTITY_BYTES
  );
  const view = new DataView(buffer);
  view.setUint8(0, VERSION);
  view.setUint8(1, 2);
  view.setUint32(2, snapshot.tick >>> 0, true);
  view.setUint32(6, snapshot.lastProcessedSeq >>> 0, true);
  view.setUint16(10 - 2, snapshot.selfId >>> 0, true);
  view.setUint8(10, snapshot.entities.length);
  snapshot.entities.forEach((entity, index) => {
    const offset = SNAPSHOT_HEADER + index * ENTITY_BYTES;
    view.setUint16(offset, entity.id >>> 0, true);
    view.setUint8(offset + 2, entity.kind);
    view.setUint8(offset + 3, entity.hp ?? 1);
    view.setFloat32(offset + 4, entity.x, true);
    view.setFloat32(offset + 8, entity.y, true);
    view.setInt16(offset + 12, Math.round(entity.angle * 1000), true);
    view.setUint16(offset + 14, 0, true);
  });
  return buffer;
}

export function decodeSnapshot(data) {
  const view = new DataView(toArrayBuffer(data));
  if (
    view.byteLength < SNAPSHOT_HEADER ||
    view.getUint8(0) !== VERSION ||
    view.getUint8(1) !== 2
  )
    throw new Error("invalid snapshot packet");
  const count = view.getUint8(10);
  if (view.byteLength !== SNAPSHOT_HEADER + count * ENTITY_BYTES)
    throw new Error("invalid snapshot size");
  const entities = [];
  for (let index = 0; index < count; index += 1) {
    const offset = SNAPSHOT_HEADER + index * ENTITY_BYTES;
    entities.push({
      id: view.getUint16(offset, true),
      kind: view.getUint8(offset + 2),
      hp: view.getUint8(offset + 3),
      x: view.getFloat32(offset + 4, true),
      y: view.getFloat32(offset + 8, true),
      angle: view.getInt16(offset + 12, true) / 1000
    });
  }
  return {
    tick: view.getUint32(2, true),
    lastProcessedSeq: view.getUint32(6, true),
    selfId: view.getUint16(8, true),
    entities
  };
}

function toArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data))
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  throw new TypeError("packet must be an ArrayBuffer or view");
}
