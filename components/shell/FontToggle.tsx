"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Control de tamaño del texto de lectura (docs/07 §2 ajustado en v1.1):
 * presets 16–24px, persiste en localStorage bajo "nodos-font-size".
 * El layout aplica la variable --reading-fs antes del primer paint
 * (sin flash). El interlineado y el ancho en ch se adaptan solos.
 */

export const FONT_SIZES = [16, 18, 19, 20, 22, 24] as const;
export const DEFAULT_FONT_SIZE = 19;

/** Nivel de módulo: muta fuera del ciclo de render (regla React Compiler). */
function applyFontSize(px: number) {
  try {
    localStorage.setItem("nodos-font-size", String(px));
  } catch {}
  document.documentElement.style.setProperty("--reading-fs", `${px}px`);
}

function storedFontSize(): number {
  if (typeof window === "undefined") return DEFAULT_FONT_SIZE;
  const raw = Number(localStorage.getItem("nodos-font-size"));
  return (FONT_SIZES as readonly number[]).includes(raw)
    ? raw
    : DEFAULT_FONT_SIZE;
}

export function FontToggle() {
  const [size, setSize] = useState<number>(storedFontSize);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          aria-label="Tamaño del texto de lectura"
          title="Tamaño del texto"
          className="rounded-md px-2 py-1.5 font-mono text-[13px] leading-none text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:px-1.5 md:py-2"
        >
          Aa
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-auto p-2">
        <div
          role="radiogroup"
          aria-label="Tamaño del texto de lectura"
          className="flex items-center gap-1"
        >
          {FONT_SIZES.map((px) => (
            <button
              key={px}
              suppressHydrationWarning
              role="radio"
              aria-checked={size === px}
              aria-label={`${px} píxeles`}
              onClick={() => {
                setSize(px);
                applyFontSize(px);
              }}
              className={cn(
                "min-h-[36px] min-w-[42px] rounded-sm font-mono text-[12px] text-muted-foreground",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-2 focus-visible:outline-ring/60",
                size === px && "bg-muted text-foreground"
              )}
            >
              {/* Vista previa a escala real del tamaño */}
              <span style={{ fontSize: `${Math.max(11, px - 6)}px` }}>
                {px}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 font-mono text-[10.5px] tracking-wide text-muted-foreground/70">
          tamaño de lectura
        </p>
      </PopoverContent>
    </Popover>
  );
}
