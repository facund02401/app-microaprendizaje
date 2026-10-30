import { parse, type HTMLElement, type Node, NodeType } from "node-html-parser";
import {
  HEADING_PREFIX,
  isNoteLabel,
  makeNote,
  normalizeNoteLabel,
  normalizeSpaces,
  placeNotes,
  splitNoteLabel,
} from "./text";

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

/** Texto de un bloque, con las llamadas de nota (<sup>1</sup>) como [^1] y sin los "volver ↑". */
function inlineText(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.textContent;
  if (node.nodeType !== NodeType.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase() ?? "";
  if (SKIP.has(tag)) return "";
  const text = el.textContent.trim();
  const link = tag === "a" && (el.getAttribute("href") ?? "").startsWith("#");
  if (link && /^[↑↩↵⏎^]+$/.test(text)) return "";
  if ((tag === "sup" || link) && isNoteLabel(text)) return `[^${normalizeNoteLabel(text)}]`;
  return el.childNodes.map(inlineText).join("");
}

/** HTML (de Word o EPUB) → párrafos con la convención de lib/ingest/text. */
export function htmlToParagraphs(html: string): string[] {
  const root = parse(html, { blockTextElements: { pre: true } });
  const out: string[] = [];
  // Notas sin número propio (p. ej. <li> de Word): se numeran por orden de aparición.
  let unlabeled = 0;

  function walk(el: HTMLElement, inNote: boolean) {
    const tag = el.tagName?.toLowerCase() ?? "";
    if (SKIP.has(tag)) return;
    const note = inNote || isNote(el);

    if (BLOCKS.has(tag) && !hasBlockChild(el)) {
      const text = normalizeSpaces(inlineText(el));
      if (!text) return;
      if (HEADINGS.has(tag)) out.push(HEADING_PREFIX + text);
      else if (note) {
        const split = splitNoteLabel(text);
        out.push(makeNote(split.label ?? String(++unlabeled), split.text));
      } else out.push(text);
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
  return placeNotes(out);
}
