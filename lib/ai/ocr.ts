import "server-only";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { askStructured, AiError } from "./claude";
import { OCR_SYSTEM } from "./prompts";
import { HEADING_PREFIX, NOTE_PREFIX, normalizeSpaces } from "@/lib/ingest/text";
import type { PageContent } from "@/lib/ingest/pdf";

const OcrSchema = z.object({
  pages: z.array(z.object({ body: z.array(z.string()), notes: z.array(z.string()) })),
});

/** Cantidad de páginas escaneadas que se transcriben por paso. */
export const OCR_BATCH = 5;

/** Transcribe páginas escaneadas (números desde 1) enviando un PDF recortado. */
export async function transcribePages(
  pdfBytes: Uint8Array,
  pageNumbers: number[]
): Promise<PageContent[]> {
  const source = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const subset = await PDFDocument.create();
  const copied = await subset.copyPages(source, pageNumbers.map((n) => n - 1));
  copied.forEach((p) => subset.addPage(p));
  const data = Buffer.from(await subset.save()).toString("base64");

  const { pages } = await askStructured({
    schema: OcrSchema,
    system: OCR_SYSTEM,
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
      {
        type: "text",
        text: `Estas son ${pageNumbers.length} páginas (páginas ${pageNumbers.join(", ")} del original). Transcribilas.`,
      },
    ],
    maxTokens: 32000,
    effort: "low",
  });

  if (pages.length !== pageNumbers.length) {
    throw new AiError("La transcripción no devolvió todas las páginas. Se reintenta solo.", true, 5);
  }

  return pages.map((p) => ({
    body: p.body
      .map(normalizeSpaces)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? HEADING_PREFIX + t.replace(/^#+\s*/, "") : t)),
    notes: p.notes.map(normalizeSpaces).filter(Boolean).map((t) => NOTE_PREFIX + t),
  }));
}
