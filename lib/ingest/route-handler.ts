import "server-only";
import { NextResponse } from "next/server";
import { CLAUDE_MODEL, aiConfigured } from "@/lib/ai/claude";
import { parseNodeSize } from "@/lib/node-size";
import { getUser } from "@/lib/supabase/server";
import { runDocumentAction, type Action } from "./pipeline";

const intList = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n >= 0).slice(0, 500) : [];

/** Lee el cuerpo JSON de forma tolerante (puede venir vacío). */
async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Respuesta común de /analyze, /step y /queue: documento + índice + datos para la UI. */
export async function handleDocumentAction(
  req: Request,
  id: string,
  kind: Action["kind"]
) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });

  if (kind === "step" && !aiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Falta configurar la clave de Anthropic en el servidor (ANTHROPIC_API_KEY). La guía está en docs/09.",
      },
      { status: 503 }
    );
  }

  const body = await readBody(req);
  const action: Action =
    kind === "analyze"
      ? { kind }
      : kind === "queue"
        ? { kind, add: intList(body.add), remove: intList(body.remove) }
        : {
          kind,
          section: Number.isInteger(body.section) ? (body.section as number) : undefined,
          nodeSize: parseNodeSize(user.user_metadata?.node_size),
        };

  const result = await runDocumentAction(supabase, id, action);
  if (!result) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  return NextResponse.json({ ...result, model: CLAUDE_MODEL, aiConfigured: aiConfigured() });
}
