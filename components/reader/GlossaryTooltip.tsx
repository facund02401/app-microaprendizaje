"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SaveConceptButton } from "@/components/reader/SaveConceptButton";
import type { Chapter, GlossaryTerm } from "@/types";
import type { Book } from "@/types";

interface Props {
  gloss: GlossaryTerm;
  book: Book;
  chapter: Chapter;
  nodeIndex: number;
}

/**
 * Término de glosario flotante in situ (docs/02 §3, docs/08 D2):
 * subrayado punteado, definición breve debajo.
 * Escritorio: abre por hover (~200ms), cierra al salir (con 150ms de gracia
 * para poder leer la definición).
 * Móvil: abre/cierra con un toque, cierra tocando afuera o con Esc.
 * Teclado: Tab llega al término, Enter/Espacio alterna, Esc cierra.
 */
export function GlossaryTooltip({ gloss, book, chapter, nodeIndex }: Props) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span
        onMouseEnter={() => {
          clearTimers();
          hoverTimer.current = setTimeout(() => setOpen(true), 200);
        }}
        onMouseLeave={() => {
          clearTimers();
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      >
        <PopoverTrigger asChild>
          <dfn
            tabIndex={0}
            aria-expanded={open}
            className="glossary-term"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
          >
            {gloss.term}
          </dfn>
        </PopoverTrigger>
      </span>
      <PopoverContent
        role="note"
        side="bottom"
        sideOffset={6}
        onMouseEnter={clearTimers}
        onMouseLeave={() => {
          clearTimers();
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        className={cn(
          "w-auto min-w-[220px] max-w-[320px] justify-start rounded-md border px-3 py-2",
          "font-sans text-[13px] leading-relaxed font-normal",
          "bg-[var(--tooltip-bg)] text-foreground border-[var(--tooltip-border)]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-wrap text-left">{gloss.definition}</p>
          <SaveConceptButton
            gloss={gloss}
            book={book}
            chapter={chapter}
            nodeIndex={nodeIndex}
            className="-mr-1 -mt-1 sm:size-7"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
