import { NextResponse } from "next/server";
import { AiError, CONCEPT_MODEL, aiConfigured, askText } from "@/lib/ai/claude";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Recibís el comienzo de un texto teórico (libro, capítulo o artículo) y el nombre del archivo. Identificá el título real de la obra o artículo y su autor.
Reglas: usá solo lo que figura en el fragmento o en el nombre del archivo; no inventes. Si no aparece el autor, dejalo vacío. Título en su capitalización normal, sin comillas ni el nombre de la editorial.
Respondé únicamente un JSON: {"title": "...", "author": "..."}`;

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Sugiere título y autor a partir del comienzo del texto. No guarda nada: lo decide quien lee. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: "La sugerencia con IA todavía no está configurada." }, { status: 503 });
  }

  const [{ data: doc }, { data: texts }] = await Promise.all([
    supabase.from("documents").select("file_name").eq("id", id).maybeSingle(),
    supabase.from("document_texts").select("paragraphs").eq("document_id", id).maybeSingle(),
  ]);
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const paragraphs = Array.isArray(texts?.paragraphs) ? (texts.paragraphs as string[]) : [];
  const start = paragraphs.join("\n\n").slice(0, 3500);
  if (!start) {
    return NextResponse.json(
      { error: "Este archivo es un escaneado: todavía no hay texto para leer. Escribí el título a mano." },
      { status: 422 }
    );
  }

  try {
    const raw = await askText({
      model: CONCEPT_MODEL,
      system: SYSTEM,
      prompt: `Nombre del archivo: ${doc.file_name}\n\nComienzo del texto:\n${start}`,
      maxTokens: 200,
    });
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    const parsed = json ? (JSON.parse(json) as Record<string, unknown>) : {};
    const title = clip(parsed.title, 200);
    if (!title) return NextResponse.json({ error: "No se pudo deducir el título. Escribilo a mano." }, { status: 422 });
    return NextResponse.json({ title, author: clip(parsed.author, 150) });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("No se pudo sugerir ahora.", true);
    return NextResponse.json({ error: e.message }, { status: e.retryable ? 503 : 502 });
  }
}
