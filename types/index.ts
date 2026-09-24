export type NodeStatus = "completed" | "current" | "locked";

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ConceptNode {
  orderIndex: number;
  /** Identificador estable (id en Supabase); en el texto de prueba se usa orderIndex */
  key?: string;
  /** Posición en el libro (sección * 100000 + párrafo), para libros procesados por partes */
  position?: number;
  title: string;
  /** Párrafos del texto fuente, intactos (chunking conceptual 300–600 palabras) */
  excerptParagraphs: string[];
  /** Máximo 3 términos por sesión (regla de producto) */
  contextGlossary: GlossaryTerm[];
  reflectionPrompt: string;
}

export interface Chapter {
  id: string;
  title: string;
  nodes: ConceptNode[];
}

export interface Book {
  documentId: string;
  title: string;
  author: string;
  chapters: Chapter[];
  /** "cloud" = subido y guardado en Supabase; sin valor = texto de prueba local */
  source?: "cloud";
}

/**
 * Estado de un concepto del banco (v1.2, decisión del dueño):
 * - "explained": tiene definición final (glosario del nodo o IA).
 * - "pending": guardado sin conexión útil; espera explicación de IA
 *   mediante el botón manual "Explicar ahora" (ver TODO.md).
 */
export type ConceptStatus = "explained" | "pending";

/** Concepto guardado por el lector en su banco personal (docs/01 §4). */
export interface SavedConcept {
  /** Identificador estable: término en minúsculas */
  id: string;
  term: string;
  definition: string;
  status: ConceptStatus;
  /** Identificación estable del texto (Fase 2: id de Supabase) */
  documentId?: string;
  /** Párrafo donde apareció: contexto para la explicación futura de IA */
  contextParagraph?: string;
  sourceBookTitle: string;
  sourceChapterTitle: string;
  sourceNodeIndex: number;
  savedAt: number;
}

export const nodeKey = (node: ConceptNode) => node.key ?? String(node.orderIndex);

export function flatNodes(book: Book): { chapter: Chapter; node: ConceptNode }[] {
  return book.chapters.flatMap((chapter) =>
    chapter.nodes.map((node) => ({ chapter, node }))
  );
}

export function estimatedMinutes(node: ConceptNode): number {
  const words = node.excerptParagraphs.join(" ").split(/\s+/).length;
  // Lectura analítica densa: ~80 palabras por minuto (docs/02)
  return Math.max(1, Math.round(words / 80));
}

/** Documento subido por el lector (tabla documents en Supabase). */
export type DocumentStatus =
  | "uploaded"
  | "analyzed"
  | "extracting"
  | "segmenting"
  | "ready"
  | "error";

export interface DocumentRow {
  id: string;
  title: string;
  author: string | null;
  file_path: string;
  file_name: string;
  file_type: "pdf" | "docx" | "epub" | "txt";
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  ocr_pages: number;
  ocr_done: number;
  word_count: number | null;
  paragraph_count: number | null;
  seg_cursor: number;
  total_nodes: number;
}

export type SectionStatus = "available" | "queued" | "processing" | "done";

/** Sección del índice de un documento (tabla document_sections, sin los párrafos). */
export interface SectionRow {
  idx: number;
  title: string;
  kind: "text" | "pages";
  para_start: number | null;
  para_end: number | null;
  page_start: number | null;
  page_end: number | null;
  words: number;
  ocr_pages: number;
  preview: string | null;
  status: SectionStatus;
  cursor: number;
  ocr_done: number;
}

export const SECTION_COLUMNS =
  "idx, title, kind, para_start, para_end, page_start, page_end, words, ocr_pages, preview, status, cursor, ocr_done";
