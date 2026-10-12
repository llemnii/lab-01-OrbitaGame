import { z } from "zod";

const text = z.string().trim().min(1).max(80);
const turn = z.number().int().min(-1).max(1);

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), room: text, name: text }),
  z.object({ type: z.literal("chat"), text: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("ping"), t: z.number().finite() })
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type ParseResult =
  | { readonly ok: true; readonly value: ClientMessage }
  | { readonly ok: false; readonly error: string };

export function parseClientMessage(data: unknown): ParseResult {
  const result = ClientMessageSchema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "invalid message" };
}

export function parseInputShape(
  data: unknown
): { thrust: number; turn: z.infer<typeof turn>; fire: boolean } | null {
  const result = z
    .object({ thrust: z.number(), turn, fire: z.boolean() })
    .safeParse(data);
  return result.success ? result.data : null;
}

export function assertNever(value: never): never {
  return value;
}
