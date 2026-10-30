"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { GlossaryTooltip } from "@/components/reader/GlossaryTooltip";
import { HEADING_PREFIX, isNote, noteRefs, parseNote } from "@/lib/ingest/text";
import { NoteRef } from "@/components/reader/NoteRef";
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
  speaking = null,
}: {
  node: ConceptNode;
  book: Book;
  chapter: Chapter;
  /** Párrafo que se está leyendo en voz alta (docs/10 D18): tono tenue, distinto del subrayado. */
  speaking?: number | null;
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
        {renderParagraphs(node, book, chapter, speaking)}
      </div>
    </article>
  );
}

const SPEAKING_CLASS = "-mx-2 rounded-sm bg-muted/60 px-2";

function renderParagraphs(node: ConceptNode, book: Book, chapter: Chapter, speaking: number | null) {
  const pending = new Map(
    node.contextGlossary.map((g) => [g.term.toLowerCase(), g])
  );

  // Cada llamada [^n] se empareja con la nota "n" que sigue a su párrafo;
  // las notas emparejadas se abren desde el número y no ocupan lugar en la página.
  const paras = node.excerptParagraphs;
  const refNote = new Map<string, number>();
  const shown = new Set<number>();
  paras.forEach((paragraph, i) => {
    if (isNote(paragraph)) return;
    for (const label of noteRefs(paragraph)) {
      for (let j = i + 1; j < paras.length && isNote(paras[j]); j++) {
        if (shown.has(j) || parseNote(paras[j])?.label !== label) continue;
        shown.add(j);
        refNote.set(`${i}:${label}`, j);
        break;
      }
    }
  });

  return paras.map((paragraph, pIndex) => {
    if (shown.has(pIndex)) return null;
    if (paragraph.startsWith(HEADING_PREFIX)) {
      return (
        <h3
          key={pIndex}
          data-p={pIndex}
          className={cn("pt-2 text-[1.15em] leading-snug font-bold", speaking === pIndex && SPEAKING_CLASS)}
        >
          {paragraph.slice(HEADING_PREFIX.length)}
        </h3>
      );
    }
    const note = parseNote(paragraph);
    if (note) {
      return (
        <p
          key={pIndex}
          data-p={pIndex}
          className="border-l-2 border-border pl-3 text-left text-[0.85em] leading-relaxed text-muted-foreground"
        >
          {note.label && <span className="mr-1.5 font-mono text-[0.85em]">{note.label}</span>}
          {note.text}
        </p>
      );
    }

    const parts: React.ReactNode[] = [];
    let key = 0;

    // Llamadas de nota ([^n]) y marcas de escaneo (⟦reconstruido⟧ / [ilegible]) aparte; el glosario solo en el resto.
    for (const segment of paragraph.split(/(⟦[^⟧]+⟧|\[ilegible\]|\[\^(?:\d{1,3}|\*{1,3})\])/)) {
      if (!segment) continue;
      const ref = segment.match(/^\[\^(\d{1,3}|\*{1,3})\]$/);
      if (ref) {
        const at = refNote.get(`${pIndex}:${ref[1]}`);
        const text = at === undefined ? null : (parseNote(paras[at])?.text ?? null);
        parts.push(<NoteRef key={key++} label={ref[1]} note={text} />);
        continue;
      }
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

    return (
      <p key={pIndex} data-p={pIndex} className={cn(speaking === pIndex && SPEAKING_CLASS)}>
        {parts}
      </p>
    );
  });
}
