import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError } from "@/lib/ai/claude";
import { OCR_BATCH, transcribePages } from "@/lib/ai/ocr";
import { segmentWindow } from "@/lib/ai/segment";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";
import { SECTION_COLUMNS, type DocumentRow, type SectionRow } from "@/types";
import { docxToParagraphs } from "./docx";
import { epubToParagraphs } from "./epub";
import type { NodeSize } from "@/lib/node-size";
import { WINDOW_WORDS } from "./estimate";
import { analyzePdf, assemblePages, type PagedParagraph, type PageContent } from "./pdf";
import {
  SHORT_TEXT_WORDS,
  detectTextSections,
  pageBlockSections,
  singleTextSection,
  positionOf,
  type SectionDraft,
} from "./sections";
import { countWords, plainTextToParagraphs, splitLongPaged, titleFromFileName } from "./text";

export interface StepResult {
  document: DocumentRow;
  sections: SectionRow[];
  busy?: boolean;
  message?: string;
  retryAfter?: number;
}

const LOCK_MS = 295_000;
/** Si más del 10 % de las páginas no tiene texto, el PDF se trata como escaneado. */
const SCANNED_RATIO = 0.1;

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

export async function loadSections(sb: SupabaseClient, id: string): Promise<SectionRow[]> {
  const { data } = await sb
    .from("document_sections")
    .select(SECTION_COLUMNS)
    .eq("document_id", id)
    .order("idx");
  return (data ?? []) as SectionRow[];
}

async function updateSection(
  sb: SupabaseClient,
  docId: string,
  idx: number,
  fields: Record<string, unknown>
) {
  const { error } = await sb
    .from("document_sections")
    .update(fields)
    .eq("document_id", docId)
    .eq("idx", idx);
  if (error) throw new Error(error.message);
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

const unpaged = (paras: string[]): PagedParagraph[] => paras.map((text) => ({ text, page: null }));

/** Estado general del documento según sus secciones. */
function docStatus(sections: SectionRow[]): DocumentRow["status"] {
  if (sections.some((s) => s.status === "queued" || s.status === "processing")) return "segmenting";
  if (sections.some((s) => s.status === "done")) return "ready";
  return "analyzed";
}

/** Lee el archivo, arma el índice y deja todo listo para elegir. Sin IA. */
async function analyze(sb: SupabaseClient, doc: DocumentRow): Promise<DocumentRow> {
  const bytes = await download(sb, doc.file_path);
  await Promise.all([
    sb.from("document_pages").delete().eq("document_id", doc.id),
    sb.from("document_texts").delete().eq("document_id", doc.id),
    sb.from("document_sections").delete().eq("document_id", doc.id),
  ]);

  let items: PagedParagraph[] = [];
  let sections: SectionDraft[] = [];
  let ocrPages = 0;
  let pageCount: number | null = null;
  let title: string | undefined;
  let author: string | undefined;

  if (doc.file_type === "pdf") {
    const pdf = await analyzePdf(bytes);
    pageCount = pdf.pages.length;
    title = pdf.title;
    author = pdf.author;
    const scanned = pdf.pages.filter((p) => p.needsOcr).length;

    if (scanned > pageCount * SCANNED_RATIO) {
      ocrPages = scanned;
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
      sections = pageBlockSections(pdf.pages);
    } else {
      // Pocas páginas sin texto (tapas, imágenes): se omiten sin gastar en transcribirlas.
      items = splitLongPaged(assemblePages(pdf.pages));
    }
  } else if (doc.file_type === "docx") {
    items = splitLongPaged(unpaged(await docxToParagraphs(Buffer.from(bytes))));
  } else if (doc.file_type === "epub") {
    const epub = await epubToParagraphs(Buffer.from(bytes));
    items = splitLongPaged(unpaged(epub.paragraphs));
    title = epub.title;
    author = epub.author;
  } else {
    items = splitLongPaged(unpaged(plainTextToParagraphs(decodeText(bytes))));
  }

  if (items.length) {
    const { error } = await sb
      .from("document_texts")
      .upsert({ document_id: doc.id, paragraphs: items.map((p) => p.text) });
    if (error) throw new Error(error.message);
    const words = items.reduce((n, p) => n + countWords(p.text), 0);
    // Artículos y textos breves: una sola pieza, sin índice que elegir (docs/10 D13).
    sections =
      words <= SHORT_TEXT_WORDS
        ? [singleTextSection(items, title ?? doc.title)]
        : detectTextSections(items, title ?? doc.title);
  }

  if (!sections.length) {
    return save(sb, doc.id, {
      status: "error",
      error_message: "No se encontró texto en el archivo.",
      lock_until: null,
    });
  }

  const { error: secErr } = await sb
    .from("document_sections")
    .insert(sections.map((s) => ({ ...s, document_id: doc.id })));
  if (secErr) throw new Error(secErr.message);

  return save(sb, doc.id, {
    status: "analyzed",
    error_message: null,
    page_count: pageCount,
    ocr_pages: ocrPages,
    ocr_done: 0,
    word_count: sections.reduce((n, s) => n + s.words, 0),
    paragraph_count: items.length,
    seg_cursor: 0,
    total_nodes: 0,
    // Un título editado a mano nunca se pisa: los metadatos solo reemplazan al nombre de archivo.
    ...(title && doc.title === titleFromFileName(doc.file_name) ? { title } : {}),
    ...(author && !doc.author ? { author } : {}),
    lock_until: null,
  });
}

/** Bloque escaneado: transcribe una tanda de páginas o, si ya están todas, arma sus párrafos. */
async function prepareScannedBlock(
  sb: SupabaseClient,
  doc: DocumentRow,
  section: SectionRow
): Promise<string[] | null> {
  const { data: pending } = await sb
    .from("document_pages")
    .select("page_number")
    .eq("document_id", doc.id)
    .eq("needs_ocr", true)
    .eq("text", "")
    .gte("page_number", section.page_start!)
    .lte("page_number", section.page_end!)
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
    await updateSection(sb, doc.id, section.idx, { ocr_done: section.ocr_done + numbers.length });
    return null;
  }

  const { data: rows, error } = await sb
    .from("document_pages")
    .select("text")
    .eq("document_id", doc.id)
    .gte("page_number", section.page_start!)
    .lte("page_number", section.page_end!)
    .order("page_number");
  if (error) throw new Error(error.message);
  const pages = (rows ?? []).map(
    (r) => JSON.parse((r.text as string) || '{"body":[],"notes":[]}') as PageContent
  );
  const paragraphs = splitLongPaged(assemblePages(pages, section.page_start!)).map((p) => p.text);
  await updateSection(sb, doc.id, section.idx, {
    paragraphs,
    reconstructed: paragraphs.reduce((n, p) => n + (p.match(/⟦[^⟧]+⟧/g)?.length ?? 0), 0),
    ocr_done: section.ocr_pages,
    words: paragraphs.reduce((n, p) => n + countWords(p), 0),
  });
  return paragraphs;
}

