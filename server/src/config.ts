import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  LOG_DIR: z.string().default("logs"),
  MAX_PLAYERS: z.coerce.number().int().min(1).max(100).default(8),
  MAX_ROOMS: z.coerce.number().int().min(1).max(1000).default(20)
});

export type ServerConfig = {
  readonly host: string;
  readonly port: number;
  readonly logDir: string;
  readonly maxPlayers: number;
  readonly maxRooms: number;
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
    maxRooms: result.data.MAX_ROOMS
  };
}
