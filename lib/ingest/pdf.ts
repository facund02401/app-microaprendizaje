import { extractTextItems, getDocumentProxy, getMeta } from "unpdf";
import {
  HEADING_PREFIX,
  endsSentence,
  hasNoteRef,
  isNoteLabel,
  joinLines,
  makeNote,
  normalizeNoteLabel,
  normalizeSpaces,
  parseNote,
  splitNoteLabel,
} from "./text";

/** Contenido de una página: cuerpo del texto y notas al pie, por separado. */
export interface PageContent {
  body: string[];
  notes: string[];
}

/** Párrafo con la página donde empieza (para mostrar rangos de páginas en el índice). */
export interface PagedParagraph {
  text: string;
  page: number | null;
}

export interface PdfAnalysis {
  pages: (PageContent & { needsOcr: boolean })[];
  title?: string;
  author?: string;
}

interface Item {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

interface Line {
  text: string;
  x: number;
  xEnd: number;
  y: number;
  size: number;
}

/** Menos caracteres que esto = página escaneada (imagen) → se transcribe con IA. */
const MIN_TEXT_CHARS = 80;

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

function buildLines(items: Item[]): Line[] {
  const usable = items.filter((i) => i.str.trim() !== "");
  usable.sort((a, b) => b.y - a.y || a.x - b.x);

  const groups: Item[][] = [];
  for (const item of usable) {
    const g = groups[groups.length - 1];
    const tolerance = Math.max(2, item.fontSize * 0.45);
    if (g && Math.abs(g[0].y - item.y) <= tolerance) g.push(item);
    else groups.push([item]);
  }

  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    let text = "";
    let lastEnd = -Infinity;
    const maxSize = Math.max(...g.map((i) => i.fontSize));
    for (const [k, it] of g.entries()) {
      // Número chico y elevado en medio del renglón = llamada de nota al pie.
      // El primero del renglón no cuenta: es el número de la propia nota.
      const ref = it.str.trim();
      if (k > 0 && text && it.fontSize <= maxSize * 0.8 && isNoteLabel(ref)) {
        text += `[^${normalizeNoteLabel(ref)}]`;
        lastEnd = it.x + it.width;
        continue;
      }
      const gap = it.x - lastEnd;
      if (text && gap > it.fontSize * 0.15 && !text.endsWith(" ") && !it.str.startsWith(" ")) {
        text += " ";
      }
      text += it.str;
      lastEnd = it.x + it.width;
    }
    const sizes = g.map((i) => i.fontSize);
    return {
      text: normalizeSpaces(text),
      x: g[0].x,
      xEnd: lastEnd,
      y: g[0].y,
      size: median(sizes),
    };
  }).filter((l) => l.text);
}

const headerKey = (t: string) => t.toLowerCase().replace(/[\d\s.\-–—|]+/g, " ").trim();
const isPageNumber = (t: string) => /^[\s\-–—.]*([\divxlcdm]{1,6})[\s\-–—.]*$/i.test(t);

/** Quita números de página y encabezados/pies que se repiten en muchas páginas. */
function stripRunningHeads(pages: Line[][]): Line[][] {
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const edges = [lines[0], lines[1], lines[lines.length - 1], lines[lines.length - 2]];
    for (const l of new Set(edges.filter(Boolean))) {
      const k = headerKey(l.text);
      if (k.length >= 3) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, pages.length * 0.2);

  return pages.map((lines) =>
    lines.filter((l, i) => {
      const atEdge = i <= 1 || i >= lines.length - 2;
      if (!atEdge) return true;
      if (isPageNumber(l.text)) return false;
      return (counts.get(headerKey(l.text)) ?? 0) < threshold;
    })
  );
}

