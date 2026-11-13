import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  LOG_DIR: z.string().default("logs"),
  MAX_PLAYERS: z.coerce.number().int().min(1).max(100).default(8),
  MAX_ROOMS: z.coerce.number().int().min(1).max(1000).default(20),
  MAX_CONNECTIONS_PER_IP: z.coerce.number().int().min(1).max(1000).default(20),
  ALLOWED_ORIGINS: z.string().default("http://127.0.0.1:5173,http://localhost:5173"),
  BUILD_SHA: z.string().default("dev"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type ServerConfig = {
  readonly host: string;
  readonly port: number;
  readonly logDir: string;
  readonly maxPlayers: number;
  readonly maxRooms: number;
  readonly maxConnectionsPerIp: number;
  readonly allowedOrigins: readonly string[];
  readonly buildSha: string;
  readonly logLevel: "debug" | "info" | "warn" | "error";
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const result = configSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `PORT/config: ${result.error.issues[0]?.message ?? "invalid config"}`
    );
  return {
    host: result.data.HOST,
    port: result.data.PORT,
    logDir: path.resolve(result.data.LOG_DIR),
    maxPlayers: result.data.MAX_PLAYERS,
    maxRooms: result.data.MAX_ROOMS,
    maxConnectionsPerIp: result.data.MAX_CONNECTIONS_PER_IP,
    allowedOrigins: result.data.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    buildSha: result.data.BUILD_SHA,
    logLevel: result.data.LOG_LEVEL
  };
}
