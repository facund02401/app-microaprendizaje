"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Número de nota al pie dentro del texto (docs/10 D21). Al tocarlo (o con
 * Enter) abre la nota en un globito, como el glosario; el texto del autor
 * queda limpio. Sin nota que abrir (la llamada quedó sin pareja), se ve
 * solo el número, tenue.
 */
export function NoteRef({ label, note }: { label: string; note: string | null }) {
  const [open, setOpen] = useState(false);

  if (note === null) {
    return <sup className="mx-px font-sans text-[0.65em] text-muted-foreground">{label}</sup>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <sup
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={`Nota ${label}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.currentTarget.click();
            }
          }}
          // El área táctil se agranda sin mover el texto (≥40px en móvil).
          className="relative mx-px cursor-pointer font-sans text-[0.65em] font-medium text-primary before:absolute before:-inset-x-2.5 before:-inset-y-3 before:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-ring/60"
        >
          {label}
        </sup>
      </PopoverTrigger>
      <PopoverContent
        role="note"
        side="bottom"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "w-auto min-w-[220px] max-w-[360px] rounded-md border px-3 py-2",
          "font-sans text-[13px] leading-relaxed font-normal",
          "bg-[var(--tooltip-bg)] text-foreground border-[var(--tooltip-border)]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-wrap text-left">
            <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{label}</span>
            {note}
          </p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar nota"
            title="Cerrar"
            className="-mr-1 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
