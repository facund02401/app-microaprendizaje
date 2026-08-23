"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GlossaryTerm } from "@/types";

interface Props {
  gloss: GlossaryTerm;
}

/**
 * Término de glosario flotante in situ (docs/02 §3, docs/08 D2):
 * subrayado punteado, tooltip debajo con definición breve,
 * abre por hover (~200ms) y foco de teclado, cierra con Esc/click fuera.
 */
export function GlossaryTooltip({ gloss }: Props) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger
        asChild
        onFocus={(e) => e.preventDefault()}
      >
        <dfn className="glossary-term" title={undefined}>
          {gloss.term}
        </dfn>
      </TooltipTrigger>
      <TooltipContent
        role="tooltip"
        side="bottom"
        sideOffset={6}
        className={cn(
          "max-w-[320px] justify-start rounded-md border px-3 py-2",
          "font-sans text-[13px] leading-relaxed font-normal normal-case",
          "whitespace-pre-wrap text-left",
          "bg-[var(--tooltip-bg)] text-foreground border-[var(--tooltip-border)]"
        )}
      >
        {gloss.definition}
      </TooltipContent>
    </Tooltip>
  );
}
