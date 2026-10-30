import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { segmentSystem, segmentUserPrompt } from "./prompts";
import type { NodeSize } from "@/lib/node-size";
import { HEADING_PREFIX, NOTE_PREFIX } from "@/lib/ingest/text";
import { applyCorrections } from "./corrections";
import { spellcheckEnabled, spellcheckWindow } from "./spellcheck";

const NodeSchema = z.object({
  start: z.number().int(),
  kind: z.enum(["lectura", "omitir"]),
  chapter_title: z.string().nullable(),
  title: z.string(),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  reflection_prompt: z.string(),
});

const CorrectionSchema = z.object({
  paragraph: z.number().int(),
  found: z.string(),
  replacement: z.string(),
});

const SegmentSchema = z.object({
  nodes: z.array(NodeSchema),
  corrections: z.array(CorrectionSchema),
});

export type SegmentedNode = z.infer<typeof NodeSchema>;

export interface SegmentContext {
  bookTitle: string;
  author: string | null;
  chapterTitle: string | null;
  previousNodeTitle: string | null;
  isEnd: boolean;
  nodeSize: NodeSize;
  /** Pide también marcar errores de lectura del texto (PDFs con OCR viejo). */
  reviewReading: boolean;
}

export interface SegmentedWindow {
  nodes: SegmentedNode[];
  /** Párrafos de la ventana con las correcciones aplicadas (marcadas ⟦…⟧). */
  paragraphs: string[];
  corrected: number;
}

/**
 * Segmenta un fragmento (lista de párrafos) y devuelve los nodos con su
 * párrafo de inicio (1 = primer párrafo del fragmento), ya saneados:
 * orden creciente, sin repetidos y el primero siempre en 1.
 */
export async function segmentWindow(
  paragraphs: string[],
  ctx: SegmentContext
): Promise<SegmentedWindow> {
  const numbered = paragraphs.map((p, i) => `[P${i + 1}] ${p}`).join("\n\n");

  const { nodes, corrections } = await askStructured({
    schema: SegmentSchema,
    system: segmentSystem(ctx.nodeSize, ctx.reviewReading),
    content: [{ type: "text", text: segmentUserPrompt({ ...ctx, numberedParagraphs: numbered }) }],
    maxTokens: 32000,
    effort: "medium",
  });

  // Un nodo no empieza con una nota al pie (la nota es del nodo anterior)
  // ni el anterior termina con un título suelto (el título abre este nodo).
  const adjusted = nodes.map((n) => {
    let start = n.start;
    while (start > 1 && start <= paragraphs.length && paragraphs[start - 1].startsWith(NOTE_PREFIX)) start++;
    while (start > 1 && paragraphs[start - 2]?.startsWith(HEADING_PREFIX)) start--;
    return { ...n, start };
  });

  const seen = new Set<number>();
  const clean = adjusted
    .filter((n) => n.start >= 1 && n.start <= paragraphs.length)
    .sort((a, b) => a.start - b.start)
    .filter((n) => (seen.has(n.start) ? false : (seen.add(n.start), true)));

  const fixed = ctx.reviewReading
    ? { ...applyCorrections(paragraphs, corrections) }
    : { paragraphs, applied: 0, rejected: 0 };

  // Segunda pasada: diccionario + modelo chico sobre palabras que no existen (docs/10 D21).
  if (ctx.reviewReading && spellcheckEnabled()) {
    const spell = await spellcheckWindow(fixed.paragraphs);
    fixed.paragraphs = spell.paragraphs;
    fixed.applied += spell.applied;
  }

  if (!clean.length) {
    return {
      nodes: [
        {
          start: 1,
          kind: "lectura",
          chapter_title: null,
          title: "Fragmento",
          glossary: [],
          reflection_prompt: "¿Qué idea de este fragmento te gustaría poder explicar con tus palabras?",
        },
      ],
      paragraphs: fixed.paragraphs,
      corrected: fixed.applied,
    };
  }
  clean[0] = { ...clean[0], start: 1 };
  return { nodes: clean, paragraphs: fixed.paragraphs, corrected: fixed.applied };
}
