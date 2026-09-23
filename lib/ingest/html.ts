import { parse, type HTMLElement, NodeType } from "node-html-parser";
import { HEADING_PREFIX, NOTE_PREFIX, normalizeSpaces } from "./text";

const BLOCKS = new Set([
  "p", "div", "li", "blockquote", "section", "article", "td", "dd", "dt",
  "h1", "h2", "h3", "h4", "h5", "h6", "pre", "aside", "figcaption",
]);
const HEADINGS = new Set(["h1", "h2", "h3", "h4"]);
const SKIP = new Set(["script", "style", "head", "nav", "title", "svg", "img"]);

function hasBlockChild(el: HTMLElement): boolean {
  return el.childNodes.some(
    (c) => c.nodeType === NodeType.ELEMENT_NODE && BLOCKS.has((c as HTMLElement).tagName?.toLowerCase())
  );
}

function isNote(el: HTMLElement): boolean {
  const marker = `${el.getAttribute("epub:type") ?? ""} ${el.getAttribute("role") ?? ""} ${el.getAttribute("class") ?? ""} ${el.id ?? ""}`.toLowerCase();
  return /footnote|endnote|rearnote|doc-footnote|doc-endnote/.test(marker);
}

/** HTML (de Word o EPUB) → párrafos con la convención de lib/ingest/text. */
export function htmlToParagraphs(html: string): string[] {
  const root = parse(html, { blockTextElements: { pre: true } });
  const out: string[] = [];

  function walk(el: HTMLElement, inNote: boolean) {
    const tag = el.tagName?.toLowerCase() ?? "";
    if (SKIP.has(tag)) return;
    const note = inNote || isNote(el);

    if (BLOCKS.has(tag) && !hasBlockChild(el)) {
      const text = normalizeSpaces(el.textContent);
      if (!text) return;
      if (HEADINGS.has(tag)) out.push(HEADING_PREFIX + text);
      else out.push((note ? NOTE_PREFIX : "") + text);
      return;
    }
    for (const child of el.childNodes) {
      if (child.nodeType === NodeType.ELEMENT_NODE) walk(child as HTMLElement, note);
      else if (child.nodeType === NodeType.TEXT_NODE && !BLOCKS.has(tag)) {
        // Texto suelto fuera de bloques (HTML desprolijo): se toma igual.
        const text = normalizeSpaces(child.textContent ?? "");
        if (text.length > 1 && tag === "body") out.push(text);
      }
    }
  }

  walk(root, false);
  return out;
}
