import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export function replayStream(file) {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  return (async function* () {
    for await (const line of lines) if (line) yield `${line}\n`;
  })();
}