const sameTitle = (a: string | null, b: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

async function sectionParagraphs(
  sb: SupabaseClient,
  docId: string,
  section: SectionRow
): Promise<string[] | null> {
  if (section.kind === "text") {
    const { data, error } = await sb
      .from("document_texts")
      .select("paragraphs")
      .eq("document_id", docId)
      .single();
    if (error || !data) throw new Error("No se encontró el texto del documento.");
    return (data.paragraphs as string[]).slice(section.para_start!, section.para_end!);
  }
  const { data } = await sb
    .from("document_sections")
    .select("paragraphs")
    .eq("document_id", docId)
    .eq("idx", section.idx)
    .single();
  return (data?.paragraphs as string[] | null) ?? null;
}

/** Segmenta la próxima ventana de una sección y guarda capítulos y nodos. */
async function segmentSection(
  sb: SupabaseClient,
  doc: DocumentRow,
  section: SectionRow,
  paragraphs: string[],
  nodeSize: NodeSize
): Promise<number> {
  // Limpia restos de un paso anterior que falló a mitad de camino.
  await sb.from("nodes").delete().eq("document_id", doc.id).gt("order_index", doc.total_nodes);

  if (section.cursor >= paragraphs.length) {
    await updateSection(sb, doc.id, section.idx, { status: "done" });
    return doc.total_nodes;
  }

  const start = section.cursor;
  let end = start;
  let words = 0;
  while (end < paragraphs.length && (end === start || words + countWords(paragraphs[end]) <= WINDOW_WORDS)) {
    words += countWords(paragraphs[end]);
    end++;
  }
  const window = paragraphs.slice(start, end);
  const isEnd = end >= paragraphs.length;
  const base = positionOf(section.idx, 0);

  const [{ data: lastChapter }, { data: lastNode }] = await Promise.all([
    sb.from("chapters").select("id, order_index, title, start_position").eq("document_id", doc.id)
      .gte("start_position", base).lt("start_position", base + 100000)
      .order("start_position", { ascending: false }).limit(1).maybeSingle(),
    sb.from("nodes").select("title").eq("document_id", doc.id)
      .lt("start_position", base + start)
      .order("start_position", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { data: chapterCount } = await sb
    .from("chapters").select("order_index").eq("document_id", doc.id)
    .order("order_index", { ascending: false }).limit(1).maybeSingle();

  const segmented = await segmentWindow(window, {
    bookTitle: doc.title,
    author: doc.author,
    chapterTitle: lastChapter?.title ?? section.title,
    previousNodeTitle: lastNode?.title ?? null,
    isEnd,
    nodeSize,
  });

  // El último nodo de la ventana puede estar incompleto: se revisa en la próxima,
  // salvo que sea el final de la sección o el único nodo encontrado.
  const commitCount = isEnd || segmented.length === 1 ? segmented.length : segmented.length - 1;
  const nextCursor =
    commitCount === segmented.length ? end : start + segmented[commitCount].start - 1;

  let chapter = lastChapter as { id: string; title: string } | null;
  let chapterOrder = (chapterCount?.order_index as number | undefined) ?? 0;
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
      const position = base + start + from;

      const claudeTitle = node.chapter_title?.trim() || null;
      const newTitle = !chapter
        ? (section.kind === "text" ? section.title : claudeTitle ?? section.title)
        : claudeTitle && !sameTitle(claudeTitle, chapter.title) && !sameTitle(claudeTitle, section.title)
          ? claudeTitle
          : null;

      if (newTitle) {
        chapterOrder++;
        const { data: created, error: chErr } = await sb
          .from("chapters")
          .insert({ document_id: doc.id, order_index: chapterOrder, title: newTitle, start_position: position })
          .select("id, title")
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
        start_position: position,
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
  await updateSection(sb, doc.id, section.idx, {
    cursor: nextCursor,
    status: done ? "done" : "processing",
  });
  return orderIndex;
}

/** Una unidad de trabajo sobre la sección pedida o la primera de la cola. */
async function step(sb: SupabaseClient, doc: DocumentRow, nodeSize: NodeSize, preferIdx?: number): Promise<DocumentRow> {
  const sections = await loadSections(sb, doc.id);
  const active = (s: SectionRow) => s.status === "queued" || s.status === "processing";
  const target =
    sections.find((s) => s.idx === preferIdx && active(s)) ??
    sections.find((s) => s.status === "processing") ??
    sections.find((s) => s.status === "queued");

  let totalNodes = doc.total_nodes;
  if (target) {
    if (target.status === "queued") {
      await updateSection(sb, doc.id, target.idx, { status: "processing" });
    }
    let paragraphs = await sectionParagraphs(sb, doc.id, target);
    if (target.kind === "pages" && !paragraphs) {
      paragraphs = await prepareScannedBlock(sb, doc, target);
    }
    if (paragraphs) totalNodes = await segmentSection(sb, doc, target, paragraphs, nodeSize);
  }

  const after = await loadSections(sb, doc.id);
  return save(sb, doc.id, {
    total_nodes: totalNodes,
    status: docStatus(after),
    error_message: null,
  });
}

/** Pone en cola o saca de la cola secciones (las ya procesadas no se tocan). */
async function queue(
  sb: SupabaseClient,
  doc: DocumentRow,
  add: number[],
  remove: number[]
): Promise<DocumentRow> {
  if (add.length) {
    await sb.from("document_sections").update({ status: "queued" })
      .eq("document_id", doc.id).eq("status", "available").in("idx", add);
  }
  if (remove.length) {
    await sb.from("document_sections").update({ status: "available" })
      .eq("document_id", doc.id).eq("status", "queued").in("idx", remove);
  }
  const sections = await loadSections(sb, doc.id);
  return save(sb, doc.id, { status: docStatus(sections) });
}

export type Action =
  | { kind: "analyze" }
  | { kind: "step"; section?: number; nodeSize: NodeSize }
  | { kind: "queue"; add: number[]; remove: number[] };

/**
 * Ejecuta UNA unidad de trabajo (cabe en el límite de tiempo del servidor).
 * El navegador la llama en bucle mientras hace falta.
 */
export async function runDocumentAction(
  sb: SupabaseClient,
  id: string,
  action: Action
): Promise<StepResult | null> {
  const current = await loadDocument(sb, id);
  if (!current) return null;

  const doc = await acquireLock(sb, id);
  if (!doc) {
    return { document: current, sections: await loadSections(sb, id), busy: true, retryAfter: 5 };
  }

  try {
    let updated: DocumentRow;
    if (action.kind === "analyze") {
      updated = ["uploaded", "error"].includes(doc.status) ? await analyze(sb, doc) : doc;
    } else if (action.kind === "queue") {
      updated = await queue(sb, doc, action.add, action.remove);
    } else {
      updated = await step(sb, doc, action.nodeSize, action.section);
    }
    updated = await save(sb, id, { lock_until: null });
    return { document: updated, sections: await loadSections(sb, id) };
  } catch (err) {
    const ai = err instanceof AiError ? err : null;
    const message = err instanceof Error ? err.message : "Error inesperado.";
    const updated = await save(sb, id, {
      lock_until: null,
      error_message: message,
      ...(action.kind === "analyze" ? { status: "error" as const } : {}),
    });
    return {
      document: updated,
      sections: await loadSections(sb, id),
      message,
      retryAfter: ai?.retryable ? ai.retryAfterSeconds : undefined,
    };
  }
}
