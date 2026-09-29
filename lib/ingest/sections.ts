import type { PagedParagraph, PdfAnalysis } from "./pdf";
import { HEADING_PREFIX, NOTE_PREFIX, countWords } from "./text";

/** Sección del índice antes de guardarse (ver tabla document_sections). */
export interface SectionDraft {
  idx: number;
  title: string;
  kind: "text" | "pages";
  para_start: number | null;
  para_end: number | null;
  page_start: number | null;
  page_end: number | null;
  words: number;
  ocr_pages: number;
  preview: string | null;
}

const MAX_SECTIONS = 40;
const CHUNK_WORDS = 5000;
const SPLIT_ABOVE_WORDS = 12000;
export const PAGE_BLOCK = 10;
const WORDS_PER_SCANNED_PAGE = 380;

interface Raw {
  start: number;
  end: number;
  titles: string[];
  words: number;
}

function previewOf(paras: string[]): string | null {
  const body = paras.find((p) => !p.startsWith(HEADING_PREFIX) && !p.startsWith(NOTE_PREFIX));
  if (!body) return null;
  const words = body.split(/\s+/);
  return words.slice(0, 14).join(" ") + (words.length > 14 ? "…" : "");
}

function clip(title: string): string {
  return title.length > 120 ? title.slice(0, 117) + "…" : title;
}

/** Une secciones más cortas que `min` palabras con la anterior (o la siguiente, si es la primera). */
function mergeSmall(list: Raw[], min: number): Raw[] {
  const out: Raw[] = [];
  for (const s of list) {
    const prev = out[out.length - 1];
    if (prev && (s.words < min || prev.words === 0)) {
      prev.titles.push(...s.titles);
      prev.end = s.end;
      prev.words += s.words;
    } else {
      out.push({ ...s, titles: [...s.titles] });
    }
  }
  if (out.length > 1 && out[0].words < min) {
    const [first, second, ...rest] = out;
    return [{ start: first.start, end: second.end, titles: [...first.titles, ...second.titles], words: first.words + second.words }, ...rest];
  }
  return out;
}

/** Parte secciones muy largas en tramos de ~CHUNK_WORDS, cortando entre párrafos. */
function splitHuge(list: Raw[], paras: string[]): Raw[] {
  return list.flatMap((s) => {
    if (s.words <= SPLIT_ABOVE_WORDS) return [s];
    const pieces: Raw[] = [];
    let start = s.start;
    let words = 0;
    for (let i = s.start; i < s.end; i++) {
      const w = countWords(paras[i]);
      if (words > 0 && words + w > CHUNK_WORDS && !paras[i].startsWith(NOTE_PREFIX)) {
        pieces.push({ start, end: i, titles: s.titles, words });
        start = i;
        words = 0;
      }
      words += w;
    }
    pieces.push({ start, end: s.end, titles: s.titles, words });
    const base = s.titles.join(" · ");
    return pieces.map((p, n) => ({
      ...p,
      titles: [base ? `${base} (${n + 1}/${pieces.length})` : `Parte ${n + 1} de ${pieces.length}`],
    }));
  });
}

/**
 * Índice de un texto ya extraído, a partir de sus títulos ("# ").
 * Sin títulos: tramos de ~5.000 palabras. Nunca más de 40 secciones.
 */
export function detectTextSections(items: PagedParagraph[], docTitle: string): SectionDraft[] {
  const paras = items.map((p) => p.text);
  let raw: Raw[] = [];
  let cur: Raw | null = null;

  paras.forEach((text, i) => {
    if (text.startsWith(HEADING_PREFIX)) {
      if (cur && cur.words > 0) {
        cur.end = i;
        raw.push(cur);
        cur = null;
      }
      cur ??= { start: i, end: paras.length, titles: [], words: 0 };
      cur.titles.push(text.slice(HEADING_PREFIX.length).trim());
    } else {
      cur ??= { start: i, end: paras.length, titles: [], words: 0 };
      cur.words += countWords(text);
    }
  });
  if (cur) raw.push(cur);

  let min = 250;
  let merged = mergeSmall(raw, min);
  while (merged.length > MAX_SECTIONS) {
    min *= 2;
    merged = mergeSmall(merged, min);
  }
  raw = splitHuge(merged, paras);

  const untitledLabel = raw.length === 1 ? docTitle : "Comienzo";
  return raw.map((s, idx) => {
    const pages = items.slice(s.start, s.end).map((p) => p.page).filter((p): p is number => p != null);
    return {
      idx,
      title: clip(s.titles.join(" · ") || (idx === 0 ? untitledLabel : `Parte ${idx + 1}`)),
      kind: "text" as const,
      para_start: s.start,
      para_end: s.end,
      page_start: pages.length ? Math.min(...pages) : null,
      page_end: pages.length ? Math.max(...pages) : null,
      words: s.words,
      ocr_pages: 0,
      preview: previewOf(paras.slice(s.start, s.end)),
    };
  });
}

/** Textos breves (artículos): hasta estas palabras o páginas escaneadas, una sola pieza. */
export const SHORT_TEXT_WORDS = 15000;
export const SHORT_SCANNED_PAGES = 40;

/** Artículo o texto breve: una sola sección, sin índice que elegir. */
export function singleTextSection(items: PagedParagraph[], title: string): SectionDraft {
  const paras = items.map((p) => p.text);
  const pages = items.map((p) => p.page).filter((p): p is number => p != null);
  return {
    idx: 0,
    title,
    kind: "text",
    para_start: 0,
    para_end: paras.length,
    page_start: pages.length ? Math.min(...pages) : null,
    page_end: pages.length ? Math.max(...pages) : null,
    words: paras.filter((p) => !p.startsWith(HEADING_PREFIX)).reduce((n, p) => n + countWords(p), 0),
    ocr_pages: 0,
    preview: previewOf(paras),
  };
}

/**
 * PDFs con muchas páginas escaneadas: el índice es por bloques de 10 páginas
 * (o un solo bloque si el documento es breve).
 */
export function pageBlockSections(pages: PdfAnalysis["pages"]): SectionDraft[] {
  const out: SectionDraft[] = [];
  const size = pages.length <= SHORT_SCANNED_PAGES ? Math.max(1, pages.length) : PAGE_BLOCK;
  for (let start = 0; start < pages.length; start += size) {
    const block = pages.slice(start, start + size);
    const ocr = block.filter((p) => p.needsOcr).length;
    const textParas = block.flatMap((p) => p.body);
    const heading = textParas.find((p) => p.startsWith(HEADING_PREFIX));
    const range = `Págs. ${start + 1}–${start + block.length}`;
    out.push({
      idx: out.length,
      title: heading ? `${range} · ${clip(heading.slice(HEADING_PREFIX.length))}` : range,
      kind: "pages",
      para_start: null,
      para_end: null,
      page_start: start + 1,
      page_end: start + block.length,
      words: textParas.reduce((n, p) => n + countWords(p), 0) + ocr * WORDS_PER_SCANNED_PAGE,
      ocr_pages: ocr,
      preview: previewOf(textParas),
    });
  }
  return out;
}

/** Posición de lectura de un párrafo: ordena nodos de secciones procesadas en cualquier orden. */
export function positionOf(sectionIdx: number, localParagraph: number): number {
  return sectionIdx * 100000 + localParagraph;
}
