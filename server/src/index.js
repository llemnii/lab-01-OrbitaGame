import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { readConfig } from "./config.ts";
import { RoomManager } from "./rooms.ts";
import { attachSocket } from "./ws.js";
import { createMatchLog } from "./log/matchlog.js";
import { replayStream } from "./log/replay.js";
import { MatchManager } from "./match.js";
import { createLogger, createMetrics } from "./observability.js";

const config = readConfig();
const logger = createLogger(config.logLevel);
const metrics = createMetrics();
let accepting = true;
const connectionsByIp = new Map();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDir = path.join(root, "client", "dist");
const logs = new Map();
const matchManagers = new Map();
function getMatchManager(network) {
  const key = JSON.stringify(network);
  if (!matchManagers.has(key)) {
    const managerForNetwork = new MatchManager(network, (duration) => metrics.tick(duration));
    matchManagers.set(key, managerForNetwork);
  }
  return matchManagers.get(key);
}
const manager = new RoomManager({
  maxRooms: config.maxRooms,
  logFactory: (id) => {
    const log = createMatchLog(config.logDir, id);
    logs.set(id, log);
    return (event) => log.write(event);
  }
});

function ensureDefaultRooms() {
  manager.getOrCreate({ id: "quiet", name: "Тиха орбіта", limit: 4 });
  manager.getOrCreate({ id: "training", name: "Тренування", limit: 2 });
}

ensureDefaultRooms();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav"
};

async function bodyJson(request, limit = 16 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function staticFile(response, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = path.resolve(clientDir, relative);
  if (!target.startsWith(clientDir + path.sep)) return false;
  try {
    const info = await stat(target);
    if (!info.isFile()) return false;
    response.writeHead(200, {
      "content-type": mime[path.extname(target)] ?? "application/octet-stream",
      "cache-control": "no-cache"
    });
    createReadStream(target).pipe(response);
    return true;
  } catch {
    return false;
  }
}

async function handler(request, response) {
  const url = new URL(request.url, `http://${config.host}:${config.port}`);
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    return response.end(JSON.stringify({ ok: true, sha: config.buildSha }));
  }
  if (url.pathname === "/ready") {
    response.writeHead(accepting ? 200 : 503, { "content-type": "application/json" });
    return response.end(JSON.stringify({ ready: accepting, sha: config.buildSha }));
  }
  if (url.pathname === "/metrics") {
    response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    return response.end(metrics.prometheus({ players: [...wss.clients].length, rooms: manager.rooms.size }));
  }
  if (url.pathname === "/api/rooms" && request.method === "GET") {
    ensureDefaultRooms();
    response.writeHead(200, { "content-type": "application/json" });
    return response.end(JSON.stringify(manager.list()));
  }
  if (url.pathname === "/api/rooms" && request.method === "POST") {
    try {
      const data = await bodyJson(request);
      if (typeof data.id !== "string" || !data.id.trim())
        throw new Error("id is required");
      const room = manager.getOrCreate({
        id: data.id.trim().slice(0, 40),
        name: String(data.name ?? data.id).slice(0, 60),
        limit: Math.min(
          config.maxPlayers,
          Math.max(1, Number(data.limit) || config.maxPlayers)
        )
      });
      response.writeHead(201, { "content-type": "application/json" });
      return response.end(
        JSON.stringify({ id: room.id, name: room.name, players: 0, limit: room.limit })
      );
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      return response.end(JSON.stringify({ error: error.message }));
    }
  }
  if (url.pathname === "/api/slow") {
    const end = Date.now() + 300;
    while (Date.now() < end) {
      /* навмисно блокуємо цикл для експерименту */
    }
    return response.end("slow done");
  }
  if (url.pathname.startsWith("/api/replays/")) {
    const id = decodeURIComponent(url.pathname.slice("/api/replays/".length));
    const log = logs.get(id);
    if (!log) {
      response.writeHead(404);
      return response.end("replay not found");
    }
    response.writeHead(200, { "content-type": "application/x-ndjson" });
    for await (const line of replayStream(log.file))
      if (!response.write(line))
        await new Promise((resolve) => response.once("drain", resolve));
    return response.end();
  }
  if (await staticFile(response, url.pathname)) return;
  response.writeHead(404);
  response.end("not found");
}

const server = createServer((request, response) => {
  handler(request, response).catch((error) => {
    response.writeHead(500);
    response.end(error.message);
  });
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
wss.on("connection", (socket, request) => {
  const ip = request.socket.remoteAddress ?? "unknown";
  connectionsByIp.set(ip, (connectionsByIp.get(ip) ?? 0) + 1);
  socket.once("close", () => {
    const count = (connectionsByIp.get(ip) ?? 1) - 1;
    if (count <= 0) connectionsByIp.delete(ip); else connectionsByIp.set(ip, count);
  });
  const url = new URL(request.url, `http://${config.host}:${config.port}`);
  const query = Object.fromEntries(url.searchParams);
  const codec = query.codec === "json" ? "json" : "binary";
  const network = {
    delay: Math.max(0, Number(query.delay ?? process.env.NET_DELAY ?? 0)),
    jitter: Math.max(0, Number(query.jitter ?? process.env.NET_JITTER ?? 0)),
    drop: Math.min(1, Math.max(0, Number(query.drop ?? process.env.NET_DROP ?? 0)))
  };
  attachSocket(socket, manager, {
    maxPlayers: config.maxPlayers,
    matchManager: getMatchManager(network),
    codec,
    metrics,
    logger,
    accepting
  });
});
server.on("upgrade", (request, socket, head) => {
  if (!accepting) return socket.destroy();
  const url = new URL(request.url, `http://${config.host}:${config.port}`);
  if (url.pathname !== "/ws") return socket.destroy();
  const origin = request.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) return socket.destroy();
  const ip = request.socket.remoteAddress ?? "unknown";
  if ((connectionsByIp.get(ip) ?? 0) >= config.maxConnectionsPerIp) return socket.destroy();
  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit("connection", client, request);
  });
});

async function shutdown(signal) {
  if (!accepting) return;
  accepting = false;
  logger.info("server shutting down", { signal });
  for (const socket of wss.clients) {
    if (socket.readyState === 1) socket.send(JSON.stringify({ type: "shutdown" }));
  }
  for (const log of logs.values()) await log.close();
  for (const socket of wss.clients) socket.close(1001, "server shutdown");
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 9000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
server.listen(config.port, config.host, () =>
  logger.info("server listening", { host: config.host, port: config.port, sha: config.buildSha })
);
