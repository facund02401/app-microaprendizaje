"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Parte de un escaneado que se leía mal: reconstruida por contexto (⟦…⟧) o
 * ilegible. Se distingue sin alarmar y al tocarla se explica (texto intacto:
 * nada se corrige en silencio).
 */
export function ReconstructedMark({ text, illegible }: { text: string; illegible?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            illegible
              ? "rounded-sm font-sans text-[0.8em] text-muted-foreground italic focus-visible:outline-2 focus-visible:outline-ring/60"
              : "rounded-sm underline decoration-muted-foreground/70 decoration-dashed decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring/60"
          }
          aria-label={illegible ? "Parte ilegible en el original" : `${text} (reconstruido por contexto)`}
        >
          {illegible ? "[ilegible]" : text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 font-sans text-[13px] leading-relaxed" side="top">
        {illegible
          ? "En el original escaneado esta parte no se puede leer, y el contexto no alcanzaba para deducirla."
          : "Reconstruido por contexto: en el original escaneado esta parte se lee mal."}
      </PopoverContent>
    </Popover>
  );
}
