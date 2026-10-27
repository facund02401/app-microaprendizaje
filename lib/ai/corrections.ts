/**
 * Correcciones de errores de lectura (OCR viejo, letras confundidas) propuestas por Claude.
 * Claude nunca devuelve el texto: propone { párrafo, fragmento, reemplazo } y el código
 * lo aplica solo si pasa todas las guardas. Lo aplicado queda marcado ⟦…⟧ (nunca en silencio).
 */

export interface ReadingCorrection {
  /** Número de párrafo dentro de la ventana (1 = primero). */
  paragraph: number;
  found: string;
  replacement: string;
}

export interface CorrectionResult {
  paragraphs: string[];
  applied: number;
  rejected: number;
}

/** Tope por ventana: si Claude marca más, algo anda mal y se descarta el resto. */
const MAX_PER_WINDOW = 40;
const MAX_FOUND_CHARS = 40;
const MAX_FOUND_WORDS = 4;

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Un error de lectura cambia pocas letras; si el cambio es grande, es una reescritura. */
function isSmallEdit(found: string, replacement: string): boolean {
  const a = found.toLowerCase();
  const b = replacement.toLowerCase();
  const limit = Math.max(2, Math.floor(Math.max(a.length, b.length) * 0.4));
  return levenshtein(a, b) <= limit;
}

/** Marca de nota o título: no se tocan (el título del libro lo maneja la ingesta). */
function isEditable(paragraph: string): boolean {
  return !paragraph.startsWith("# ");
}

function occursInsideMark(paragraph: string, index: number): boolean {
  const open = paragraph.lastIndexOf("⟦", index);
  return open !== -1 && paragraph.indexOf("⟧", open) >= index;
}

export function applyCorrections(
  paragraphs: string[],
  corrections: ReadingCorrection[]
): CorrectionResult {
  const out = [...paragraphs];
  let applied = 0;
  let rejected = 0;

  for (const [i, c] of corrections.entries()) {
    if (i >= MAX_PER_WINDOW) {
      rejected += corrections.length - i;
      break;
    }
    const idx = c.paragraph - 1;
    const found = c.found.trim();
    const replacement = c.replacement.trim();
    const para = out[idx];

    const valid =
      para !== undefined &&
      isEditable(para) &&
      found.length > 0 &&
      found.length <= MAX_FOUND_CHARS &&
      found.split(/\s+/).length <= MAX_FOUND_WORDS &&
      replacement.length > 0 &&
      replacement !== found &&
      !/[⟦⟧\[\]]/.test(replacement) &&
      isSmallEdit(found, replacement);

    const first = valid ? para.indexOf(found) : -1;
    // Debe aparecer exactamente una vez: si no, no hay certeza de cuál es.
    if (first === -1 || para.indexOf(found, first + found.length) !== -1 || occursInsideMark(para, first)) {
      rejected++;
      continue;
    }

    out[idx] = para.slice(0, first) + "⟦" + replacement + "⟧" + para.slice(first + found.length);
    applied++;
  }

  return { paragraphs: out, applied, rejected };
}
