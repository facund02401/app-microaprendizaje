"use client";

import { Fragment } from "react";
import { GlossaryTooltip } from "@/components/reader/GlossaryTooltip";
import type { Chapter, ConceptNode } from "@/types";
import type { Book } from "@/types";

/**
 * Lienzo central de lectura (docs/07): serif ajustable vía --reading-fs
 * (16–24px, default 19), interlineado 1.8, ancho 65ch, párrafos con margen
 * 1.5em y sin sangría. Resalta la primera aparición de cada término.
 */
export function ReaderTextDisplay({
  node,
  book,
  chapter,
}: {
  node: ConceptNode;
  book: Book;
  chapter: Chapter;
}) {
  return (
    <article className="max-w-[65ch] mx-auto font-serif text-[length:var(--reading-fs,19px)] leading-[1.8] text-foreground">
      <h1 className="font-sans text-[13px] font-medium tracking-[0.14em] uppercase text-muted-foreground mb-2">
        Nodo {node.orderIndex}
      </h1>
      <h2 className="text-[28px] leading-snug font-bold mb-10">{node.title}</h2>
      <div className="space-y-[1.5em] [&_p]:indent-0">
        {renderParagraphs(node, book, chapter)}
      </div>
    </article>
  );
}

function renderParagraphs(node: ConceptNode, book: Book, chapter: Chapter) {
  const pending = new Map(
    node.contextGlossary.map((g) => [g.term.toLowerCase(), g])
  );

  return node.excerptParagraphs.map((paragraph, pIndex) => {
    const parts: React.ReactNode[] = [];
    let remaining = paragraph;
    let key = 0;

    while (pending.size > 0) {
      let earliest: {
        term: string;
        start: number;
        gloss: ConceptNode["contextGlossary"][number];
      } | null = null;

      for (const [lowerTerm, gloss] of pending) {
        const idx = remaining.toLowerCase().indexOf(lowerTerm);
        if (idx >= 0 && (!earliest || idx < earliest.start)) {
          earliest = { term: lowerTerm, start: idx, gloss };
        }
      }
      if (!earliest) break;

      const end = earliest.start + earliest.term.length;
      parts.push(
        <Fragment key={key++}>{remaining.slice(0, earliest.start)}</Fragment>
      );
      parts.push(
        <GlossaryTooltip
          key={key++}
          gloss={earliest.gloss}
          book={book}
          chapter={chapter}
          nodeIndex={node.orderIndex}
        />
      );
      remaining = remaining.slice(end);
      pending.delete(earliest.term);
    }
    parts.push(<Fragment key={key++}>{remaining}</Fragment>);

    return <p key={pIndex}>{parts}</p>;
  });
}
