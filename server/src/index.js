import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { readConfig } from "./config.js";
import { RoomManager } from "./rooms.js";
import { attachSocket } from "./ws.js";
import { createMatchLog } from "./log/matchlog.js";
import { replayStream } from "./log/replay.js";
import { MatchManager } from "./match.js";

const config = readConfig();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDir = path.join(root, "client", "dist");
const logs = new Map();
const matchManagers = new Map();
function getMatchManager(network) {
  const key = JSON.stringify(network);
  if (!matchManagers.has(key)) matchManagers.set(key, new MatchManager(network));
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

manager.getOrCreate({ id: "quiet", name: "Тиха орбіта", limit: 4 });
manager.getOrCreate({ id: "training", name: "Тренування", limit: 2 });

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
  if (url.pathname === "/health") return response.end(JSON.stringify({ ok: true }));
  if (url.pathname === "/api/rooms" && request.method === "GET") {
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
    codec
  });
});
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${config.host}:${config.port}`);
  if (url.pathname !== "/ws") return socket.destroy();
  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit("connection", client, request);
  });
});

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  for (const log of logs.values()) await log.close();
  for (const socket of wss.clients) socket.close(1001, "server shutdown");
  wss.close();
  server.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
server.listen(config.port, config.host, () =>
  console.log(`server listening on http://${config.host}:${config.port}`)
);
