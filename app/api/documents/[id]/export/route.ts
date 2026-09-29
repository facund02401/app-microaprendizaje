import { NextResponse, type NextRequest } from "next/server";
import { collectNotes } from "@/lib/export/collect";
import { buildNotesPdf } from "@/lib/export/notes-pdf";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "documento"
  );
}

/** PDF con las respuestas, notas y conceptos guardados (del documento o de un capítulo). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });

  const chapterId = req.nextUrl.searchParams.get("chapter");
  const data = await collectNotes(supabase, id, chapterId);
  if (!data) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const pdf = await buildNotesPdf(data);
  const name = `apuntes-${slug(data.title)}${chapterId ? "-capitulo" : ""}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
