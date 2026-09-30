"use client";

import { Fragment } from "react";
import { GlossaryTooltip } from "@/components/reader/GlossaryTooltip";
import { HEADING_PREFIX, NOTE_PREFIX } from "@/lib/ingest/text";
import { ReconstructedMark } from "@/components/reader/ReconstructedMark";
import type { Chapter, ConceptNode } from "@/types";
import type { Book } from "@/types";

/**
 * Lienzo central de lectura (docs/07): serif ajustable vía --reading-fs
 * (16–24px, default 19), interlineado 1.8, ancho 42rem, párrafos con margen
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
    <article
      id="node-article"
      className="max-w-[42rem] mx-auto font-serif text-[length:var(--reading-fs,19px)] leading-[1.8] text-foreground"
    >
      <h1 className="font-sans text-[0.7em] font-medium tracking-[0.14em] uppercase text-muted-foreground mb-2">
        Nodo {node.orderIndex}
      </h1>
      <h2 className="text-[1.5em] leading-snug font-bold mb-10">{node.title}</h2>
      <div className="space-y-[1.5em] [&_p]:indent-0 [&_p]:text-justify [&_p]:hyphens-auto">
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
    if (paragraph.startsWith(HEADING_PREFIX)) {
      return (
        <h3 key={pIndex} className="pt-2 text-[1.15em] leading-snug font-bold">
          {paragraph.slice(HEADING_PREFIX.length)}
        </h3>
      );
    }
    if (paragraph.startsWith(NOTE_PREFIX)) {
      return (
        <p
          key={pIndex}
          className="border-l-2 border-border pl-3 text-left text-[0.85em] leading-relaxed text-muted-foreground"
        >
          {paragraph.slice(NOTE_PREFIX.length)}
        </p>
      );
    }

    const parts: React.ReactNode[] = [];
    let key = 0;

    // Marcas de escaneo (⟦reconstruido⟧ / [ilegible]) aparte; el glosario solo en el resto.
    for (const segment of paragraph.split(/(⟦[^⟧]+⟧|\[ilegible\])/)) {
      if (!segment) continue;
      if (segment === "[ilegible]") {
        parts.push(<ReconstructedMark key={key++} text={segment} illegible />);
        continue;
      }
      if (segment.startsWith("⟦") && segment.endsWith("⟧")) {
        parts.push(<ReconstructedMark key={key++} text={segment.slice(1, -1)} />);
        continue;
      }

      let remaining = segment;
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
    }

    return <p key={pIndex}>{parts}</p>;
  });
}
