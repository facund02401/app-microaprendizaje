/**
 * Utilidades de texto compartidas por todos los formatos.
 * Convención de párrafos:
 *  - "# Título"      → título/encabezado del libro (se muestra como subtítulo)
 *  - "[nota] texto"  → nota al pie (se muestra en letra menor)
 *  - resto            → párrafo del autor, intacto
 */

export const HEADING_PREFIX = "# ";
export const NOTE_PREFIX = "[nota] ";

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
    const prefix = p.startsWith(NOTE_PREFIX) ? NOTE_PREFIX : "";
    const body = prefix ? p.slice(prefix.length) : p;
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
