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

export interface SectionCounts {
  done: number;
  total: number;
  active: number;
}

export function countSections(rows: { status: string }[] | null | undefined): SectionCounts {
  const list = rows ?? [];
  return {
    done: list.filter((r) => r.status === "done").length,
    total: list.length,
    active: list.filter((r) => r.status === "queued" || r.status === "processing").length,
  };
}

export function statusLabel(doc: DocumentRow, counts: SectionCounts): string {
  const parts = counts.total > 1 ? ` · ${counts.done}/${counts.total} partes` : "";
  switch (doc.status) {
    case "uploaded":
      return "Leyendo el archivo";
    case "analyzed":
      return "Elegí qué leer";
    case "extracting":
    case "segmenting":
      return doc.total_nodes ? `${doc.total_nodes} nodos${parts} · en tu lista: ${counts.active}` : "Preparando";
    case "ready":
      return `${doc.total_nodes} nodos${parts}`;
    case "error":
      return "Necesita revisión";
  }
}
