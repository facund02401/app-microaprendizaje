import type { HighlightSpan } from "@/lib/highlights";

/**
 * Puente entre la pantalla y los subrayados guardados (lib/highlights.ts).
 * Cada párrafo del lector lleva `data-p` con su índice; las posiciones se miden
 * sobre el texto visible del párrafo (lo mismo que devuelve Range.toString()).
 */

/** Los subrayados se dibujan con la CSS Custom Highlight API (sin tocar el DOM). */
export const HIGHLIGHT_NAME = "nodos-hl";

export function highlightsSupported(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}

/** Posición de texto de un punto (nodo, desplazamiento) dentro de un párrafo. */
function offsetIn(el: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(node, offset);
  return r.toString().length;
}

/** Tramos subrayables de una selección: uno por párrafo, sin espacios en los bordes. */
export function spansFromRange(range: Range, article: Element): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  article.querySelectorAll<HTMLElement>("[data-p]").forEach((el) => {
    if (!range.intersectsNode(el)) return;
    const startsInside = el.contains(range.startContainer);
    const endsInside = el.contains(range.endContainer);
    const paragraphText = el.textContent ?? "";
    let start = startsInside ? offsetIn(el, range.startContainer, range.startOffset) : 0;
    let end = endsInside ? offsetIn(el, range.endContainer, range.endOffset) : paragraphText.length;
    while (start < end && /\s/.test(paragraphText[start])) start++;
    while (end > start && /\s/.test(paragraphText[end - 1])) end--;
    if (end > start) spans.push({ paragraph: Number(el.dataset.p), start, end, paragraphText });
  });
  return spans;
}

/** Vuelve a armar el Range de un tramo guardado; null si el texto ya no coincide. */
export function rangeFromOffsets(el: Element, start: number, end: number, expected?: string): Range | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let pos = 0;
  let started = false;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = (n as Text).data.length;
    if (!started && start < pos + len) {
      range.setStart(n, start - pos);
      started = true;
    }
    if (started && end <= pos + len) {
      range.setEnd(n, end - pos);
      return expected === undefined || range.toString() === expected ? range : null;
    }
    pos += len;
  }
  return null;
}

/** Punto del texto bajo unas coordenadas de pantalla (Chrome/Safari y Firefox). */
export function caretAtPoint(x: number, y: number): { node: Node; offset: number } | null {
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** Párrafo (`[data-p]`) que contiene un nodo, con la posición de texto del punto. */
export function paragraphPosition(
  article: Element,
  node: Node,
  offset: number
): { paragraph: number; offset: number } | null {
  const base = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const el = base?.closest<HTMLElement>("[data-p]");
  if (!el || !article.contains(el)) return null;
  return { paragraph: Number(el.dataset.p), offset: offsetIn(el, node, offset) };
}
