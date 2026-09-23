import Link from "next/link";
import { statusLabel } from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { DocumentRow } from "@/types";

const TYPE_LABEL: Record<DocumentRow["file_type"], string> = {
  pdf: "PDF",
  docx: "Word",
  epub: "EPUB",
  txt: "Texto",
};

export function LibraryCard({ doc }: { doc: DocumentRow }) {
  const readable = doc.total_nodes > 0;
  const processing = doc.status === "extracting" || doc.status === "segmenting";
  const href = doc.status === "ready" ? `/reader/${doc.id}` : `/dashboard/documents/${doc.id}`;

  return (
    <div className="rounded-lg border border-border bg-card hover:border-ring/60 focus-within:border-ring/60">
      <Link
        href={href}
        className="block rounded-lg p-5 focus-visible:outline-2 focus-visible:outline-ring/60"
      >
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-serif text-[19px] font-semibold">{doc.title}</h2>
          <span
            className={cn(
              "font-mono text-[11.5px] whitespace-nowrap",
              doc.status === "ready" ? "text-muted-foreground" : "text-primary"
            )}
          >
            {doc.status === "ready" ? "✓ " : processing ? "• " : ""}
            {statusLabel(doc)}
          </span>
        </div>
        <p className="font-sans text-[13px] text-muted-foreground">
          {[doc.author, TYPE_LABEL[doc.file_type], doc.page_count ? `${doc.page_count} págs.` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Link>
      {(doc.status === "ready" || (processing && readable)) && (
        <div className="flex gap-4 border-t border-border px-5 py-2 font-mono text-[11.5px]">
          {processing && readable && (
            <Link href={`/reader/${doc.id}`} className="py-1 text-muted-foreground hover:text-foreground">
              leer lo que ya está →
            </Link>
          )}
          <Link
            href={`/dashboard/documents/${doc.id}`}
            className="py-1 text-muted-foreground hover:text-foreground"
          >
            detalles
          </Link>
        </div>
      )}
    </div>
  );
}
