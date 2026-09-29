import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quoteFor, type ExportChapter, type NotesExport } from "./notes-pdf";

interface NodeRow {
  id: string;
  chapter_id: string;
  start_position: number;
  title: string;
  reflection_prompt: string;
}

/** Junta respuestas, notas y conceptos de un documento (o de un capítulo). */
export async function collectNotes(
  sb: SupabaseClient,
  documentId: string,
  chapterId: string | null
): Promise<NotesExport | null> {
  const [{ data: doc }, { data: chapters }, { data: nodes }, { data: responses }, { data: concepts }] =
    await Promise.all([
      sb.from("documents").select("id, title, author").eq("id", documentId).maybeSingle(),
      sb.from("chapters").select("id, title, start_position").eq("document_id", documentId).order("start_position"),
      sb
        .from("nodes")
        .select("id, chapter_id, start_position, title, reflection_prompt")
        .eq("document_id", documentId)
        .order("start_position"),
      sb.from("node_responses").select("node_id, answer, note").eq("document_id", documentId),
      sb.from("concept_bank").select("*").eq("document_id", documentId).order("saved_at"),
    ]);
  if (!doc) return null;

  const chapterList = (chapters ?? []) as { id: string; title: string }[];
  const scopeChapter = chapterId ? chapterList.find((c) => c.id === chapterId) ?? null : null;
  if (chapterId && !scopeChapter) return null;

  const byNode = new Map(
    (responses ?? []).map((r) => [r.node_id as string, { answer: r.answer as string, note: r.note as string }])
  );
  const numbered = ((nodes ?? []) as NodeRow[]).map((n, i) => ({ ...n, number: i + 1 }));

  const exportChapters: ExportChapter[] = chapterList
    .filter((c) => !scopeChapter || c.id === scopeChapter.id)
    .map((c) => ({
      title: c.title,
      nodes: numbered
        .filter((n) => n.chapter_id === c.id)
        .map((n) => ({
          number: n.number,
          title: n.title,
          prompt: n.reflection_prompt,
          answer: byNode.get(n.id)?.answer ?? "",
          note: byNode.get(n.id)?.note ?? "",
        })),
    }));

  const conceptRows = (concepts ?? []) as {
    term: string;
    definition: string;
    status: string;
    context_paragraph: string | null;
    source_chapter_title: string;
    source_node_index: number;
  }[];

  return {
    title: doc.title as string,
    author: (doc.author as string | null) ?? null,
    scope: scopeChapter ? `Capítulo: ${scopeChapter.title}` : null,
    date: new Date().toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" }),
    chapters: exportChapters,
    concepts: conceptRows
      .filter((c) => !scopeChapter || c.source_chapter_title === scopeChapter.title)
      .map((c) => ({
        term: c.term,
        definition: c.definition,
        pending: c.status === "pending",
        location: [c.source_chapter_title, c.source_node_index ? `nodo ${c.source_node_index}` : null]
          .filter(Boolean)
          .join(" · "),
        quote: quoteFor(c.term, c.context_paragraph),
      })),
  };
}
