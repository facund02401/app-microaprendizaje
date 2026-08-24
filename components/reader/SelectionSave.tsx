"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveFromSelection } from "@/lib/concept-bank";
import type { Book, Chapter, ConceptNode } from "@/types";

interface Props {
  node: ConceptNode;
  book: Book;
  chapter: Chapter;
}

type Phase = "idle" | "choosing" | "saved" | "exists";

interface SelectionInfo {
  term: string;
  paragraph: string;
  x: number;
  y: number;
}

const MAX_CHARS = 300;

/** Explicación provisoria hasta conectar la IA en Fase 2 (ver TODO.md). */
function demoExplanation(term: string): string {
  return `(Demo) Cuando conectemos la IA (Fase 2), acá va a aparecer una explicación breve de «${term}» en relación con el párrafo que estás leyendo. El concepto queda guardado como pendiente.`;
}

/** Coincidencia flexible contra el glosario del nodo (más larga primero). */
function matchGlossary(
  term: string,
  node: ConceptNode
): ConceptNode["contextGlossary"][number] | undefined {
  const lower = term.toLowerCase();
  return [...node.contextGlossary]
    .sort((a, b) => b.term.length - a.term.length)
    .find((g) => {
      const t = g.term.toLowerCase();
      return lower.includes(t) || (lower.length >= 4 && t.includes(lower));
    });
}

/**
 * Prototipo v1.2 (ver TODO.md): al seleccionar texto del nodo aparece un
 * botón ⊕ flotante que guarda el término con contexto de párrafo y ubicación.
 * Si coincide con el glosario del nodo usa esa definición (explained);
 * si no, guarda explicación demo marcada pendiente para la IA futura.
 * Cierra con Esc, × o al hacer scroll; una nueva selección reinicia.
 */
export function SelectionSave({ node, book, chapter }: Props) {
  const [sel, setSel] = useState<SelectionInfo | null>(null);
  const [phase, _setPhase] = useState<Phase>("idle");
  // Espejo para leer la fase dentro de listeners sin resuscribirlos.
  const phaseRef = useRef<Phase>("idle");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    _setPhase(p);
  }, []);

  const clear = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setSel(null);
    setPhase("idle");
  }, [setPhase]);

  useEffect(() => {
    const article = document.getElementById("node-article");

    function readSelection() {
      const s = window.getSelection();

      // Selección colapsada/inexistente: solo limpia si no hay tarjeta abierta.
      if (!s || s.isCollapsed || s.rangeCount === 0 || !article) {
        if (phaseRef.current === "idle") setSel(null);
        return;
      }
      const text = s.toString().trim().replace(/\s+/g, " ");
      const rect =
        text && text.length <= MAX_CHARS && article.contains(s.anchorNode)
          ? s.getRangeAt(0).getBoundingClientRect()
          : null;

      // Selección inválida: igual que colapsada.
      if (!text || !rect || (rect.width === 0 && rect.height === 0)) {
        if (phaseRef.current === "idle") setSel(null);
        return;
      }

      // Selección válida nueva: vuelve al estado botón (aunque haya tarjeta).
      let paragraphEl: Node | null = s.anchorNode;
      let paragraph = "";
      while (paragraphEl && paragraphEl !== article) {
        if (paragraphEl.nodeName === "P") {
          paragraph = (paragraphEl.textContent ?? "").trim();
          break;
        }
        paragraphEl = paragraphEl.parentNode;
      }
      const top = rect.top > 72 ? rect.top - 52 : rect.bottom + 12;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - 20),
        window.innerWidth - 56
      );
      setSel({ term: text, paragraph, x: left, y: top });
      setPhase("idle");
    }

    function onSelectionChange() {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(readSelection, 250);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") clear();
    }

    document.addEventListener("selectionchange", onSelectionChange);
    // capture: true detecta también los scrolls de contenedores internos
    window.addEventListener("scroll", clear, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("keydown", onKeyDown);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [clear, setPhase]);

  function handleSave() {
    if (!sel) return;
    const glossHit = matchGlossary(sel.term, node);
    const ok = saveFromSelection({
      id: sel.term.toLowerCase(),
      term: sel.term,
      definition: glossHit ? glossHit.definition : demoExplanation(sel.term),
      status: glossHit ? "explained" : "pending",
      documentId: book.documentId,
      contextParagraph: sel.paragraph,
      sourceBookTitle: book.title,
      sourceChapterTitle: chapter.title,
      sourceNodeIndex: node.orderIndex,
    });
    setPhase(ok ? "saved" : "exists");
  }

  if (!sel) return null;

  const glossHit = matchGlossary(sel.term, node);
  const isPending = !glossHit;

  return (
    <>
      {phase === "idle" && (
        <button
          style={{ left: sel.x, top: sel.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPhase("choosing")}
          aria-label={`Agregar "${sel.term}" al banco de conceptos`}
          title="Agregar al banco de conceptos"
          className="fixed z-40 inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Plus aria-hidden="true" className="size-5" />
        </button>
      )}

      {phase !== "idle" && (
        <div
          role="dialog"
          aria-label="Agregar al banco de conceptos"
          style={{
            left: Math.max(8, Math.min(sel.x - 130, window.innerWidth - 296)),
            top: Math.min(sel.y, window.innerHeight - 220),
          }}
          className="fixed z-40 w-[280px] max-w-[85vw] rounded-md border border-border bg-popover p-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-words font-serif text-[15px] font-semibold leading-snug">
              {sel.term}
            </p>
            <button
              onClick={clear}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground">
            {glossHit ? glossHit.definition : demoExplanation(sel.term)}
          </p>
          <p className="mt-2 font-mono text-[10.5px] text-muted-foreground/70">
            {glossHit ? "del glosario del nodo · " : ""}
            {chapter.title} · nodo {String(node.orderIndex).padStart(2, "0")}
          </p>

          <div className="mt-3">
            {phase === "choosing" && (
              <button
                onClick={handleSave}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 font-sans text-[13px] font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Plus aria-hidden="true" className="size-4" /> Guardar en mi
                banco de conceptos
              </button>
            )}
            {phase === "saved" && (
              <p aria-live="polite" className="font-sans text-[13px]">
                Guardado ✓{" "}
                {isPending && (
                  <span className="ml-1 inline-block rounded border border-border px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    pendiente de explicación
                  </span>
                )}
              </p>
            )}
            {phase === "exists" && (
              <p
                aria-live="polite"
                className="font-sans text-[13px] text-muted-foreground"
              >
                Este término ya está en tu banco.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
