import path from "node:path";

function numberFromEnv(env, name, fallback, min, max) {
  const value = env[name] ?? String(fallback);
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${name} має бути цілим числом від ${min} до ${max}`);
  }
  return number;
}

export function readConfig(env = process.env) {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT має бути від 1 до 65535");
  const host = env.HOST ?? "127.0.0.1";
  const logDir = path.resolve(env.LOG_DIR ?? "logs");
  return {
    host,
    port,
    logDir,
    maxPlayers: numberFromEnv(env, "MAX_PLAYERS", 8, 1, 100),
    maxRooms: numberFromEnv(env, "MAX_ROOMS", 20, 1, 1000)
  };
}
