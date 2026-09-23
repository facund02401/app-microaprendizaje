import type { DocumentRow } from "@/types";

export const ACCEPT_ATTR =
  ".pdf,.docx,.epub,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,text/plain,text/markdown";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function fileTypeFromName(name: string): DocumentRow["file_type"] | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || ext === "docx" || ext === "epub") return ext;
  if (ext === "txt" || ext === "md") return "txt";
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Porcentaje total del proceso (transcripción + armado de nodos). */
export function progressPercent(doc: DocumentRow): number {
  if (doc.status === "ready") return 100;
  const ocrWeight = doc.ocr_pages > 0 ? 0.4 : 0;
  const ocr = doc.ocr_pages > 0 ? doc.ocr_done / doc.ocr_pages : 1;
  const seg = doc.paragraph_count ? doc.seg_cursor / doc.paragraph_count : 0;
  const value = doc.status === "extracting" ? ocr * ocrWeight : ocrWeight + seg * (1 - ocrWeight);
  return Math.min(99, Math.round(value * 100));
}

export function statusLabel(doc: DocumentRow): string {
  switch (doc.status) {
    case "uploaded":
      return "Leyendo el archivo";
    case "analyzed":
      return "Listo para procesar";
    case "extracting":
      return `Transcribiendo · ${progressPercent(doc)}%`;
    case "segmenting":
      return `Armando nodos · ${progressPercent(doc)}%`;
    case "ready":
      return `${doc.total_nodes} nodos`;
    case "error":
      return "Necesita revisión";
  }
}
