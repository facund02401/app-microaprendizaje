"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Eraser } from "lucide-react";
import {
  HIGHLIGHT_NAME,
  caretAtPoint,
  highlightsSupported,
  paragraphPosition,
  rangeFromOffsets,
} from "@/lib/highlight-dom";
import {
  getHighlightsServerSnapshot,
  getHighlightsSnapshot,
  justAdded,
  removeHighlight,
  subscribeHighlights,
} from "@/lib/highlights";
import type { ConceptNode } from "@/types";
import { nodeKey } from "@/types";

/**
 * Dibuja los subrayados del nodo actual (resaltador de un solo color, docs/10 D17)
 * y permite quitarlos: al tocar un pasaje subrayado aparece "Quitar subrayado".
 * Usa la CSS Custom Highlight API: el texto del autor no se modifica.
 */
export function HighlightLayer({ node, documentId }: { node: ConceptNode; documentId: string }) {
  const all = useSyncExternalStore(subscribeHighlights, getHighlightsSnapshot, getHighlightsServerSnapshot);
  const key = nodeKey(node);
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null);

  // Dibujar
  useEffect(() => {
    if (!highlightsSupported()) return;
    const article = document.getElementById("node-article");
    if (!article) return;
    const ranges: Range[] = [];
    for (const h of all) {
      if (h.documentId !== documentId || h.nodeKey !== key) continue;
      const el = article.querySelector(`[data-p="${h.paragraph}"]`);
      const range = el && rangeFromOffsets(el, h.start, h.end, h.text);
      if (range) ranges.push(range);
    }
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
    return () => {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    };
  }, [all, documentId, key]);

  // Tocar un subrayado → ofrecer quitarlo
  useEffect(() => {
    if (!highlightsSupported()) return;
    const article = document.getElementById("node-article");
    if (!article) return;

    function onClick(e: MouseEvent) {
      const sel = window.getSelection();
      if (!article || (sel && !sel.isCollapsed) || justAdded()) return;
      if ((e.target as Element).closest("button, a")) return;
      const caret = caretAtPoint(e.clientX, e.clientY);
      const at = caret && paragraphPosition(article, caret.node, caret.offset);
      const hit =
        at &&
        getHighlightsSnapshot().find(
          (h) =>
            h.documentId === documentId &&
            h.nodeKey === key &&
            h.paragraph === at.paragraph &&
            at.offset >= h.start &&
            at.offset < h.end
        );
      if (!hit) {
        setPop(null);
        return;
      }
      setPop({
        id: hit.id,
        x: Math.min(Math.max(8, e.clientX - 70), window.innerWidth - 158),
        y: e.clientY > 90 ? e.clientY - 56 : e.clientY + 24,
      });
    }

    const close = () => setPop(null);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPop(null);
    }
    article.addEventListener("click", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      article.removeEventListener("click", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [documentId, key]);

  // Cambiar de nodo cierra el aviso
  useEffect(() => {
    const t = setTimeout(() => setPop(null), 0);
    return () => clearTimeout(t);
  }, [key]);

  if (!pop) return null;
  return (
    <button
      style={{ left: pop.x, top: pop.y }}
      onClick={() => {
        removeHighlight(pop.id);
        setPop(null);
      }}
      className="fixed z-40 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border bg-popover px-3 font-sans text-[13px] text-popover-foreground shadow-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Eraser aria-hidden="true" className="size-4" />
      Quitar subrayado
    </button>
  );
}
