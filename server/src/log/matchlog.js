import { PassThrough, Transform } from "node:stream";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

class NdjsonTransform extends Transform {
  constructor() {
    super({ writableObjectMode: true });
  }
  _transform(event, encoding, callback) {
    callback(null, `${JSON.stringify({ t: Date.now(), ...event })}\n`);
  }
}

export function createMatchLog(logDir, roomId) {
  mkdirSync(logDir, { recursive: true });
  const source = new PassThrough({ objectMode: true });
  const file = path.join(logDir, `${roomId}-${Date.now()}.ndjson`);
  const done = pipeline(source, new NdjsonTransform(), createWriteStream(file)).catch(
    (error) => console.error("match log", error)
  );
  return {
    file,
    write(event) {
      return source.write(event);
    },
    close() {
      source.end();
      return done;
    }
  };
}
