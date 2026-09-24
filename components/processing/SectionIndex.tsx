"use client";

import { estimateSection, formatCostRange, formatMinutes } from "@/lib/ingest/estimate";
import { cn } from "@/lib/utils";
import type { SectionRow } from "@/types";
import { sectionPercent } from "./useProcessing";

interface Props {
  sections: SectionRow[];
  selected: Set<number>;
  onToggle: (idx: number) => void;
  onSelectAll: (all: boolean) => void;
  model: string;
  disabled?: boolean;
  workingOn: number | null;
}

/** Índice del documento con casillas: el lector elige qué partes preparar con IA. */
export function SectionIndex({ sections, selected, onToggle, onSelectAll, model, disabled, workingOn }: Props) {
  const selectable = sections.filter((s) => s.status !== "done" && s.status !== "processing");
  const allSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.idx));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="font-sans text-[13px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Índice · {sections.length} {sections.length === 1 ? "parte" : "partes"}
        </h2>
        {selectable.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll(!allSelected)}
            className="min-h-10 px-1 font-sans text-[13px] text-primary hover:underline disabled:opacity-50"
          >
            {allSelected ? "Desmarcar todo" : "Marcar todo"}
          </button>
        )}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {sections.map((s) => {
          const locked = s.status === "done" || s.status === "processing";
          const checked = locked || selected.has(s.idx);
          const est = estimateSection(model, s);
          const pages =
            s.page_start != null
              ? s.page_start === s.page_end
                ? `pág. ${s.page_start}`
                : `págs. ${s.page_start}–${s.page_end}`
              : null;
          const preparing = s.status === "processing" || workingOn === s.idx;

          return (
            <li key={s.idx}>
              <label
                className={cn(
                  "flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/60",
                  (locked || disabled) && "cursor-default"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-[18px] shrink-0 accent-[var(--primary)]"
                  checked={checked}
                  disabled={locked || disabled}
                  onChange={() => onToggle(s.idx)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-[16px] leading-snug">{s.title}</span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[11px] whitespace-nowrap",
                        s.status === "done" ? "text-muted-foreground" : "text-primary"
                      )}
                    >
                      {s.status === "done"
                        ? "✓ listo"
                        : preparing
                          ? `• ${sectionPercent(s)}%`
                          : s.status === "queued"
                            ? "en tu lista"
                            : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {[
                      pages,
                      `${formatMinutes(est.readingMinutes)} de lectura`,
                      s.status === "done" ? null : `~${formatCostRange(est.usd)}`,
                      s.ocr_pages > 0 && s.status !== "done" ? `${s.ocr_pages} escaneadas` : null,
                      s.status === "done" && s.reconstructed > 0
                        ? `${s.reconstructed} ${s.reconstructed === 1 ? "palabra reconstruida" : "palabras reconstruidas"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {s.preview && (
                    <span className="mt-1 block truncate font-serif text-[13px] text-muted-foreground/90 italic">
                      {s.preview}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
