"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { estimateProcessing, formatUsd } from "@/lib/ingest/estimate";
import { progressPercent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import type { DocumentRow } from "@/types";

interface Props {
  initial: DocumentRow;
  model: string;
  aiReady: boolean;
}

interface ApiResult {
  document?: DocumentRow;
  busy?: boolean;
  message?: string;
  retryAfter?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callApi(id: string, action: "analyze" | "step"): Promise<ApiResult> {
  try {
    const res = await fetch(`/api/documents/${id}/${action}`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as ApiResult;
    if (res.status === 401) return { error: "Tu sesión venció. Volvé a ingresar y retomá desde acá." };
    if (!res.ok && !json.error) {
      // 504 = el servidor cortó por tiempo: el paso se reintenta.
      return { retryAfter: 10, message: "El servidor tardó demasiado; reintentando." };
    }
    return json;
  } catch {
    return { retryAfter: 15, message: "Sin conexión por un momento; reintentando." };
  }
}

/** Evita que el celular apague la pantalla mientras se procesa. */
function useWakeLock() {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const wanted = useRef(false);

  useEffect(() => {
    async function onVisible() {
      if (wanted.current && document.visibilityState === "visible" && !sentinel.current) {
        try {
          sentinel.current = await navigator.wakeLock.request("screen");
          sentinel.current.addEventListener("release", () => (sentinel.current = null));
        } catch {}
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return {
    async acquire() {
      wanted.current = true;
      if (!("wakeLock" in navigator) || sentinel.current) return;
      try {
        sentinel.current = await navigator.wakeLock.request("screen");
        sentinel.current.addEventListener("release", () => (sentinel.current = null));
      } catch {}
    },
    release() {
      wanted.current = false;
      sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    },
  };
}

export function DocumentProcessor({ initial, model, aiReady }: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(initial.status === "uploaded");
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stopRequested = useRef(false);
  const wakeLock = useWakeLock();

  async function analyze() {
    setAnalyzing(true);
    setNotice(null);
    const r = await callApi(doc.id, "analyze");
    if (r.document) setDoc(r.document);
    if (r.error) setNotice(r.error);
    setAnalyzing(false);
  }

  async function run() {
    stopRequested.current = false;
    setRunning(true);
    setNotice(null);
    await wakeLock.acquire();

    while (!stopRequested.current) {
      const r = await callApi(doc.id, "step");
      if (r.document) setDoc(r.document);
      if (r.error) {
        setNotice(r.error);
        break;
      }
      const status = r.document?.status;
      if (status === "ready" || status === "error") break;

      if (r.retryAfter) {
        setNotice(
          r.busy
            ? "Este documento se está procesando en otra pestaña o dispositivo; esperando."
            : `${r.message ?? "Pausa breve."} (en ${r.retryAfter} s)`
        );
        await sleep(r.retryAfter * 1000);
        setNotice(null);
      } else if (r.message) {
        setNotice(r.message);
        break;
      }
    }

    wakeLock.release();
    setRunning(false);
    router.refresh();
  }

  // Al abrir la pantalla: leer el archivo nuevo o retomar un proceso a medias.
  useEffect(() => {
    const t = setTimeout(() => {
      if (initial.status === "uploaded") void analyze();
      else if (
        (initial.status === "extracting" || initial.status === "segmenting") &&
        !initial.error_message &&
        aiReady
      ) {
        void run();
      }
    }, 0);
    return () => {
      clearTimeout(t);
      stopRequested.current = true;
    };
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveField(field: "title" | "author", value: string) {
    const clean = value.trim();
    if (field === "title" && !clean) return;
    if ((doc[field] ?? "") === clean) return;
    const { data } = await createClient()
      .from("documents")
      .update({ [field]: clean || null })
      .eq("id", doc.id)
      .select()
      .single();
    if (data) setDoc(data as DocumentRow);
  }

  async function remove() {
    const supabase = createClient();
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    router.push("/dashboard");
    router.refresh();
  }

  const pendingOcr = Math.max(0, doc.ocr_pages - doc.ocr_done);
  const estimate = estimateProcessing(model, doc.word_count ?? 0, pendingOcr);
  const inProgress = doc.status === "extracting" || doc.status === "segmenting";
  const percent = progressPercent(doc);

  return (
    <div>
      <p className="mb-2 font-mono text-[11.5px] tracking-[0.12em] text-muted-foreground uppercase">
        {doc.file_name}
      </p>

      {doc.status === "analyzed" ? (
        <div className="mb-6 space-y-3">
          <label className="block">
            <span className="mb-1 block font-sans text-[12.5px] text-muted-foreground">Título</span>
            <input
              defaultValue={doc.title}
              onBlur={(e) => saveField("title", e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-card px-3 font-serif text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-ring/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-sans text-[12.5px] text-muted-foreground">Autor (opcional)</span>
            <input
              defaultValue={doc.author ?? ""}
              onBlur={(e) => saveField("author", e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-card px-3 font-sans text-[15px] focus-visible:outline-2 focus-visible:outline-ring/60"
            />
          </label>
        </div>
      ) : (
        <>
          <h1 className="font-serif text-[28px] leading-snug font-bold">{doc.title}</h1>
          {doc.author && <p className="mt-1 font-sans text-[14px] text-muted-foreground">{doc.author}</p>}
        </>
      )}

      <dl className="my-6 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[12px] sm:grid-cols-3">
        {doc.page_count != null && <Fact label="páginas" value={doc.page_count} />}
        {doc.word_count != null && doc.word_count > 0 && (
          <Fact label="palabras" value={doc.word_count.toLocaleString("es")} />
        )}
        {doc.ocr_pages > 0 && <Fact label="escaneadas" value={doc.ocr_pages} />}
        {doc.total_nodes > 0 && <Fact label="nodos" value={doc.total_nodes} />}
      </dl>

      {analyzing && (
        <Panel>
          <p className="font-sans text-[15px]">Leyendo el archivo…</p>
          <IndeterminateBar />
          <p className="font-sans text-[13px] text-muted-foreground">
            Extraemos el texto y detectamos si hay páginas escaneadas. No usa IA ni tiene costo.
          </p>
        </Panel>
      )}

      {!analyzing && doc.status === "analyzed" && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            {pendingOcr > 0 && doc.word_count
              ? `Hay ${pendingOcr} páginas escaneadas: Claude primero las transcribe y después divide todo el texto en nodos.`
              : pendingOcr > 0
                ? "El archivo es escaneado: Claude primero transcribe las páginas y después divide el texto en nodos."
                : "Claude va a dividir el texto en nodos de 5 a 10 minutos, con título, glosario y una pregunta de anclaje. El texto del autor queda intacto."}
          </p>
          <div className="rounded-md bg-muted px-4 py-3 font-mono text-[12.5px] leading-relaxed">
            <p>
              Costo estimado: <span className="text-foreground">{formatUsd(estimate.minUsd)} – {formatUsd(estimate.maxUsd)}</span>
            </p>
            <p className="text-muted-foreground">
              Tiempo: unos {estimate.minutes} min · modelo {model}
            </p>
          </div>
          <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
            Mantené esta pantalla abierta mientras trabaja. Si la cerrás, se pausa: al volver, sigue
            desde donde quedó sin volver a cobrar lo ya hecho.
          </p>
          {!aiReady && <AiMissing />}
          <div className="flex flex-wrap gap-3 pt-1">
            <PrimaryButton onClick={() => void run()} disabled={!aiReady}>
              Procesar con IA
            </PrimaryButton>
          </div>
        </Panel>
      )}

      {inProgress && (
        <Panel>
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-sans text-[15px]">
              {doc.status === "extracting"
                ? `Transcribiendo páginas escaneadas · ${doc.ocr_done}/${doc.ocr_pages}`
                : `Armando nodos · ${doc.total_nodes} listos`}
            </p>
            <span className="font-mono text-[12px] text-muted-foreground">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(3, percent)}%` }} />
          </div>
          {running ? (
            <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
              Trabajando. La pantalla queda encendida; podés dejar el celular apoyado.
            </p>
          ) : (
            <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
              En pausa. Lo ya procesado quedó guardado.
            </p>
          )}
          {!aiReady && <AiMissing />}
          <div className="flex flex-wrap gap-3 pt-1">
            {running ? (
              <SecondaryButton onClick={() => (stopRequested.current = true)}>
                Pausar al terminar este paso
              </SecondaryButton>
            ) : (
              <PrimaryButton onClick={() => void run()} disabled={!aiReady}>
                {doc.error_message ? "Reintentar" : "Continuar"}
              </PrimaryButton>
            )}
            {doc.total_nodes > 0 && (
              <Link
                href={`/reader/${doc.id}`}
                className="inline-flex min-h-10 items-center rounded-md px-3 font-sans text-[14px] text-primary hover:underline"
              >
                Leer lo que ya está →
              </Link>
            )}
          </div>
        </Panel>
      )}

      {doc.status === "ready" && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            ✓ Listo: {doc.total_nodes} nodos para leer de a uno, a tu ritmo.
          </p>
          <div>
            <Link
              href={`/reader/${doc.id}`}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-sans text-[15px] font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
            >
              Empezar a leer
            </Link>
          </div>
        </Panel>
      )}

      {doc.status === "error" && !analyzing && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            No pudimos leer este archivo{doc.error_message ? `: ${doc.error_message}` : "."}
          </p>
          <div>
            <PrimaryButton onClick={() => void analyze()}>Reintentar</PrimaryButton>
          </div>
        </Panel>
      )}

      {(notice || (doc.error_message && !running && inProgress)) && (
        <p role="status" className="mt-4 rounded-md border border-border bg-muted px-3 py-2.5 font-sans text-[13.5px] leading-relaxed">
          {notice ?? doc.error_message}
        </p>
      )}

      <div className="mt-10 border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3 font-sans text-[13.5px]">
            <span>¿Eliminar el documento y todos sus nodos?</span>
            <SecondaryButton onClick={() => void remove()}>Sí, eliminar</SecondaryButton>
            <button onClick={() => setConfirmDelete(false)} className="min-h-10 px-2 text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={running}
            className="min-h-10 font-sans text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Eliminar documento
          </button>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-[14px] text-foreground">{value}</dd>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 rounded-lg border border-border bg-card p-5">{children}</div>;
}

function IndeterminateBar() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full w-1/3 animate-[nodos-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-sans text-[15px] font-medium text-primary-foreground",
        "hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60 disabled:opacity-50",
        props.className
      )}
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-10 items-center rounded-md border border-border px-4 font-sans text-[14px]",
        "hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring/60 disabled:opacity-50",
        props.className
      )}
    />
  );
}

function AiMissing() {
  return (
    <p className="rounded-md bg-muted px-3 py-2.5 font-sans text-[13px] leading-relaxed">
      Falta conectar Claude: hay que cargar la clave de Anthropic en Vercel (paso 2 de la guía
      <span className="font-mono"> docs/09</span>). Mientras tanto el documento queda guardado.
    </p>
  );
}
