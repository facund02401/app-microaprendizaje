import { NextResponse } from "next/server";
import { AiError, CONCEPT_MODEL, aiConfigured, askText } from "@/lib/ai/claude";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Sos un colega especialista en teoría psicoanalítica que ayuda a un psicoanalista a estudiar textos densos. Te da un término o expresión que subrayó, el párrafo donde apareció y el libro y capítulo.
Respondé con una definición breve (máximo 60 palabras) según el uso de ESE autor en ESE contexto, con voseo rioplatense y tono de colega: nada de notas, puntajes ni tono evaluativo. Si aporta, sumá un ejemplo mínimo de uso. Usá el vocabulario del autor cuando exista. Respondé solo con la definición, sin encabezados ni comillas de apertura.`;

/** Tope simple de seguridad: 60 explicaciones por hora por usuario (por instancia del servidor). */
const LIMIT = 60;
const usage = new Map<string, number[]>();

function withinLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= LIMIT) {
    usage.set(userId, recent);
    return false;
  }
  usage.set(userId, [...recent, now]);
  return true;
}

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "La explicación con IA todavía no está configurada en el servidor." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const term = clip(body.term, 300);
  if (!term) return NextResponse.json({ error: "Falta el término" }, { status: 400 });

  if (!withinLimit(user.id)) {
    return NextResponse.json(
      { error: "Llegaste al tope de explicaciones por hora. Probá más tarde." },
      { status: 429 }
    );
  }

  const prompt = [
    `Término: ${term}`,
    `Libro: ${clip(body.book, 200) || "(sin dato)"}`,
    `Capítulo: ${clip(body.chapter, 200) || "(sin dato)"}`,
    `Párrafo donde apareció:\n${clip(body.paragraph, 3000) || "(sin dato)"}`,
  ].join("\n");

  try {
    const definition = await askText({
      model: CONCEPT_MODEL,
      system: SYSTEM,
      prompt,
      maxTokens: 400,
    });
    return NextResponse.json({ definition });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("No se pudo explicar ahora.", true);
    return NextResponse.json({ error: e.message }, { status: e.retryable ? 503 : 502 });
  }
}
