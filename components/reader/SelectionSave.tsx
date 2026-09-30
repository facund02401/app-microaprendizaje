"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Highlighter, Plus, X } from "lucide-react";
import {
  NO_EXPLANATION_YET,
  fetchExplanation,
  getBankSnapshot,
  setExplanation,
  saveFromSelection,
} from "@/lib/concept-bank";
import { highlightsSupported, spansFromRange } from "@/lib/highlight-dom";
import { addHighlights, type HighlightSpan } from "@/lib/highlights";
import { nodeKey, type Book, type Chapter, type ConceptNode } from "@/types";

interface Props {
  node: ConceptNode;
  book: Book;
  chapter: Chapter;
}

type Phase = "idle" | "choosing" | "saved" | "exists";

interface SelectionInfo {
  term: string;
  paragraph: string;
  /** Tramos para subrayar (uno por párrafo). */
  spans: HighlightSpan[];
  /** El banco de conceptos es para términos cortos; subrayar admite pasajes largos. */
  canSave: boolean;
  x: number;
  y: number;
}

const MAX_CHARS = 300;
const MAX_HIGHLIGHT_CHARS = 5000;
const COARSE = "(pointer: coarse)";

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
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

function ExplainButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-[40px] w-full items-center justify-center rounded-md bg-primary px-3 font-sans text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {loading ? "Explicando…" : label}
    </button>
  );
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
  // Táctil: el menú nativo del navegador (copiar/seleccionar todo) aparece
  // junto a la selección y taparía el ⊕, así que se ancla abajo, fuera de su alcance.
  const touch = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE).matches,
    () => false
  );
  // Espejo para leer la fase dentro de listeners sin resuscribirlos.
  const phaseRef = useRef<Phase>("idle");
  // Explicación pedida a la IA desde la tarjeta (solo si el lector la pide).
  const [aiDef, setAiDef] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    _setPhase(p);
  }, []);

  const clear = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setSel(null);
    setAiDef(null);
    setAiState("idle");
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
      const canHighlight = highlightsSupported();
      const inArticle =
        article.contains(s.anchorNode) && article.contains(s.focusNode);
      const canSave = text.length <= MAX_CHARS;
      const rect =
        text && inArticle && (canSave || (canHighlight && text.length <= MAX_HIGHLIGHT_CHARS))
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
      const spans = canHighlight ? spansFromRange(s.getRangeAt(0), article) : [];
      if (!canSave && spans.length === 0) {
        if (phaseRef.current === "idle") setSel(null);
        return;
      }
      const top = rect.top > 72 ? rect.top - 52 : rect.bottom + 12;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - 20),
        window.innerWidth - 56
      );
      setSel((prev) => {
        if (prev?.term !== text) {
          setAiDef(null);
          setAiState("idle");
        }
        return { term: text, paragraph, spans, canSave, x: left, y: top };
      });
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

  /** Pide la explicación; si el concepto ya está guardado, la escribe en el banco. */
  async function handleExplain(saveTo?: string) {
    if (!sel) return;
    setAiState("loading");
    try {
      const def = await fetchExplanation({
        term: sel.term,
        paragraph: sel.paragraph,
        book: book.title,
        chapter: chapter.title,
      });
      if (saveTo) setExplanation(saveTo, def);
      setAiDef(def);
      setAiState("idle");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "No se pudo explicar ahora.");
      setAiState("error");
    }
  }

  function handleHighlight() {
    if (!sel || sel.spans.length === 0) return;
    addHighlights(
      {
        documentId: book.documentId,
        nodeKey: nodeKey(node),
        chapterTitle: chapter.title,
        nodeIndex: node.orderIndex,
      },
      sel.spans
    );
    window.getSelection()?.removeAllRanges();
    clear();
  }

  function handleSave(explain = false) {
    if (!sel) return;
    const glossHit = matchGlossary(sel.term, node);
    const definition = glossHit?.definition ?? aiDef;
    const ok = saveFromSelection({
      id: sel.term.toLowerCase(),
      term: sel.term,
      definition: definition ?? NO_EXPLANATION_YET,
      status: definition ? "explained" : "pending",
      documentId: book.documentId,
      contextParagraph: sel.paragraph,
      sourceBookTitle: book.title,
      sourceChapterTitle: chapter.title,
      sourceNodeIndex: node.orderIndex,
    });
    setPhase(ok ? "saved" : "exists");
    if (ok && explain && !definition) void handleExplain(sel.term.toLowerCase());
  }

  if (!sel) return null;

  const glossHit = matchGlossary(sel.term, node);
  const shownDef = glossHit?.definition ?? aiDef;
  const savedId = sel.term.toLowerCase();
  const existingPending =
    phase === "exists" &&
    !shownDef &&
    getBankSnapshot().some((c) => c.id === savedId && c.status === "pending");
  const isPending = !shownDef;

  return (
    <>
      {phase === "idle" && (
        <div
          style={
            touch
              ? {
                  right: 16,
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)",
                }
              : {
                  left: Math.max(8, Math.min(sel.x - (sel.canSave ? 24 : 0), window.innerWidth - 104)),
                  top: sel.y,
                }
          }
          className="fixed z-40 flex gap-2"
        >
          {sel.spans.length > 0 && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              // En táctil la selección se colapsa al tocar: se actúa en pointerdown.
              onPointerDown={() => touch && handleHighlight()}
              onClick={() => handleHighlight()}
              aria-label="Subrayar el texto seleccionado"
              title="Subrayar"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Highlighter aria-hidden="true" className="size-5" />
            </button>
          )}
          {sel.canSave && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              // En táctil, tocar el botón puede colapsar la selección antes del
              // click y hacerlo desaparecer: se abre ya en pointerdown.
              onPointerDown={() => touch && setPhase("choosing")}
              onClick={() => setPhase("choosing")}
              aria-label={`Agregar "${sel.term}" al banco de conceptos`}
              title="Agregar al banco de conceptos"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
      )}

      {phase !== "idle" && (
        <div
          role="dialog"
          aria-label="Agregar al banco de conceptos"
          style={
            touch
              ? {
                  left: 8,
                  right: 8,
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)",
                }
              : {
                  left: Math.max(
                    8,
                    Math.min(sel.x - 130, window.innerWidth - 296)
                  ),
                  top: Math.min(sel.y, window.innerHeight - 220),
                }
          }
          className={`fixed z-40 rounded-md border border-border bg-popover p-3 shadow-xl ${
            touch ? "" : "w-[280px] max-w-[85vw]"
          }`}
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
            {shownDef ??
              (aiState === "loading"
                ? "Pensando una explicación…"
                : aiState === "error"
                  ? aiError
                  : "Sin explicación todavía. Podés guardarlo y pedir que se explique ahora mismo.")}
          </p>
          <p className="mt-2 font-mono text-[10.5px] text-muted-foreground/70">
            {glossHit ? "del glosario del nodo · " : aiDef ? "explicado con IA · " : ""}
            {chapter.title} · nodo {String(node.orderIndex).padStart(2, "0")}
          </p>

          <div className="mt-3">
            {phase === "choosing" && (
              <div className="space-y-2">
                {!shownDef && (
                  <ExplainButton
                    label="Guardar y explicar ahora"
                    loading={aiState === "loading"}
                    onClick={() => handleSave(true)}
                  />
                )}
                <button
                  onClick={() => handleSave()}
                  className={`inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md px-3 font-sans text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring ${
                    shownDef
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {shownDef ? "Guardar en mi banco de conceptos" : "Guardar sin explicar"}
                </button>
              </div>
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
            {phase === "saved" && isPending && (
              <div className="mt-2">
                <ExplainButton
                  label={aiState === "error" ? "Reintentar explicación" : "Explicar ahora"}
                  loading={aiState === "loading"}
                  onClick={() => void handleExplain(savedId)}
                />
              </div>
            )}
            {existingPending && (
              <div className="mt-2">
                <ExplainButton
                  label="Explicar ahora"
                  loading={aiState === "loading"}
                  onClick={() => void handleExplain(savedId)}
                />
              </div>
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
