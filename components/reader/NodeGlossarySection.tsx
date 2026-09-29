"use client";

import { SaveConceptButton } from "@/components/reader/SaveConceptButton";
import type { Chapter } from "@/types";
import type { Book, ConceptNode } from "@/types";

interface Props {
  node: ConceptNode;
  book: Book;
  chapter: Chapter;
}

/**
 * Glosario del nodo (docs/01 §4, decisión v1.1): lista completa de términos
 * del nodo en sección plegable bajo el texto. Complementa los tooltips
 * flotantes (que mantienen el límite de 3 por sesión): esta sección no
 * interrumpe la lectura porque no flota sobre ella.
 */
export function NodeGlossarySection({ node, book, chapter }: Props) {
  if (node.contextGlossary.length === 0) return null;

  return (
    <details className="group max-w-[42rem] mx-auto mt-12 border-t border-border pt-6">
      <summary className="flex cursor-pointer list-none items-center justify-between font-sans text-[13px] font-medium tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        Glosario del nodo ({node.contextGlossary.length})
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <dl className="mt-5 space-y-4 pb-2">
        {node.contextGlossary.map((g) => (
          <div key={g.term} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <dt className="font-serif font-semibold">{g.term}</dt>
              <dd className="mt-1 font-sans text-[14px] leading-relaxed text-muted-foreground">
                {g.definition}
              </dd>
            </div>
            <SaveConceptButton
              gloss={g}
              book={book}
              chapter={chapter}
              nodeIndex={node.orderIndex}
            />
          </div>
        ))}
      </dl>
    </details>
  );
}
