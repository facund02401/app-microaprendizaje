"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { syncBank } from "@/lib/concept-bank";
import { syncHighlights } from "@/lib/highlights";
import { cn } from "@/lib/utils";

/**
 * Descarga el PDF de apuntes (respuestas, notas, subrayados y banco de conceptos).
 * Antes sube el banco y los subrayados del dispositivo para que el PDF salga completo.
 */
export function ExportLink({
  documentId,
  chapterId,
  label,
  className,
}: {
  documentId: string;
  chapterId?: string;
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const href = `/api/documents/${documentId}/export${chapterId ? `?chapter=${encodeURIComponent(chapterId)}` : ""}`;

  return (
    <a
      href={href}
      download
      onClick={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        await Promise.all([syncBank(), syncHighlights()]);
        setBusy(false);
        const a = document.createElement("a");
        a.href = href;
        a.download = "";
        a.click();
      }}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 font-sans text-[14px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring/60",
        busy && "opacity-60",
        className
      )}
    >
      <FileDown className="size-4" aria-hidden="true" />
      {busy ? "Preparando PDF…" : label}
    </a>
  );
}
