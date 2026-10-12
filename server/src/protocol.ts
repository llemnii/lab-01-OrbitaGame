import { z } from "zod";

export const MAX_MESSAGE_BYTES = 4096;
const text = z.string().trim().min(1).max(80);
const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), room: text, name: text }),
  z.object({ type: z.literal("chat"), text: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("ping"), t: z.number().finite() })
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ParseResult = { readonly value: ClientMessage } | { readonly error: string };

function asText(data: Buffer | ArrayBuffer | string): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return data.toString("utf8");
}

export function parseMessage(data: Buffer | ArrayBuffer | string): ParseResult {
  const raw = asText(data);
  if (Buffer.byteLength(raw, "utf8") > MAX_MESSAGE_BYTES)
    return { error: "message too large" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? `invalid json: ${error.message}` : "invalid json"
    };
  }
  const result = clientMessageSchema.safeParse(parsed);
  return result.success
    ? { value: result.data }
    : { error: result.error.issues[0]?.message ?? "invalid message" };
}

export function jsonMessage(type: string, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({ v: 0, type, ...payload });
}
