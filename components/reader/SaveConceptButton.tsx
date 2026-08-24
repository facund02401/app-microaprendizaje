"use client";

import { useSyncExternalStore } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getBankServerSnapshot,
  getBankSnapshot,
  isSaved,
  subscribeBank,
  toggleSaved,
} from "@/lib/concept-bank";
import type { Chapter, GlossaryTerm } from "@/types";
import type { Book } from "@/types";

interface Props {
  gloss: GlossaryTerm;
  book: Book;
  chapter: Chapter;
  nodeIndex: number;
  className?: string;
}

/**
 * Guarda/quita un término en el banco de conceptos personal (docs/01 §4).
 * Estado reactivo vía mini-store (useSyncExternalStore), sin efectos.
 */
export function SaveConceptButton({
  gloss,
  book,
  chapter,
  nodeIndex,
  className,
}: Props) {
  const bank = useSyncExternalStore(
    subscribeBank,
    getBankSnapshot,
    getBankServerSnapshot
  );
  const id = gloss.term.toLowerCase();
  const saved = isSaved(id, bank);

  return (
    <button
      suppressHydrationWarning
      onClick={() =>
        toggleSaved({
          id,
          term: gloss.term,
          definition: gloss.definition,
          sourceBookTitle: book.title,
          sourceChapterTitle: chapter.title,
          sourceNodeIndex: nodeIndex,
        })
      }
      aria-pressed={saved}
      aria-label={
        saved
          ? `Quitar "${gloss.term}" del banco de conceptos`
          : `Guardar "${gloss.term}" en el banco de conceptos`
      }
      title={saved ? "Quitar del banco" : "Guardar en mi banco"}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-md",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-ring/60 sm:size-8",
        saved && "text-foreground",
        className
      )}
    >
      {saved ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  );
}
