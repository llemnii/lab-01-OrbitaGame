import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

export function createMetrics() {
  const startedAt = Date.now();
  const counters = { messages: 0, bytes: 0 };
  let lastTickMs = 0;
  let lastUtilization = performance.eventLoopUtilization();

  return {
    message(bytes = 0) {
      counters.messages += 1;
      counters.bytes += bytes;
    },
    tick(durationMs) {
      lastTickMs = durationMs;
    },
    snapshot({ players = 0, rooms = 0 } = {}) {
      const utilization = performance.eventLoopUtilization(lastUtilization);
      lastUtilization = performance.eventLoopUtilization();
      const seconds = Math.max(1, (Date.now() - startedAt) / 1000);
      const memory = process.memoryUsage();
      return {
        players,
        rooms,
        messagesPerSecond: Math.round(counters.messages / seconds),
        bytesPerSecond: Math.round(counters.bytes / seconds),
        tickMs: Number(lastTickMs.toFixed(3)),
        eventLoopUtilization: Number(utilization.utilization.toFixed(4)),
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed
      };
    },
    prometheus({ players = 0, rooms = 0 } = {}) {
      const data = this.snapshot({ players, rooms });
      return Object.entries(data)
        .map(([key, value]) => `orbita_${key} ${value}`)
        .join("\n") + "\n";
    }
  };
}

export function createLogger(level = "info") {
  try {
    const pino = createRequire(import.meta.url)("pino");
    const log = pino({ level });
    return { debug: log.debug.bind(log), info: log.info.bind(log), warn: log.warn.bind(log), error: log.error.bind(log) };
  } catch {
    // Local tests may run before dependencies are installed; keep JSON logs useful there too.
  }
  const order = { debug: 10, info: 20, warn: 30, error: 40 };
  const write = (severity, message, fields = {}) => {
    if (order[severity] < order[level]) return;
    process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), level: severity, msg: message, ...fields })}\n`);
  };
  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields)
  };
}
