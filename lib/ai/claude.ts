import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** Modelo para procesar textos. Cambiable con la variable CLAUDE_MODEL. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5";

/** Modelos con reintento automático en otro modelo si el primero se niega. */
const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5-1"]);

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Error con mensaje apto para mostrar al lector y si conviene reintentar solo. */
export class AiError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public retryAfterSeconds = 30
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient() {
  if (!aiConfigured()) {
    throw new AiError(
      "Falta configurar la clave de Anthropic (ANTHROPIC_API_KEY). Ver docs/09.",
      false
    );
  }
  client ??= new Anthropic({ timeout: 240_000, maxRetries: 1 });
  return client;
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiError("La clave de Anthropic no es válida o fue revocada.", false);
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new AiError("La cuenta de Anthropic no tiene permiso para este modelo.", false);
  }
  if (err instanceof Anthropic.RateLimitError) {
    const retry = Number(err.headers?.get?.("retry-after")) || 60;
    return new AiError("Claude pidió una pausa breve (límite de uso por minuto).", true, retry);
  }
  if (err instanceof Anthropic.BadRequestError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("credit") || msg.includes("billing")) {
      return new AiError("La cuenta de Anthropic no tiene saldo. Cargá crédito y reintentá.", false);
    }
    return new AiError("Claude rechazó el pedido: " + err.message, false);
  }
  if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) {
    return new AiError("Claude no respondió a tiempo. Se reintenta solo.", true, 20);
  }
  if (err instanceof Anthropic.APIError) {
    // 529 = servidores saturados: pasajero.
    return new AiError(`Claude devolvió un error (${err.status}). Se reintenta solo.`, true, 30);
  }
  return new AiError(err instanceof Error ? err.message : "Error desconocido de IA.", false);
}

interface StructuredRequest<T extends z.ZodType> {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  maxTokens: number;
  effort: "low" | "medium" | "high";
}

/** Pide a Claude una respuesta JSON validada contra un esquema. */
export async function askStructured<T extends z.ZodType>({
  schema,
  system,
  content,
  maxTokens,
  effort,
}: StructuredRequest<T>): Promise<z.infer<T>> {
  try {
    const withFallback = FALLBACK_MODELS.has(CLAUDE_MODEL);
    const stream = getClient().beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
      thinking: { type: "adaptive" },
      output_config: { effort, format: betaZodOutputFormat(schema) },
      ...(withFallback
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new AiError(
        "Claude no quiso procesar este fragmento. Probá reintentar; si persiste, avisá.",
        false
      );
    }
    if (message.stop_reason === "max_tokens") {
      throw new AiError("La respuesta de Claude quedó cortada. Se reintenta solo.", true, 5);
    }

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new AiError("Claude devolvió un formato inesperado. Se reintenta solo.", true, 5);
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new AiError("Claude devolvió un formato inesperado. Se reintenta solo.", true, 5);
    }
    throw toAiError(err);
  }
}

/** Modelo barato y rápido para explicar términos sueltos (docs/04 §4.2). */
export const CONCEPT_MODEL =
  process.env.CLAUDE_CONCEPT_MODEL?.trim() || "claude-haiku-4-5-20251001";

/** Pide a Claude una respuesta breve en texto plano. */
export async function askText({
  model,
  system,
  prompt,
  maxTokens,
}: {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<string> {
  try {
    const message = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (message.stop_reason === "refusal") {
      throw new AiError("Claude no quiso explicar este fragmento.", false);
    }
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!text) throw new AiError("Claude devolvió una respuesta vacía. Reintentá.", true, 5);
    return text;
  } catch (err) {
    throw toAiError(err);
  }
}
