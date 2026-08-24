"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
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
 * Término de glosario flotante in situ (docs/02 §3, docs/08 D2/D12).
 * Comportamiento v1.2 corregido (ver APRENDIZAJES):
 * - Touch/móvil: ignora los eventos sintéticos de mouse (causaban abrir-
 *   cerrar instantáneo). El toque abre y QUEDA ABIERTO hasta tocar otro
 *   lugar (interactOutside), Esc o la ×.
 * - Escritorio con hover real: abre a los 200ms; si abrió por hover,
 *   salir cierra (gracia 150ms). Un click lo FIJA abierto igual que el toque.
 */
export function GlossaryTooltip({ gloss, book, chapter, nodeIndex }: Props) {
  const [open, setOpen] = useState(false);
  /** ¿Se abrió por hover transitorio? Si no, quedó fijado por toque/click. */
  const openedByHover = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches;

  const clearTimers = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleSoftClose = () => {
    if (!openedByHover.current) return;
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearTimers();
        if (next) {
          // Apertura por click/toque vía Radix: queda fija.
          openedByHover.current = false;
        } else {
          openedByHover.current = false;
        }
        setOpen(next);
      }}
    >
      <span
        onMouseEnter={() => {
          if (!canHover()) return;
          clearTimers();
          hoverTimer.current = setTimeout(() => {
            openedByHover.current = true;
            setOpen(true);
          }, 200);
        }}
        onMouseLeave={() => {
          if (!canHover()) return;
          scheduleSoftClose();
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
        // Evita saltar el foco al contenido: la lectura sigue donde estaba.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => {
          if (!canHover()) return;
          clearTimers();
        }}
        onMouseLeave={() => {
          if (!canHover()) return;
          scheduleSoftClose();
        }}
        className={cn(
          "w-auto min-w-[220px] max-w-[320px] justify-start rounded-md border px-3 py-2",
          "font-sans text-[13px] leading-relaxed font-normal",
          "bg-[var(--tooltip-bg)] text-foreground border-[var(--tooltip-border)]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-wrap text-left">{gloss.definition}</p>
          <div className="-mr-1 -mt-1 flex shrink-0 flex-col items-center gap-0.5">
            <SaveConceptButton
              gloss={gloss}
              book={book}
              chapter={chapter}
              nodeIndex={nodeIndex}
              className="sm:size-7"
            />
            <button
              onClick={() => {
                clearTimers();
                setOpen(false);
              }}
              aria-label="Cerrar definición"
              title="Cerrar"
              className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
