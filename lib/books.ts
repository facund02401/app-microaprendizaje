import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book, Chapter, GlossaryTerm } from "@/types";

interface ChapterRow {
  id: string;
  order_index: number;
  title: string;
}

interface NodeRow {
  chapter_id: string;
  order_index: number;
  title: string;
  excerpt: string;
  context_glossary: GlossaryTerm[];
  reflection_prompt: string;
}

/** Arma un Book (misma forma que el texto de prueba) desde Supabase. */
export async function loadBook(sb: SupabaseClient, documentId: string): Promise<Book | null> {
  const [{ data: doc }, { data: chapters }, { data: nodes }] = await Promise.all([
    sb.from("documents").select("id, title, author").eq("id", documentId).maybeSingle(),
    sb.from("chapters").select("id, order_index, title").eq("document_id", documentId).order("order_index"),
    sb
      .from("nodes")
      .select("chapter_id, order_index, title, excerpt, context_glossary, reflection_prompt")
      .eq("document_id", documentId)
      .order("order_index"),
  ]);
  if (!doc || !nodes?.length) return null;

  const byChapter = new Map<string, Chapter>();
  for (const c of (chapters ?? []) as ChapterRow[]) {
    byChapter.set(c.id, { id: c.id, title: c.title, nodes: [] });
  }
  for (const n of nodes as NodeRow[]) {
    byChapter.get(n.chapter_id)?.nodes.push({
      orderIndex: n.order_index,
      title: n.title,
      excerptParagraphs: n.excerpt.split("\n\n"),
      contextGlossary: n.context_glossary ?? [],
      reflectionPrompt: n.reflection_prompt,
    });
  }

  return {
    documentId: doc.id,
    title: doc.title,
    author: doc.author ?? "",
    source: "cloud",
    chapters: [...byChapter.values()].filter((c) => c.nodes.length),
  };
}
