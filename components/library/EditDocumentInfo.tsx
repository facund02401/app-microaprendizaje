"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Cambia título y autor de un texto desde la Biblioteca. No toca el texto ni los nodos ya preparados. */
export function EditDocumentInfo({
  documentId,
  title,
  author,
  className,
}: {
  documentId: string;
  title: string;
  author: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(title);
  const [a, setA] = useState(author ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = t.replace(/\s+/g, " ").trim();
    if (!cleanTitle) {
      setError("El título no puede quedar vacío.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: dbError } = await createClient()
      .from("documents")
      .update({ title: cleanTitle, author: a.trim() || null })
      .eq("id", documentId);
    setBusy(false);
    if (dbError) {
      setError("No se pudo guardar. Probá de nuevo en un momento.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setT(title);
          setA(author ?? "");
          setOpen(true);
        }}
        className={cn("min-h-10 font-sans text-[13px] text-muted-foreground hover:text-foreground", className)}
      >
        Editar título y autor
      </button>
    );
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-[14.5px] focus-visible:outline-2 focus-visible:outline-ring/60";

  return (
    <form onSubmit={save} className="w-full space-y-3 py-3">
      <label className="block space-y-1">
        <span className="font-sans text-[12.5px] text-muted-foreground">Título</span>
        <input value={t} onChange={(e) => setT(e.target.value)} className={field} autoFocus />
      </label>
      <label className="block space-y-1">
        <span className="font-sans text-[12.5px] text-muted-foreground">Autor (opcional)</span>
        <input value={a} onChange={(e) => setA(e.target.value)} className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-3 font-sans text-[13.5px]">
        <button
          type="submit"
          disabled={busy}
          className="min-h-10 rounded-md border border-border px-4 hover:bg-muted disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="min-h-10 px-2 text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        {error && (
          <span role="status" className="text-muted-foreground">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
