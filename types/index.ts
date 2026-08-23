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
