/**
 * Utilidades de texto compartidas por todos los formatos.
 * Convención de párrafos:
 *  - "# Título"      → título/encabezado del libro (se muestra como subtítulo)
 *  - "[nota 3] texto" → nota al pie con su número (o "*"); "[nota] texto" si no se supo
 *  - "[^3]"           → llamada a la nota 3 dentro de un párrafo (el número del autor)
 *  - resto            → párrafo del autor, intacto
 * Cada nota va justo después del párrafo que la cita; el lector la abre al
 * tocar el número (docs/10 D21).
 */

export const HEADING_PREFIX = "# ";
export const NOTE_PREFIX = "[nota] ";

const NOTE_LABEL = String.raw`\d{1,3}|\*{1,3}`;
const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Expresión de una llamada de nota dentro del texto: `[^3]`, `[^*]`. */
export const NOTE_REF_SOURCE = String.raw`\[\^(?:${NOTE_LABEL})\]`;

/** "¹" → "1"; "[2]" → "2"; "***" queda igual. */
export function normalizeNoteLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^\[|\]$/g, "")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUPERSCRIPTS.indexOf(c)));
}

export function isNoteLabel(raw: string): boolean {
  return new RegExp(`^(?:${NOTE_LABEL}|[${SUPERSCRIPTS}]+)$`).test(normalizeNoteLabel(raw));
}

export function makeNote(label: string | null, text: string): string {
  return label ? `[nota ${label}] ${text}` : NOTE_PREFIX + text;
}

export function isNote(paragraph: string): boolean {
  return paragraph.startsWith(NOTE_PREFIX) || /^\[nota (?:\d{1,3}|\*{1,3})\] /.test(paragraph);
}

/** Una nota ya armada → su número y su texto (null si el párrafo no es una nota). */
export function parseNote(paragraph: string): { label: string | null; text: string } | null {
  if (paragraph.startsWith(NOTE_PREFIX)) return { label: null, text: paragraph.slice(NOTE_PREFIX.length) };
  const m = paragraph.match(/^\[nota (\d{1,3}|\*{1,3})\] ([\s\S]*)$/);
  return m ? { label: m[1], text: m[2] } : null;
}

/** Texto crudo de una nota ("1 Ver Freud…", "¹ …", "[^1] …") → número y texto. */
export function splitNoteLabel(raw: string): { label: string | null; text: string } {
  const m = raw.match(
    new RegExp(
      `^(?:\\[\\^(${NOTE_LABEL})\\]|(${NOTE_LABEL}|[${SUPERSCRIPTS}]+))(?:[\\s.)\\]]+|(?=[A-ZÁÉÍÓÚÑ¿¡"«]))([\\s\\S]*)$`
    )
  );
  if (!m || !m[3].trim()) return { label: null, text: raw };
  return { label: normalizeNoteLabel(m[1] ?? m[2]), text: m[3].trim() };
}

/** Nota cruda → párrafo con la convención. */
export function noteFromRaw(raw: string): string {
  const { label, text } = splitNoteLabel(raw);
  return makeNote(label, text);
}

/** Etiquetas de las llamadas `[^n]` que tiene un párrafo, en orden. */
export function noteRefs(paragraph: string): string[] {
  return [...paragraph.matchAll(/\[\^(\d{1,3}|\*{1,3})\]/g)].map((m) => m[1]);
}

export function hasNoteRef(paragraph: string, label: string): boolean {
  return paragraph.includes(`[^${label}]`);
}

/** Texto sin las llamadas de nota (para leer en voz alta o citar). */
export function stripNoteRefs(text: string): string {
  return text.replace(new RegExp(NOTE_REF_SOURCE, "g"), "");
}

/**
 * Acomoda cada nota con número justo después del párrafo que la cita
 * (para textos donde las notas vienen juntas, p. ej. al final). Cada llamada
 * se empareja con una sola nota, en orden; la nota sin pareja queda donde estaba.
 */
export function placeNotes(paragraphs: string[]): string[] {
  const slots: { text: string; notes: string[] }[] = [];
  const free = new Map<string, number[]>();
  for (const p of paragraphs) {
    const note = parseNote(p);
    if (note?.label) {
      const idx = free.get(note.label)?.shift();
      if (idx !== undefined) {
        slots[idx].notes.push(p);
        continue;
      }
    }
    slots.push({ text: p, notes: [] });
    if (!note) {
      for (const label of noteRefs(p)) free.set(label, [...(free.get(label) ?? []), slots.length - 1]);
    }
  }
  return slots.flatMap((s) => [s.text, ...s.notes]);
}

const MAX_PARAGRAPH_WORDS = 450;
const SPLIT_TARGET_WORDS = 250;

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function normalizeSpaces(text: string): string {
  return text
    .replace(/­/g, "")
    .replace(/[  -​]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Une dos renglones deshaciendo el guion de corte ("repre-" + "sión"). */
export function joinLines(prev: string, next: string): string {
  if (/[A-Za-zÀ-ÿ]-$/.test(prev) && /^[a-záéíóúüñ]/.test(next)) {
    return prev.slice(0, -1) + next;
  }
  return prev + " " + next;
}

export function endsSentence(text: string): boolean {
  return /[.!?:…»"”')\]]$/.test(text.trim());
}

/** Texto plano (.txt): párrafos separados por línea en blanco. */
export function plainTextToParagraphs(raw: string): string[] {
  const text = raw.replace(/\r\n?/g, "\n");
  const blocks = text.split(/\n\s*\n/);
  // Archivos sin líneas en blanco: cada renglón es un párrafo.
  const source = blocks.length > 1 ? blocks : text.split("\n");
  return source
    .map((b) =>
      b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .reduce((acc, line) => (acc ? joinLines(acc, line) : line), "")
    )
    .map(normalizeSpaces)
    .filter(Boolean);
}

/**
 * Parte párrafos gigantes (típico cuando el PDF no marca bien los párrafos)
 * en oraciones completas; no altera el texto, solo dónde se corta la línea.
 */
export function splitLongParagraphs(paragraphs: string[]): string[] {
  const out: string[] = [];
  for (const p of paragraphs) {
    if (p.startsWith(HEADING_PREFIX) || countWords(p) <= MAX_PARAGRAPH_WORDS) {
      out.push(p);
      continue;
    }
    const note = parseNote(p);
    const body = note ? note.text : p;
    const prefix = note ? p.slice(0, p.length - body.length) : "";
    const sentences = body.match(/[^.!?…]+(?:[.!?…]+["»”')\]]*\s*|$)/g) ?? [body];
    let current = "";
    for (const s of sentences) {
      if (current && countWords(current) + countWords(s) > SPLIT_TARGET_WORDS) {
        out.push(prefix + current.trim());
        current = "";
      }
      current += s;
    }
    if (current.trim()) out.push(prefix + current.trim());
  }
  return out;
}

/** Igual que splitLongParagraphs, conservando la página de cada párrafo. */
export function splitLongPaged<T extends { text: string }>(items: T[]): T[] {
  return items.flatMap((item) =>
    splitLongParagraphs([item.text]).map((text) => ({ ...item, text }))
  );
}

export function totalWords(paragraphs: string[]): number {
  return paragraphs.reduce((n, p) => n + countWords(p), 0);
}

/** Título a partir del nombre de archivo: "freud_pulsiones.pdf" → "Freud pulsiones". */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Documento sin título";
}
