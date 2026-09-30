"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteDocument } from "@/components/library/DeleteDocument";
import { SectionIndex } from "@/components/processing/SectionIndex";
import { ExportLink } from "@/components/reader/ExportLink";
import { isActive, sectionPercent, useProcessing } from "@/components/processing/useProcessing";
import { titleFromFileName } from "@/lib/ingest/text";
import { estimateSection, formatCostRange, formatMinutes, sumEstimates } from "@/lib/ingest/estimate";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DocumentRow, SectionRow } from "@/types";

interface Props {
  initial: DocumentRow;
  initialSections: SectionRow[];
  model: string;
  aiReady: boolean;
}

const selectedFrom = (sections: SectionRow[]) =>
  new Set(sections.filter((s) => s.status !== "available").map((s) => s.idx));

/** Un texto breve (una sola parte) viene elegido de entrada: no hay índice que mostrar. */
const initialSelection = (sections: SectionRow[]) =>
  sections.length === 1 ? new Set([sections[0].idx]) : selectedFrom(sections);

export function DocumentProcessor({ initial, initialSections, model, aiReady }: Props) {
  const router = useRouter();
  const p = useProcessing(initial.id, { document: initial, sections: initialSections });
  const doc = p.doc ?? initial;
  const [selected, setSelected] = useState(() => initialSelection(initialSections));
  const [analyzing, setAnalyzing] = useState(initial.status === "uploaded");
  const [justReady, setJustReady] = useState<SectionRow | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [metaNote, setMetaNote] = useState<string | null>(null);

  // Al abrir: leer el archivo nuevo (gratis).
  useEffect(() => {
    if (initial.status !== "uploaded") return;
    const t = setTimeout(async () => {
      const r = await p.analyze();
      if (r.sections) setSelected(initialSelection(r.sections));
      setAnalyzing(false);
      if (aiReady) void suggestMeta(true);
    }, 0);
    return () => clearTimeout(t);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = p.sections;
  const done = sections.filter((s) => s.status === "done");
  const pendingSelected = sections.filter((s) => selected.has(s.idx) && s.status !== "done");
  const toAdd = sections.filter((s) => selected.has(s.idx) && s.status === "available").map((s) => s.idx);
  const toRemove = sections.filter((s) => !selected.has(s.idx) && s.status === "queued").map((s) => s.idx);
  const dirty = toAdd.length + toRemove.length > 0;
  const selectionEstimate = sumEstimates(pendingSelected.map((s) => estimateSection(model, s)));
  const first = pendingSelected[0];
  const firstEstimate = first ? estimateSection(model, first) : null;
  const working = sections.find((s) => s.idx === p.workingOn) ?? sections.find((s) => s.status === "processing");

  function toggle(idx: number) {
    setJustReady(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectAll(all: boolean) {
    setJustReady(null);
    setSelected(all ? new Set(sections.map((s) => s.idx)) : selectedFrom(sections.filter((s) => s.status !== "queued")));
  }

  async function saveSelection() {
    if (!dirty) return true;
    return p.queue(toAdd, toRemove);
  }

  /** Prepara solo la primera parte elegida; las demás esperan a que llegues leyendo. */
  async function startReading() {
    if (!(await saveSelection())) return;
    const target = pendingSelected[0]?.idx;
    await p.run({ section: target, until: "section" });
    setJustReady(sections.find((s) => s.idx === target) ?? null);
    router.refresh();
  }

  async function prepareAll() {
    if (!(await saveSelection())) return;
    await p.run({ until: "queue" });
    router.refresh();
  }

  async function saveOnly() {
    if (await saveSelection()) router.refresh();
  }

  async function saveField(field: "title" | "author", value: string) {
    const clean = value.trim();
    if (field === "title" && !clean) return;
    if ((doc[field] ?? "") === clean) return;
    await createClient().from("documents").update({ [field]: clean || null }).eq("id", doc.id);
    router.refresh();
  }

  /** Pide a Claude título y autor. En modo automático solo completa lo que sigue con el nombre del archivo. */
  async function suggestMeta(auto = false) {
    setSuggesting(true);
    setMetaNote(null);
    try {
      const supabase = createClient();
      const { data: cur } = await supabase.from("documents").select("title, author, file_name").eq("id", doc.id).single();
      if (auto && cur && (cur.title !== titleFromFileName(cur.file_name) || cur.author)) return;
      const res = await fetch(`/api/documents/${doc.id}/suggest`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { title?: string; author?: string; error?: string };
      if (!res.ok || !body.title) {
        if (!auto) setMetaNote(body.error ?? "No se pudo sugerir ahora. Escribilo a mano.");
        return;
      }
      const { error } = await supabase
        .from("documents")
        .update({ title: body.title, ...(body.author ? { author: body.author } : {}) })
        .eq("id", doc.id);
      if (error) {
        if (!auto) setMetaNote("No se pudo guardar la sugerencia. Probá de nuevo.");
        return;
      }
      setMetaNote("Sugerido por IA a partir del comienzo del texto. Corregilo si no es así.");
      router.refresh();
    } finally {
      setSuggesting(false);
    }
  }

  const single = sections.length === 1;
  const hasIndex = sections.length > 1 && !analyzing;
  const singleEstimate = single ? estimateSection(model, sections[0]) : null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11.5px] tracking-[0.12em] text-muted-foreground uppercase">
        {doc.file_name}
      </p>

      <div className="mb-6 space-y-3">
        <label className="block">
          <span className="sr-only">Título</span>
          <textarea
            key={doc.title}
            defaultValue={doc.title}
            rows={1}
            onBlur={(e) => saveField("title", e.target.value.replace(/\s*\n\s*/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            aria-label="Título del documento"
            className="field-sizing-content w-full resize-none rounded-md border border-transparent bg-transparent px-1 py-1 font-serif text-[26px] leading-snug font-bold hover:border-border focus-visible:border-input focus-visible:outline-2 focus-visible:outline-ring/60"
          />
        </label>
        <input
          key={doc.author ?? ""}
          defaultValue={doc.author ?? ""}
          placeholder="Autor (opcional)"
          onBlur={(e) => saveField("author", e.target.value)}
          aria-label="Autor"
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 font-sans text-[15px] text-muted-foreground placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-input focus-visible:outline-2 focus-visible:outline-ring/60"
        />
        {!analyzing && doc.status !== "uploaded" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
            {aiReady && (
              <button
                type="button"
                onClick={() => void suggestMeta()}
                disabled={suggesting}
                className="min-h-10 font-sans text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {suggesting ? "Buscando título y autor…" : "Sugerir título y autor con IA"}
              </button>
            )}
            {metaNote && (
              <p role="status" className="font-sans text-[12.5px] text-muted-foreground">
                {metaNote}
              </p>
            )}
          </div>
        )}
      </div>

      {analyzing && (
        <Panel>
          <p className="font-sans text-[15px]">Leyendo el archivo y armando el índice…</p>
          <IndeterminateBar />
          <p className="font-sans text-[13px] text-muted-foreground">
            Extraemos el texto y detectamos capítulos y páginas escaneadas. No usa IA ni tiene costo.
          </p>
        </Panel>
      )}

      {doc.status === "error" && !analyzing && !sections.length && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            No pudimos leer este archivo{doc.error_message ? `: ${doc.error_message}` : "."}
          </p>
          <div>
            <PrimaryButton
              onClick={async () => {
                setAnalyzing(true);
                const r = await p.analyze();
                if (r.sections) setSelected(initialSelection(r.sections));
                setAnalyzing(false);
              }}
            >
              Reintentar
            </PrimaryButton>
          </div>
        </Panel>
      )}

      {hasIndex && done.length > 0 && !p.running && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            {justReady
              ? `✓ «${justReady.title}» está lista.`
              : `✓ ${done.length} de ${sections.length} partes listas · ${doc.total_nodes} nodos.`}
            {sections.some(isActive) && " Lo demás de tu lista se prepara mientras leés."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/reader/${doc.id}`}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-sans text-[15px] font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
            >
              {justReady ? "Empezar a leer →" : "Seguir leyendo →"}
            </Link>
            <ExportLink documentId={doc.id} label="Exportar mis apuntes (PDF)" />
          </div>
        </Panel>
      )}

      {p.running && (
        <Panel>
          <div className="flex items-baseline justify-between gap-4">
            <p className="min-w-0 font-sans text-[15px]">
              Preparando <span className="font-serif">«{working?.title ?? "…"}»</span>
            </p>
            <span className="font-mono text-[12px] text-muted-foreground">
              {working ? sectionPercent(working) : 0}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={working ? sectionPercent(working) : 0} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.max(3, working ? sectionPercent(working) : 0)}%` }}
            />
          </div>
          <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
            Unos minutos. La pantalla queda encendida; si la cerrás, se pausa y retoma después sin volver a cobrar.
          </p>
          <div>
            <SecondaryButton onClick={p.stop}>Pausar al terminar este paso</SecondaryButton>
          </div>
        </Panel>
      )}

      {single && !analyzing && !p.running && sections[0].status !== "done" && singleEstimate && (
        <Panel>
          <p className="font-sans text-[15px] leading-relaxed">
            Texto breve: se lee como <strong className="font-medium">una sola pieza</strong>, sin índice que elegir.
            Sus subtítulos van a ordenar los nodos por dentro.
          </p>
          <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
            {[
              sections[0].page_start != null ? `págs. ${sections[0].page_start}–${sections[0].page_end}` : null,
              `${formatMinutes(singleEstimate.readingMinutes)} de lectura`,
              `~${formatCostRange(singleEstimate.usd)}`,
              sections[0].ocr_pages > 0 ? `${sections[0].ocr_pages} págs. escaneadas` : null,
              `modelo ${model}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {!aiReady && <AiMissing />}
          <div>
            <PrimaryButton onClick={() => void startReading()} disabled={!aiReady}>
              Preparar y empezar a leer
            </PrimaryButton>
          </div>
        </Panel>
      )}

      {hasIndex && (
        <div className="mt-6 space-y-4">
          {done.length === 0 && !p.running && (
            <p className="font-sans text-[14.5px] leading-relaxed">
              Marcá lo que querés leer. Se prepara <strong className="font-medium">de a una parte</strong>, a medida que
              avanzás: si dejás el libro, no se gasta en lo que no leíste.
            </p>
          )}

          <SectionIndex
            sections={sections}
            selected={selected}
            onToggle={toggle}
            onSelectAll={selectAll}
            model={model}
            disabled={p.running}
            workingOn={p.workingOn}
          />

          {!p.running && (pendingSelected.length > 0 || dirty) && (
            <div className="sticky bottom-3 z-10 space-y-3 rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
              {pendingSelected.length > 0 && (
                <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
                  {done.length === 0 && first && firstEstimate ? (
                    <>
                      Ahora: «{first.title}» · <span className="text-foreground">~{formatCostRange(firstEstimate.usd)}</span>
                      <br />
                      Tu lista completa ({pendingSelected.length}): ~{formatCostRange(selectionEstimate.usd)} ·{" "}
                      {formatMinutes(selectionEstimate.readingMinutes)} de lectura
                    </>
                  ) : (
                    <>
                      Por preparar ({pendingSelected.length}): ~{formatCostRange(selectionEstimate.usd)} ·{" "}
                      {formatMinutes(selectionEstimate.readingMinutes)} de lectura · modelo {model}
                    </>
                  )}
                </p>
              )}
              {!aiReady && <AiMissing />}
              <div className="flex flex-wrap items-center gap-3">
                {done.length === 0 ? (
                  <PrimaryButton onClick={() => void startReading()} disabled={!aiReady || pendingSelected.length === 0}>
                    Preparar y empezar a leer
                  </PrimaryButton>
                ) : dirty ? (
                  <PrimaryButton onClick={() => void saveOnly()}>Guardar mi lista</PrimaryButton>
                ) : null}
                {pendingSelected.length > 1 || (done.length > 0 && pendingSelected.length > 0) ? (
                  <SecondaryButton onClick={() => void prepareAll()} disabled={!aiReady}>
                    {pendingSelected.length > 1 ? "Preparar todo ahora" : "Prepararla ahora"}
                  </SecondaryButton>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {p.notice && (
        <p role="status" className="mt-4 rounded-md border border-border bg-muted px-3 py-2.5 font-sans text-[13.5px] leading-relaxed">
          {p.notice}
        </p>
      )}

      <div className="mt-10 border-t border-border pt-4">
        <DeleteDocument documentId={doc.id} filePath={doc.file_path} disabled={p.running} redirectTo="/dashboard" />
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 space-y-4 rounded-lg border border-border bg-card p-5">{children}</div>;
}

function IndeterminateBar() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full w-1/3 animate-[nodos-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
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

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
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
