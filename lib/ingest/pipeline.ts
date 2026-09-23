import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError } from "@/lib/ai/claude";
import { OCR_BATCH, transcribePages } from "@/lib/ai/ocr";
import { segmentWindow } from "@/lib/ai/segment";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";
import { docxToParagraphs } from "./docx";
import { epubToParagraphs } from "./epub";
import { WINDOW_WORDS } from "./estimate";
import { analyzePdf, assemblePages, type PageContent } from "./pdf";
import type { DocumentRow } from "@/types";
import {
  countWords,
  plainTextToParagraphs,
  splitLongParagraphs,
  totalWords,
} from "./text";

export interface StepResult {
  document: DocumentRow;
  busy?: boolean;
  message?: string;
  retryAfter?: number;
}

const LOCK_MS = 295_000;

async function acquireLock(sb: SupabaseClient, id: string): Promise<DocumentRow | null> {
  const now = new Date();
  const { data } = await sb
    .from("documents")
    .update({ lock_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq("id", id)
    .or(`lock_until.is.null,lock_until.lt."${now.toISOString()}"`)
    .select()
    .maybeSingle();
  return data as DocumentRow | null;
}

async function save(
  sb: SupabaseClient,
  id: string,
  fields: Partial<DocumentRow> & { lock_until?: string | null }
): Promise<DocumentRow> {
  const { data, error } = await sb
    .from("documents")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DocumentRow;
}

async function loadDocument(sb: SupabaseClient, id: string): Promise<DocumentRow | null> {
  const { data } = await sb.from("documents").select().eq("id", id).maybeSingle();
  return data as DocumentRow | null;
}

async function download(sb: SupabaseClient, path: string): Promise<Uint8Array> {
  const { data, error } = await sb.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error || !data) throw new Error("No se pudo leer el archivo subido.");
  return new Uint8Array(await data.arrayBuffer());
}

function decodeText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const broken = (utf8.match(/�/g) ?? []).length;
  return broken > 5 ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

async function saveParagraphs(sb: SupabaseClient, id: string, paragraphs: string[]) {
  const { error } = await sb
    .from("document_texts")
    .upsert({ document_id: id, paragraphs });
  if (error) throw new Error(error.message);
}

/** Lee el archivo, extrae el texto y deja todo listo para estimar el costo. Sin IA. */
async function analyze(sb: SupabaseClient, doc: DocumentRow): Promise<DocumentRow> {
  const bytes = await download(sb, doc.file_path);
  await sb.from("document_pages").delete().eq("document_id", doc.id);
  await sb.from("document_texts").delete().eq("document_id", doc.id);

  let paragraphs: string[] = [];
  let ocrPages = 0;
  let pageCount: number | null = null;
  let title: string | undefined;
  let author: string | undefined;

  if (doc.file_type === "pdf") {
    const pdf = await analyzePdf(bytes);
    pageCount = pdf.pages.length;
    title = pdf.title;
    author = pdf.author;
    ocrPages = pdf.pages.filter((p) => p.needsOcr).length;

    const rows = pdf.pages.map((p, i) => ({
      document_id: doc.id,
      page_number: i + 1,
      needs_ocr: p.needsOcr,
      text: p.needsOcr ? "" : JSON.stringify({ body: p.body, notes: p.notes }),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from("document_pages").insert(rows.slice(i, i + 200));
      if (error) throw new Error(error.message);
    }
    if (ocrPages === 0) paragraphs = splitLongParagraphs(assemblePages(pdf.pages));
  } else if (doc.file_type === "docx") {
    paragraphs = splitLongParagraphs(await docxToParagraphs(Buffer.from(bytes)));
  } else if (doc.file_type === "epub") {
    const epub = await epubToParagraphs(Buffer.from(bytes));
    paragraphs = splitLongParagraphs(epub.paragraphs);
    title = epub.title;
    author = epub.author;
  } else {
    paragraphs = splitLongParagraphs(plainTextToParagraphs(decodeText(bytes)));
  }

  if (!paragraphs.length && ocrPages === 0) {
    return save(sb, doc.id, {
      status: "error",
      error_message: "No se encontró texto en el archivo.",
      lock_until: null,
    });
  }
  if (paragraphs.length) await saveParagraphs(sb, doc.id, paragraphs);

  return save(sb, doc.id, {
    status: "analyzed",
    error_message: null,
    page_count: pageCount,
    ocr_pages: ocrPages,
    ocr_done: 0,
    word_count: totalWords(paragraphs),
    paragraph_count: paragraphs.length,
    seg_cursor: 0,
    total_nodes: 0,
    ...(title ? { title } : {}),
    ...(author && !doc.author ? { author } : {}),
    lock_until: null,
  });
}

/** Transcribe una tanda de páginas escaneadas; al terminar, arma el texto final. */
async function ocrStep(sb: SupabaseClient, doc: DocumentRow): Promise<DocumentRow> {
  const { data: pending } = await sb
    .from("document_pages")
    .select("page_number")
    .eq("document_id", doc.id)
    .eq("needs_ocr", true)
    .eq("text", "")
    .order("page_number")
    .limit(OCR_BATCH);

  if (pending && pending.length) {
    const numbers = pending.map((p) => p.page_number as number);
    const pages = await transcribePages(await download(sb, doc.file_path), numbers);
    for (let i = 0; i < numbers.length; i++) {
      const { error } = await sb
        .from("document_pages")
        .update({ text: JSON.stringify(pages[i]) })
        .eq("document_id", doc.id)
        .eq("page_number", numbers[i]);
      if (error) throw new Error(error.message);
    }
    return save(sb, doc.id, { ocr_done: doc.ocr_done + numbers.length, error_message: null });
  }

  const { data: all, error } = await sb
    .from("document_pages")
    .select("text")
    .eq("document_id", doc.id)
    .order("page_number");
  if (error) throw new Error(error.message);
  const pages = (all ?? []).map((r) => JSON.parse((r.text as string) || '{"body":[],"notes":[]}') as PageContent);
  const paragraphs = splitLongParagraphs(assemblePages(pages));
  if (!paragraphs.length) {
    return save(sb, doc.id, { status: "error", error_message: "No se encontró texto en las páginas." });
  }
  await saveParagraphs(sb, doc.id, paragraphs);
  return save(sb, doc.id, {
    status: "segmenting",
    word_count: totalWords(paragraphs),
    paragraph_count: paragraphs.length,
    ocr_done: doc.ocr_pages,
    error_message: null,
  });
}

const sameTitle = (a: string | null, b: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

/** Segmenta la próxima ventana de texto y guarda capítulos y nodos. */
async function segmentStep(sb: SupabaseClient, doc: DocumentRow): Promise<DocumentRow> {
  const { data: textRow, error } = await sb
    .from("document_texts")
    .select("paragraphs")
    .eq("document_id", doc.id)
    .single();
  if (error || !textRow) throw new Error("No se encontró el texto del documento.");
  const paragraphs = textRow.paragraphs as string[];

  if (doc.seg_cursor >= paragraphs.length) {
    return save(sb, doc.id, { status: "ready", error_message: null });
  }

  // Limpia restos de un paso anterior que falló a mitad de camino.
  await sb.from("nodes").delete().eq("document_id", doc.id).gt("order_index", doc.total_nodes);

  const start = doc.seg_cursor;
  let end = start;
  let words = 0;
  while (end < paragraphs.length && (end === start || words + countWords(paragraphs[end]) <= WINDOW_WORDS)) {
    words += countWords(paragraphs[end]);
    end++;
  }
  const window = paragraphs.slice(start, end);
  const isEnd = end >= paragraphs.length;

  const [{ data: lastChapter }, { data: lastNode }] = await Promise.all([
    sb.from("chapters").select("id, order_index, title").eq("document_id", doc.id)
      .order("order_index", { ascending: false }).limit(1).maybeSingle(),
    sb.from("nodes").select("title").eq("document_id", doc.id)
      .order("order_index", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const segmented = await segmentWindow(window, {
    bookTitle: doc.title,
    author: doc.author,
    chapterTitle: lastChapter?.title ?? null,
    previousNodeTitle: lastNode?.title ?? null,
    isEnd,
  });

  // El último nodo de la ventana puede estar incompleto: se revisa en la próxima,
  // salvo que sea el final del libro o el único nodo encontrado.
  const commitCount = isEnd || segmented.length === 1 ? segmented.length : segmented.length - 1;
  const nextCursor =
    commitCount === segmented.length ? end : start + segmented[commitCount].start - 1;

  let chapter = lastChapter as { id: string; order_index: number; title: string } | null;
  let orderIndex = doc.total_nodes;
  const createdChapters: string[] = [];

  try {
    for (let i = 0; i < commitCount; i++) {
      const node = segmented[i];
      if (node.kind === "omitir") continue;

      const from = node.start - 1;
      const to = i + 1 < segmented.length ? segmented[i + 1].start - 1 : window.length;
      const excerptParas = window.slice(from, to);
      if (!excerptParas.length) continue;
      const excerpt = excerptParas.join("\n\n");

      const newTitle = node.chapter_title?.trim() || null;
      if (!chapter || (newTitle && !sameTitle(newTitle, chapter.title))) {
        const { data: created, error: chErr } = await sb
          .from("chapters")
          .insert({
            document_id: doc.id,
            order_index: (chapter?.order_index ?? 0) + 1,
            title: newTitle ?? doc.title,
          })
          .select("id, order_index, title")
          .single();
        if (chErr || !created) throw new Error(chErr?.message ?? "No se pudo crear el capítulo.");
        chapter = created;
        createdChapters.push(created.id);
      }

      const lower = excerpt.toLowerCase();
      const glossary = node.glossary
        .filter((g) => g.term.trim() && lower.includes(g.term.trim().toLowerCase()))
        .slice(0, 3)
        .map((g) => ({ term: g.term.trim(), definition: g.definition.trim() }));

      orderIndex++;
      const { error: nodeErr } = await sb.from("nodes").insert({
        document_id: doc.id,
        chapter_id: chapter!.id,
        order_index: orderIndex,
        title: node.title.trim() || `Nodo ${orderIndex}`,
        excerpt,
        context_glossary: glossary,
        reflection_prompt:
          node.reflection_prompt.trim() ||
          "¿Qué idea de este nodo te gustaría poder explicar con tus palabras?",
      });
      if (nodeErr) throw new Error(nodeErr.message);
    }
  } catch (err) {
    await sb.from("nodes").delete().eq("document_id", doc.id).gt("order_index", doc.total_nodes);
    if (createdChapters.length) await sb.from("chapters").delete().in("id", createdChapters);
    throw err;
  }

  const done = nextCursor >= paragraphs.length;
  return save(sb, doc.id, {
    seg_cursor: nextCursor,
    total_nodes: orderIndex,
    status: done ? "ready" : "segmenting",
    error_message: null,
  });
}

type Action = "analyze" | "step";

/**
 * Ejecuta UNA unidad de trabajo (cabe en el límite de tiempo del servidor).
 * El navegador la llama en bucle mientras la pantalla de proceso está abierta.
 */
export async function runDocumentAction(
  sb: SupabaseClient,
  id: string,
  action: Action
): Promise<StepResult | null> {
  const current = await loadDocument(sb, id);
  if (!current) return null;

  const doc = await acquireLock(sb, id);
  if (!doc) return { document: current, busy: true, retryAfter: 5 };

  try {
    let updated: DocumentRow;
    if (action === "analyze") {
      updated = ["uploaded", "error", "analyzed"].includes(doc.status) && !doc.total_nodes
        ? await analyze(sb, doc)
        : doc;
    } else if (doc.status === "analyzed") {
      updated = await save(sb, id, {
        status: doc.ocr_pages > doc.ocr_done ? "extracting" : "segmenting",
        error_message: null,
      });
    } else if (doc.status === "extracting") {
      updated = await ocrStep(sb, doc);
    } else if (doc.status === "segmenting") {
      updated = await segmentStep(sb, doc);
    } else {
      updated = doc;
    }
    updated = await save(sb, id, { lock_until: null });
    return { document: updated };
  } catch (err) {
    const ai = err instanceof AiError ? err : null;
    const message = err instanceof Error ? err.message : "Error inesperado.";
    const updated = await save(sb, id, {
      lock_until: null,
      error_message: message,
      ...(action === "analyze" ? { status: "error" as const } : {}),
    });
    return {
      document: updated,
      message,
      retryAfter: ai?.retryable ? ai.retryAfterSeconds : undefined,
    };
  }
}
