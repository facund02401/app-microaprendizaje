/**
 * Palabras sospechosas de error de lectura: las que el diccionario de español no
 * conoce. Lógica pura (sin red ni IA) para poder probarla sola; el diccionario
 * se inyecta (lib/ai/spellcheck.ts lo carga) y Haiku decide después qué corregir.
 */
import { HEADING_PREFIX, isNote } from "@/lib/ingest/text";
import type { ReadingCorrection } from "./corrections";

export interface Speller {
  correct(word: string): boolean;
  suggest(word: string): string[];
}

export interface Suspect {
  /** Número de párrafo dentro de la ventana (1 = primero). */
  paragraph: number;
  word: string;
  /** Posición de la palabra dentro del párrafo. */
  index: number;
  /** Frase alrededor, con la palabra entre « ». */
  context: string;
  suggestions: string[];
}

/** Tope por ventana: más que esto es un texto muy dañado y no vale la pena gastar. */
export const MAX_SUSPECTS = 150;
/** Una palabra que se repite tanto en la ventana suele ser un término del autor, no un error. */
const COMMON_REPEATS = 4;
const MIN_LENGTH = 3;
const CONTEXT_CHARS = 90;

/** Términos de psicoanálisis y de uso técnico que el diccionario general no trae. */
const LEXICON = [
  "psicoanalítico", "psicoanalítica", "psicoanalíticos", "psicoanalíticas", "psicoanalista",
  "metapsicología", "metapsicológico", "metapsicológica", "metapsicológicos",
  "pulsional", "pulsionales", "objetal", "objetales", "transferencial", "transferenciales",
  "contratransferencia", "contratransferencial", "superyó", "superyoico", "superyoica",
  "preconsciente", "preconscientes", "inconsciente", "edípico", "edípica", "edípicos",
  "preedípico", "preedípica", "narcisista", "narcisistas", "sublimatorio", "fantasmático",
  "fantasmática", "fantasmáticos", "libidinal", "libidinales", "pregenital", "pregenitales",
  "intrapsíquico", "intrapsíquica", "intersubjetivo", "intersubjetiva", "intersubjetividad",
  "ligazón", "desligazón", "desmentida", "forclusión", "represor", "sintomático",
  "interpretativo", "interpretativa", "elaborativo", "resignificar", "resignificación",
  "resignificado", "resignifica",
];

const WORD_RE = /[\p{L}]+(?:[-'’][\p{L}]+)*/gu;
/** Letras que no existen en español: señal de que la palabra es de otro idioma. */
const FOREIGN_LETTERS = /[äöß]|[wk]/i;

/** Tapa con espacios lo que no es texto corriente (títulos, marcas), conservando posiciones. */
function maskedBody(paragraph: string): string {
  const blank = (m: string) => " ".repeat(m.length);
  if (paragraph.startsWith(HEADING_PREFIX)) return blank(paragraph);
  const text = isNote(paragraph) ? paragraph.replace(/^\[nota[^\]]*\]\s/, blank) : paragraph;
  return text.replace(/⟦[^⟧]*⟧/g, blank).replace(/\[\^[^\]]*\]/g, blank).replace(/\[ilegible\]/gi, blank);
}

function isUnknown(word: string, speller: Speller): boolean {
  const parts = word.split(/[-'’]/).filter(Boolean);
  if (!parts.length) return false;
  return parts.some((p) => p.length >= MIN_LENGTH && !speller.correct(p) && !speller.correct(p.toLowerCase()));
}

export function findSuspects(
  paragraphs: string[],
  speller: Speller,
  { max = MAX_SUSPECTS }: { max?: number } = {}
): Suspect[] {
  const lexicon = new Set(LEXICON);
  const bodies = paragraphs.map(maskedBody);

  const counts = new Map<string, number>();
  for (const body of bodies) {
    for (const m of body.matchAll(WORD_RE)) {
      const key = m[0].toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const verdicts = new Map<string, boolean>();
  const suspects: Suspect[] = [];

  for (const [p, body] of bodies.entries()) {
    for (const m of body.matchAll(WORD_RE)) {
      const word = m[0];
      const lower = word.toLowerCase();
      if (word.length < MIN_LENGTH) continue;
      // Nombres propios, siglas y términos en otro idioma: no se tocan.
      if (word[0] !== lower[0] || word === word.toUpperCase()) continue;
      if (FOREIGN_LETTERS.test(word) || lexicon.has(lower)) continue;
      if ((counts.get(lower) ?? 0) >= COMMON_REPEATS) continue;

      let unknown = verdicts.get(lower);
      if (unknown === undefined) {
        unknown = isUnknown(word, speller);
        verdicts.set(lower, unknown);
      }
      if (!unknown) continue;

      const index = m.index ?? 0;
      const original = paragraphs[p];
      const from = Math.max(0, index - CONTEXT_CHARS);
      const to = Math.min(original.length, index + word.length + CONTEXT_CHARS);
      suspects.push({
        paragraph: p + 1,
        word,
        index,
        context:
          (from > 0 ? "…" : "") +
          original.slice(from, index) + "«" + word + "»" + original.slice(index + word.length, to) +
          (to < original.length ? "…" : ""),
        suggestions: speller.suggest(word).slice(0, 3),
      });
      if (suspects.length >= max) return suspects;
    }
  }
  return suspects;
}

/**
 * Convierte la decisión de Haiku en una corrección que `applyCorrections` pueda aplicar:
 * el fragmento debe aparecer una sola vez en el párrafo, así que si la palabra se repite
 * se le suman las palabras anteriores hasta que sea única (máximo 4 palabras en total).
 */
export function toCorrection(
  paragraph: string,
  suspect: Suspect,
  replacement: string
): ReadingCorrection | null {
  const clean = replacement.trim();
  if (!clean || clean === suspect.word || clean.split(/\s+/).length > 2) return null;
  if (paragraph.slice(suspect.index, suspect.index + suspect.word.length) !== suspect.word) return null;

  let start = suspect.index;
  for (let extra = 0; extra < 3; extra++) {
    const found = paragraph.slice(start, suspect.index + suspect.word.length);
    if (paragraph.indexOf(found) === paragraph.lastIndexOf(found)) {
      const prefix = paragraph.slice(start, suspect.index);
      return { paragraph: suspect.paragraph, found, replacement: prefix + clean };
    }
    const before = paragraph.slice(0, start).match(/(\S+\s+)$/);
    if (!before) return null;
    start -= before[1].length;
  }
  return null;
}
