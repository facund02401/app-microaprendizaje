export type NodeStatus = "completed" | "current" | "locked";

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ConceptNode {
  orderIndex: number;
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
