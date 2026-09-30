import Link from "next/link";
import { EditDocumentInfo } from "@/components/library/EditDocumentInfo";
import { DeleteDocument } from "@/components/library/DeleteDocument";
import { statusLabel, type SectionCounts } from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { DocumentRow } from "@/types";

const TYPE_LABEL: Record<DocumentRow["file_type"], string> = {
  pdf: "PDF",
  docx: "Word",
  epub: "EPUB",
  txt: "Texto",
};

export function LibraryCard({ doc, counts }: { doc: DocumentRow; counts: SectionCounts }) {
  const readable = doc.total_nodes > 0;
  const processing = doc.status === "extracting" || doc.status === "segmenting";
  const href = readable ? `/reader/${doc.id}` : `/dashboard/documents/${doc.id}`;

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
              readable ? "text-muted-foreground" : "text-primary"
            )}
          >
            {counts.total > 0 && counts.done === counts.total ? "✓ " : processing ? "• " : ""}
            {statusLabel(doc, counts)}
          </span>
        </div>
        {doc.author && <p className="mb-0.5 font-sans text-[14px]">{doc.author}</p>}
        <p className="font-sans text-[13px] text-muted-foreground">
          {[TYPE_LABEL[doc.file_type], doc.page_count ? `${doc.page_count} págs.` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-x-4 border-t border-border px-5 py-1 font-mono text-[11.5px]">
        {readable ? (
          <Link
            href={`/dashboard/documents/${doc.id}`}
            className="py-2 text-muted-foreground hover:text-foreground"
          >
            índice y partes →
          </Link>
        ) : (
          <span />
        )}
        <EditDocumentInfo documentId={doc.id} title={doc.title} author={doc.author} className="text-[11.5px]" />
        <DeleteDocument documentId={doc.id} filePath={doc.file_path} disabled={processing} className="text-[11.5px]" />
      </div>
    </div>
  );
}
