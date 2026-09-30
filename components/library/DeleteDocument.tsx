"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExportLink } from "@/components/reader/ExportLink";
import { purgeDocumentHighlights } from "@/lib/highlights";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

/**
 * Quita un texto de la biblioteca (docs/10 D16). Es definitivo: se borran el texto,
 * los nodos y las respuestas, notas y subrayados de ese documento. Los conceptos del banco se conservan.
 * Antes de confirmar se ofrece bajar los apuntes en PDF.
 */
export function DeleteDocument({
  documentId,
  filePath,
  disabled,
  redirectTo,
  className,
}: {
  documentId: string;
  filePath: string;
  disabled?: boolean;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("documents").delete().eq("id", documentId);
    if (dbError) {
      setBusy(false);
      setError("No se pudo eliminar. Probá de nuevo en un momento.");
      return;
    }
    await purgeDocumentHighlights(documentId);
    // El archivo original es secundario: si falla, el texto ya no figura en la biblioteca.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className={cn(
          "min-h-10 font-sans text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40",
          className
        )}
      >
        Eliminar de la biblioteca
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirmar eliminación" className="space-y-3 font-sans text-[13.5px] leading-relaxed">
      <p>
        Se borran el texto, sus nodos y tus respuestas, notas y subrayados de este documento. Los conceptos que guardaste en el
        banco se conservan. No se puede deshacer.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <ExportLink documentId={documentId} label="Bajar mis apuntes (PDF)" />
        <button
          onClick={() => void remove()}
          disabled={busy}
          className="min-h-10 rounded-md border border-border px-4 hover:bg-muted disabled:opacity-60"
        >
          {busy ? "Eliminando…" : "Sí, eliminar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="min-h-10 px-2 text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p role="status" className="text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
