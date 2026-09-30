"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  NO_EXPLANATION_YET,
  fetchExplanation,
  setExplanation,
  getBankServerSnapshot,
  getBankSnapshot,
  removeFromBank,
  subscribeBank,
} from "@/lib/concept-bank";
import type { SavedConcept } from "@/types";

/**
 * Panel del banco de conceptos personal (docs/01 §4, v1.2 T2):
 * jerarquía Libro → Capítulo → Nodo con encabezados monoespaciados tipo IDE,
 * ordenado por posición en el texto. Los conceptos pendientes muestran
 * etiqueta gris neutra hasta que el lector pida la explicación de IA con el
 * botón manual "Explicar ahora" (TODO.md T5).
 */

interface NodeRow {
  nodeIndex: number;
  items: SavedConcept[];
}

interface ChapterBlock {
  title: string;
  nodes: NodeRow[];
}

interface BookBlock {
  key: string;
  title: string;
  chapters: ChapterBlock[];
}

/** Agrupa y ordena sin mutar el snapshot original (patrón Map + sort). */
function buildHierarchy(bank: SavedConcept[]): BookBlock[] {
  type ChapterAcc = {
    minNode: number;
    nodes: Map<number, SavedConcept[]>;
  };
  const books = new Map<
    string,
    { title: string; chapters: Map<string, ChapterAcc> }
  >();

  for (const c of bank) {
    const bookKey = c.documentId ?? c.sourceBookTitle.toLowerCase();
    const book =
      books.get(bookKey) ?? { title: c.sourceBookTitle, chapters: new Map() };
    const chapter =
      book.chapters.get(c.sourceChapterTitle) ??
      ({ minNode: c.sourceNodeIndex, nodes: new Map() } as ChapterAcc);
    chapter.minNode = Math.min(chapter.minNode, c.sourceNodeIndex);
    const items = chapter.nodes.get(c.sourceNodeIndex) ?? [];
    items.push(c);
    chapter.nodes.set(c.sourceNodeIndex, items);
    book.chapters.set(c.sourceChapterTitle, chapter);
    books.set(bookKey, book);
  }

  return [...books.entries()]
    .sort(([, a], [, b]) => a.title.localeCompare(b.title))
    .map(([bookKey, book]) => {
      const chapters = [...book.chapters.entries()]
        .map(([title, acc]) => ({
          title,
          nodes: [...acc.nodes.entries()]
            .map(([nodeIndex, items]) => ({
              nodeIndex,
              items: [...items].sort((a, b) => b.savedAt - a.savedAt),
            }))
            .sort((a, b) => a.nodeIndex - b.nodeIndex),
        }))
        .sort(
          (a, b) =>
            (a.nodes[0]?.nodeIndex ?? Infinity) -
            (b.nodes[0]?.nodeIndex ?? Infinity)
        );
      return {
        key: bookKey,
        title: book.title,
        chapters,
      };
    });
}

function countBook(book: BookBlock): number {
  return book.chapters.reduce(
    (sum, ch) => sum + ch.nodes.reduce((s, nd) => s + nd.items.length, 0),
    0
  );
}

export function ConceptBankPanel() {
  const bank = useSyncExternalStore(
    subscribeBank,
    getBankSnapshot,
    getBankServerSnapshot
  );

  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState("");
  const pending = bank.filter((c) => c.status === "pending");

  /** Explica uno por uno; los que fallan siguen pendientes, sin castigo. */
  async function explainAll() {
    setRunning(true);
    setSummary("");
    let ok = 0;
    let failed = 0;
    for (const c of pending) {
      try {
        setExplanation(
          c.id,
          await fetchExplanation({
            term: c.term,
            paragraph: c.contextParagraph,
            book: c.sourceBookTitle,
            chapter: c.sourceChapterTitle,
          })
        );
        ok++;
      } catch {
        failed++;
      }
    }
    setRunning(false);
    setSummary(
      `${ok} explicado${ok === 1 ? "" : "s"}` +
        (failed ? `, ${failed} para reintentar` : "")
    );
  }

  if (bank.length === 0) {
    return (
      <p className="px-3 py-6 font-sans text-[12.5px] leading-relaxed text-muted-foreground/80 italic">
        Todavía no guardaste conceptos. Abrí el glosario de un nodo —o
        seleccioná una palabra del texto— y tocá ⊕ para tenerlo siempre a mano
        acá, ordenado por texto y nodo.
      </p>
    );
  }

  const books = buildHierarchy(bank);

  return (
    <div className="space-y-3">
      {(pending.length > 0 || summary) && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 font-sans text-[12.5px] text-muted-foreground">
          <span>
            {running
              ? "Explicando…"
              : summary ||
                `${pending.length} concepto${pending.length === 1 ? "" : "s"} sin explicar`}
          </span>
          {pending.length > 0 && (
            <button
              onClick={explainAll}
              disabled={running}
              className="min-h-[36px] shrink-0 rounded-md border border-border px-2.5 font-medium text-foreground hover:bg-muted disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring/60"
            >
              Explicar ahora
            </button>
          )}
        </div>
      )}
      {books.map((book) => (
        <details key={book.key} open className="group/book">
          <summary className="-mx-1 flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate font-serif text-[13px] font-semibold">
              {book.title}
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground/70">
              {countBook(book)}
            </span>
          </summary>

          <div className="mt-1 space-y-3">
            {book.chapters.map((chapter) => (
              <div key={chapter.title}>
                <p className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  {chapter.title}
                </p>
                <ul className="mt-1 space-y-2">
                  {chapter.nodes.flatMap((nd) =>
                    nd.items.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-md px-2 py-1.5 hover:bg-sidebar-accent/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words font-serif text-[14px] font-semibold leading-snug">
                            {c.term}
                          </p>
                          <div className="-mr-1 flex shrink-0 items-center gap-0.5">
                            {c.status === "pending" && (
                              <span
                                title="Sin explicación todavía (botón Explicar ahora)"
                                className="rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground"
                              >
                                pendiente
                              </span>
                            )}
                            <button
                              onClick={() => removeFromBank(c.id)}
                              aria-label={`Quitar "${c.term}" del banco`}
                              title="Quitar del banco"
                              className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
                            >
                              <X aria-hidden="true" className="size-4" />
                            </button>
                          </div>
                        </div>
                        <p
                          className={
                            c.status === "pending"
                              ? "mt-1 font-sans text-[13px] italic leading-relaxed text-muted-foreground/80"
                              : "mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground"
                          }
                        >
                          {c.status === "pending" ||
                          c.definition.startsWith("(Demo)")
                            ? NO_EXPLANATION_YET
                            : c.definition}
                        </p>
                        <p className="mt-1.5 font-mono text-[10.5px] text-muted-foreground/70">
                          nodo {String(c.sourceNodeIndex).padStart(2, "0")}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
