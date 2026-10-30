/**
 * Limpieza de lo que no es del autor y se cuela al extraer: números de página
 * y encabezados/pies repetidos ("Freud · Obras completas", "Capítulo II").
 * Módulo puro (sin red ni servidor); también lo usa el lector como red de
 * seguridad con textos ya preparados (docs/10 D22).
 */

const ROMAN_LOWER = /^(?=[ivxlcdm])m{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/;
const SENTENCE_END = /[.!?:…»"”')\]]$/;

/**
 * ¿Es solo un número de página? Con `loose` también cuenta lo que en el borde
 * de una página casi seguro lo es (romanos en minúscula, "(12)", "12." o años
 * sueltos); sin `loose`, solo formas inequívocas, para usar sobre texto ya armado.
 */
export function isPageNumberText(raw: string, loose = true): boolean {
  const t = raw.replace(/^#\s*/, "").trim();
  if (!t || t.length > 28) return false;
  if (/^(?:p[áa]g(?:ina)?s?\.?|pp?\.|page)\s*\d{1,4}(?:\s*(?:\/|de|of)\s*\d{1,4})?$/i.test(t)) return true;
  if (/^\d{1,4}\s*(?:\/|de|of)\s*\d{1,4}$/i.test(t)) return true;
  if (/^[-–—·•*]+\s*\d{1,4}\s*[-–—·•*]+$/.test(t)) return true;
  if (/^\d{1,3}$/.test(t)) return true;
  if (!loose) return false;
  if (/^(?:\[\d{1,4}\]|\(\d{1,4}\)|\d{1,4}[.)])$/.test(t)) return true;
  if (/^\d{4}$/.test(t)) return Number(t) < 1500 || Number(t) > 2100;
  return t.length <= 8 && ROMAN_LOWER.test(t.replace(/[\s.\-–—]+/g, ""));
}

/**
 * Clave para reconocer un encabezado que se repite: sin mayúsculas ni signos,
 * y sin el número de página pegado al principio o al final. Un "Capítulo 3"
 * suelto conserva su número (si no, todos los capítulos parecerían el mismo).
 */
export function runningKey(text: string): string {
  const t = text
    .replace(/^#\s*/, "")
    .toLowerCase()
    .replace(/[|·•–—\-.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = t.replace(/^(?:\d{1,4}\s+)+/, "").replace(/(?:\s+\d{1,4})+$/, "");
  return stripped.split(" ").length >= 2 ? stripped : t;
}

const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;
const letterCount = (t: string) => (t.match(/\p{L}/gu) ?? []).length;

/** ¿Puede ser un encabezado de página? Corto, con letras y sin ser un número. */
function looksLikeRunningHead(text: string): boolean {
  const key = runningKey(text);
  return letterCount(key) >= 4 && wordCount(key) <= 14 && !isPageNumberText(text);
}

/** Párrafo que es solo un número de página (el lector lo oculta aunque ya esté guardado). */
export function isStrayPageNumber(paragraph: string): boolean {
  return isPageNumberText(paragraph, false);
}

/**
 * Quita de cada página los números de página y los encabezados o pies que se
 * repiten en varias páginas (se miran los 2 primeros y los 2 últimos párrafos
 * del cuerpo). Sirve igual para texto de PDF y para lo transcripto con IA.
 */
export function stripRunningFromPages<T extends { body: string[] }>(pages: T[]): T[] {
  const seen = new Map<string, number>();
  const edgeIndexes = (n: number) => [...new Set([0, 1, n - 2, n - 1])].filter((i) => i >= 0 && i < n);

  for (const page of pages) {
    const keys = new Set<string>();
    for (const i of edgeIndexes(page.body.length)) {
      const p = page.body[i];
      if (looksLikeRunningHead(p)) keys.add(runningKey(p));
    }
    for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  }

  // Una sola palabra repetida (el apellido del autor) exige más páginas que un título entero.
  const base = Math.max(3, Math.ceil(pages.length * 0.15));
  const isRepeated = (p: string) => {
    if (!looksLikeRunningHead(p)) return false;
    const key = runningKey(p);
    return (seen.get(key) ?? 0) >= (wordCount(key) >= 2 ? base : Math.max(base, Math.ceil(pages.length * 0.35)));
  };

  return pages.map((page) => {
    const edges = new Set(edgeIndexes(page.body.length));
    const body = page.body.filter(
      (p, i) => !(edges.has(i) && (isPageNumberText(p) || isRepeated(p)))
    );
    return body.length === page.body.length ? page : { ...page, body };
  });
}

/**
 * Para textos sin páginas (Word, EPUB, .txt): quita los párrafos que son solo
 * un número de página y los renglones cortos que se repiten textuales muchas
 * veces (encabezados copiados al pasar de página).
 */
export function cleanFlatParagraphs(paragraphs: string[]): string[] {
  const counts = new Map<string, number>();
  const candidate = (p: string) =>
    !p.startsWith("# ") &&
    !p.startsWith("[nota") &&
    wordCount(p) >= 2 &&
    wordCount(p) <= 12 &&
    letterCount(p) >= 10 &&
    !SENTENCE_END.test(p.trim());
  for (const p of paragraphs) {
    if (candidate(p)) counts.set(runningKey(p), (counts.get(runningKey(p)) ?? 0) + 1);
  }
  return paragraphs.filter(
    (p) => !isStrayPageNumber(p) && !(candidate(p) && (counts.get(runningKey(p)) ?? 0) >= 4)
  );
}

/** Igual que `cleanFlatParagraphs`, pero sobre los renglones de un .txt (antes de armar párrafos). */
export function cleanTextLines(lines: string[]): string[] {
  const counts = new Map<string, number>();
  const candidate = (l: string) =>
    wordCount(l) >= 2 && wordCount(l) <= 12 && letterCount(l) >= 10 && !SENTENCE_END.test(l.trim());
  for (const l of lines) {
    const t = l.trim();
    if (candidate(t)) counts.set(runningKey(t), (counts.get(runningKey(t)) ?? 0) + 1);
  }
  return lines.filter((l, i) => {
    const t = l.trim();
    if (!t) return true;
    if (isPageNumberText(t)) {
      // Un número solo en su renglón puede ser parte de la frase ("hasta el / 20 / de mayo"):
      // se quita únicamente si viene tras un punto o un renglón en blanco, o antes de uno.
      const bare = /^[\sivxlcdm\d.()[\]]+$/.test(t);
      const prev = (lines[i - 1] ?? "").trim();
      const next = (lines[i + 1] ?? "").trim();
      const drop = !bare || !prev || !next || SENTENCE_END.test(prev);
      return !drop;
    }
    return !(candidate(t) && (counts.get(runningKey(t)) ?? 0) >= 4);
  });
}
