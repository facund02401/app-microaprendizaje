"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import {
  ACCEPT_ATTR,
  MAX_FILE_BYTES,
  fileTypeFromName,
  formatBytes,
} from "@/lib/documents";
import { titleFromFileName } from "@/lib/ingest/text";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; name: string; size: number }
  | { kind: "error"; message: string };

/** Nombre seguro para Storage: sin tildes, espacios ni símbolos raros. */
function safeName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return clean.slice(-120) || "documento";
}

export function UploadDropzone({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    const type = fileTypeFromName(file.name);
    if (!type) {
      setPhase({
        kind: "error",
        message: "Ese formato no se puede leer todavía. Probá con PDF, Word (.docx), EPUB o texto (.txt).",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setPhase({
        kind: "error",
        message: `El archivo pesa ${formatBytes(file.size)}; el máximo es 50 MB. Si es un PDF escaneado, probá dividirlo en partes.`,
      });
      return;
    }

    setPhase({ kind: "uploading", name: file.name, size: file.size });
    const supabase = createClient();
    const id = crypto.randomUUID();
    const path = `${userId}/${id}/${safeName(file.name)}`;

    const { error: upErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) {
      setPhase({ kind: "error", message: "No se pudo subir el archivo. Revisá la conexión y probá de nuevo." });
      return;
    }

    const { error: dbErr } = await supabase.from("documents").insert({
      id,
      title: titleFromFileName(file.name),
      file_path: path,
      file_name: file.name,
      file_type: type,
      file_size: file.size,
    });
    if (dbErr) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      setPhase({ kind: "error", message: "No se pudo registrar el documento. Probá de nuevo." });
      return;
    }

    router.push(`/dashboard/documents/${id}`);
  }

  const busy = phase.kind === "uploading";

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
          dragging ? "border-primary bg-muted" : "border-border bg-card hover:border-ring/60",
          busy && "cursor-wait opacity-80"
        )}
      >
        <FileUp className="size-7 text-muted-foreground" aria-hidden="true" />
        {busy ? (
          <>
            <span className="font-sans text-[15px]">Subiendo {phase.name}…</span>
            <span className="font-mono text-[11.5px] text-muted-foreground">{formatBytes(phase.size)}</span>
            <span className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-muted">
              <span className="block h-full w-1/3 animate-[nodos-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
            </span>
          </>
        ) : (
          <>
            <span className="font-sans text-[15px]">
              <span className="hidden md:inline">Arrastrá un archivo acá o </span>
              <span className="text-primary underline underline-offset-4">
                <span className="md:hidden">Elegí un archivo</span>
                <span className="hidden md:inline">elegí uno</span>
              </span>
            </span>
            <span className="font-mono text-[11.5px] text-muted-foreground">
              PDF · PDF escaneado · Word · EPUB · TXT — hasta 50 MB
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {phase.kind === "error" && (
        <p role="status" className="mt-4 rounded-md border border-border bg-muted px-3 py-2.5 font-sans text-[13.5px] leading-relaxed">
          {phase.message}
        </p>
      )}

      <p className="mt-6 font-sans text-[12.5px] leading-relaxed text-muted-foreground">
        Tus archivos quedan en un espacio privado: solo vos podés verlos. Para procesarlos, el texto
        se envía a Claude (Anthropic); no subas material clínico ni datos de pacientes.
      </p>
    </div>
  );
}
