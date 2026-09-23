import "server-only";
import { NextResponse } from "next/server";
import { CLAUDE_MODEL, aiConfigured } from "@/lib/ai/claude";
import { getUser } from "@/lib/supabase/server";
import { runDocumentAction } from "./pipeline";

/** Respuesta común de /analyze y /step: estado del documento + datos para la UI. */
export async function handleDocumentAction(id: string, action: "analyze" | "step") {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });

  if (action === "step" && !aiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Falta configurar la clave de Anthropic en el servidor (ANTHROPIC_API_KEY). La guía está en docs/09.",
      },
      { status: 503 }
    );
  }

  const result = await runDocumentAction(supabase, id, action);
  if (!result) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  return NextResponse.json({ ...result, model: CLAUDE_MODEL, aiConfigured: aiConfigured() });
}
