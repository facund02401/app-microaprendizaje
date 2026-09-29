"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isActive, sectionPercent, useProcessing } from "@/components/processing/useProcessing";
import { estimateSection, formatCostRange, formatMinutes } from "@/lib/ingest/estimate";
import type { SectionRow } from "@/types";
import { ExportLink } from "./ExportLink";

interface Props {
  documentId: string;
  processing: { sections: SectionRow[]; model: string; aiReady: boolean };
  /** Posición del nodo actual en el libro (sección * 100000 + párrafo). */
  position?: number;
  nearEnd: boolean;
  atEnd: boolean;
}

/**
 * Lectura por partes (docs/10 D12): cerca del final de lo preparado, prepara
 * sola la siguiente parte de la lista del lector; al final, ofrece seguir.
 */
export function ContinuePanel({ documentId, processing, position, nearEnd, atEnd }: Props) {
  const router = useRouter();
  const p = useProcessing(documentId, { sections: processing.sections }, () => router.refresh());
  const attempted = useRef(new Set<number>());

  const currentSection = position != null ? Math.floor(position / 100000) : -1;
  const active = p.sections.filter(isActive);
  const nextActive = active.find((s) => s.idx > currentSection) ?? active[0];
  const nextAvailable = p.sections.find((s) => s.status === "available" && s.idx > currentSection);
  const working = p.sections.find((s) => s.idx === p.workingOn) ?? nextActive;

  // Prepara en segundo plano la siguiente parte elegida (una sola vez por parte y visita).
  const nextIdx = nextActive?.idx;
  useEffect(() => {
    if (!nearEnd || !processing.aiReady || p.running || nextIdx === undefined) return;
    if (attempted.current.has(nextIdx)) return;
    attempted.current.add(nextIdx);
    const t = setTimeout(() => void p.run({ section: nextIdx, until: "section" }), 0);
    return () => clearTimeout(t);
    // p.run es estable en la práctica; se evita relanzar por cambios de identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearEnd, nextIdx, p.running, processing.aiReady]);

  if (!atEnd) return null;

  async function prepare(section: SectionRow) {
    if (section.status === "available" && !(await p.queue([section.idx], []))) return;
    attempted.current.add(section.idx);
    await p.run({ section: section.idx, until: "section" });
  }

  const est = nextAvailable ? estimateSection(processing.model, nextAvailable) : null;

  return (
    <aside
      aria-live="polite"
      className="mx-auto mt-10 max-w-[42rem] space-y-3 rounded-lg border border-border bg-card p-5 font-sans"
    >
      {p.running ? (
        <>
          <p className="text-[15px] leading-relaxed">
            Preparando <span className="font-serif">«{working?.title ?? "la parte siguiente"}»</span>…
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.max(3, working ? sectionPercent(working) : 0)}%` }}
            />
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Un par de minutos. Podés quedarte acá: el siguiente nodo aparece solo.
          </p>
        </>
      ) : nextActive ? (
        <>
          <p className="text-[15px] leading-relaxed">
            Sigue en tu lista: <span className="font-serif">«{nextActive.title}»</span>
          </p>
          <ActionButton onClick={() => void prepare(nextActive)} disabled={!processing.aiReady}>
            Prepararla ahora
          </ActionButton>
        </>
      ) : nextAvailable && est ? (
        <>
          <p className="text-[15px] leading-relaxed">
            Llegaste al final de lo que elegiste. ¿Seguimos con{" "}
            <span className="font-serif">«{nextAvailable.title}»</span>?
          </p>
          <p className="font-mono text-[12px] text-muted-foreground">
            {formatMinutes(est.readingMinutes)} de lectura · ~{formatCostRange(est.usd)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton onClick={() => void prepare(nextAvailable)} disabled={!processing.aiReady}>
              Preparar esta parte
            </ActionButton>
            <IndexLink documentId={documentId} />
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] leading-relaxed">✓ Llegaste al final de lo preparado.</p>
          <IndexLink documentId={documentId} />
        </>
      )}

      {p.notice && <p className="rounded-md bg-muted px-3 py-2 text-[13px] leading-relaxed">{p.notice}</p>}

      <div className="border-t border-border pt-3">
        <ExportLink documentId={documentId} label="Exportar todos mis apuntes (PDF)" />
      </div>
    </aside>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60 disabled:opacity-50"
    />
  );
}

function IndexLink({ documentId }: { documentId: string }) {
  return (
    <Link
      href={`/dashboard/documents/${documentId}`}
      className="inline-flex min-h-10 items-center text-[14px] text-primary hover:underline"
    >
      Elegir otras partes del índice
    </Link>
  );
}
