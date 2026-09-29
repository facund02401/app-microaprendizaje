import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { segmentSystem, segmentUserPrompt } from "./prompts";
import type { NodeSize } from "@/lib/node-size";
import { HEADING_PREFIX, NOTE_PREFIX } from "@/lib/ingest/text";

const NodeSchema = z.object({
  start: z.number().int(),
  kind: z.enum(["lectura", "omitir"]),
  chapter_title: z.string().nullable(),
  title: z.string(),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  reflection_prompt: z.string(),
});

const SegmentSchema = z.object({ nodes: z.array(NodeSchema) });

export type SegmentedNode = z.infer<typeof NodeSchema>;

export interface SegmentContext {
  bookTitle: string;
  author: string | null;
  chapterTitle: string | null;
  previousNodeTitle: string | null;
  isEnd: boolean;
  nodeSize: NodeSize;
}

/**
 * Segmenta un fragmento (lista de párrafos) y devuelve los nodos con su
 * párrafo de inicio (1 = primer párrafo del fragmento), ya saneados:
 * orden creciente, sin repetidos y el primero siempre en 1.
 */
export async function segmentWindow(
  paragraphs: string[],
  ctx: SegmentContext
): Promise<SegmentedNode[]> {
  const numbered = paragraphs.map((p, i) => `[P${i + 1}] ${p}`).join("\n\n");

  const { nodes } = await askStructured({
    schema: SegmentSchema,
    system: segmentSystem(ctx.nodeSize),
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

  if (!clean.length) {
    return [
      {
        start: 1,
        kind: "lectura",
        chapter_title: null,
        title: "Fragmento",
        glossary: [],
        reflection_prompt: "¿Qué idea de este fragmento te gustaría poder explicar con tus palabras?",
      },
    ];
  }
  clean[0] = { ...clean[0], start: 1 };
  return clean;
}