function linesToPage(lines: Line[]): PageContent {
  if (!lines.length) return { body: [], notes: [] };

  const bodySize = median(lines.flatMap((l) => Array(Math.min(20, l.text.length)).fill(l.size)));
  const isBodyLine = (l: Line) => Math.abs(l.size - bodySize) <= bodySize * 0.1;
  const bodyLines = lines.filter(isBodyLine);
  const leftMargin = median(bodyLines.map((l) => Math.round(l.x)));
  const rightEdge = percentile(bodyLines.map((l) => l.xEnd), 0.9);
  const gaps: number[] = [];
  for (let i = 1; i < bodyLines.length; i++) {
    const g = bodyLines[i - 1].y - bodyLines[i].y;
    if (g > 0) gaps.push(g);
  }
  const lineGap = median(gaps) || bodySize * 1.3;
  const middleY = median(lines.map((l) => l.y));

  const body: string[] = [];
  const notes: string[] = [];
  let prev: Line | null = null;
  let prevKind: "body" | "note" | "heading" | null = null;

  for (const line of lines) {
    const isNote = line.size < bodySize * 0.88 && line.y < middleY;
    const isHeading =
      !isNote && line.size > bodySize * 1.15 && line.text.length < 120;
    const kind = isNote ? "note" : isHeading ? "heading" : "body";

    if (kind === "heading") {
      if (prevKind === "heading" && prev && prev.y - line.y < line.size * 2) {
        body[body.length - 1] += " " + line.text;
      } else {
        body.push(HEADING_PREFIX + line.text);
      }
    } else if (kind === "note") {
      const split = splitNoteLabel(line.text);
      if (prevKind === "note" && !split.label && notes.length) {
        notes[notes.length - 1] = joinLines(notes[notes.length - 1], line.text);
      } else {
        notes.push(makeNote(split.label, split.text));
      }
    } else {
      let newParagraph = prevKind !== "body" || !prev || !body.length;
      if (!newParagraph && prev) {
        const gap = prev.y - line.y;
        const indented = line.x - leftMargin > bodySize * 0.8 && line.x - leftMargin < bodySize * 8;
        const prevShort = prev.xEnd < rightEdge - bodySize * 3 && endsSentence(prev.text);
        newParagraph = gap > lineGap * 1.45 || indented || prevShort;
      }
      if (newParagraph) body.push(line.text);
      else body[body.length - 1] = joinLines(body[body.length - 1], line.text);
    }

    prev = line;
    prevKind = kind;
  }

  return { body, notes };
}

export async function analyzePdf(buffer: Uint8Array): Promise<PdfAnalysis> {
  const pdf = await getDocumentProxy(buffer);
  const { items } = await extractTextItems(pdf);

  let title: string | undefined;
  let author: string | undefined;
  try {
    const { info } = await getMeta(pdf);
    title = typeof info?.Title === "string" ? normalizeSpaces(info.Title) : undefined;
    author = typeof info?.Author === "string" ? normalizeSpaces(info.Author) : undefined;
  } catch {}

  const rawLines = items.map((pageItems) => buildLines(pageItems as Item[]));
  const needsOcr = rawLines.map(
    (lines) => lines.reduce((n, l) => n + l.text.length, 0) < MIN_TEXT_CHARS
  );
  const cleaned = stripRunningHeads(rawLines);

  return {
    pages: cleaned.map((lines, i) =>
      needsOcr[i]
        ? { body: [], notes: [], needsOcr: true }
        : { ...linesToPage(lines), needsOcr: false }
    ),
    title: title && title.length > 2 && !/^untitled|^microsoft word/i.test(title) ? title : undefined,
    author: author && author.length > 2 ? author : undefined,
  };
}

/**
 * Une las páginas en un solo texto: un párrafo cortado por el cambio de página
 * se reconstruye, y cada nota se ubica justo después del párrafo que la cita
 * (la numeración reinicia por página, así que se empareja dentro de su página).
 * Una nota sin llamada en el texto queda al final de su página.
 */
export function assemblePages(pages: PageContent[], firstPage = 1): PagedParagraph[] {
  const slots: { text: string; page: number | null; notes: PagedParagraph[] }[] = [];
  let lastBodyIndex = -1;

  pages.forEach((page, p) => {
    const pageNumber = firstPage + p;
    const mine: number[] = [];

    page.body.forEach((para, i) => {
      const prev = lastBodyIndex >= 0 ? slots[lastBodyIndex].text : null;
      const continues =
        i === 0 &&
        prev !== null &&
        !prev.startsWith(HEADING_PREFIX) &&
        !para.startsWith(HEADING_PREFIX) &&
        !endsSentence(prev);

      if (continues) {
        slots[lastBodyIndex].text = joinLines(prev, para);
      } else {
        slots.push({ text: para, page: pageNumber, notes: [] });
        lastBodyIndex = slots.length - 1;
      }
      mine.push(lastBodyIndex);
    });

    const taken = new Set<string>();
    for (const note of page.notes) {
      const label = parseNote(note)?.label ?? null;
      const target = label
        ? mine.find((idx) => hasNoteRef(slots[idx].text, label) && !taken.has(`${idx}:${label}`))
        : undefined;
      if (label && target !== undefined) taken.add(`${target}:${label}`);
      const entry = { text: note, page: pageNumber };
      if (target !== undefined) slots[target].notes.push(entry);
      else if (lastBodyIndex >= 0) slots[lastBodyIndex].notes.push(entry);
      else slots.push({ ...entry, notes: [] });
    }
  });

  return slots.flatMap((s) => [{ text: s.text, page: s.page }, ...s.notes]);
}
