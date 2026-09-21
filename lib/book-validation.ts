import type { Book, Chapter, ConceptNode, GlossaryTerm } from "@/types";

/**
 * Validación y normalización de libros generados fuera de la app (modo
 * prueba, TODO.md §7). Sin dependencias y solo sintaxis "borrable" de
 * TypeScript: lo importa también `scripts/check-book.mjs` directo desde Node.
 *
 * Formato del archivo `data/books/<documentId>.json` — es la salida del
 * prompt de ingesta (docs/04 §1) agrupada en capítulos:
 * {
 *   "documentId": "mi-libro", "title": "...", "author": "...",
 *   "chapters": [{
 *     "id": "cap-1", "title": "...",
 *     "nodes": [{ "order_index": 1, "title": "...", "excerpt": "párrafo\n\npárrafo",
 *                 "context_glossary": [{ "term": "...", "definition": "..." }],
 *                 "reflection_prompt": "..." }]
 *   }]
 * }
 */

export interface BookCheck {
  /** Presente solo si no hay errores. */
  book?: Book;
  /** Impiden cargar el libro. */
  errors: string[];
  /** No impiden cargarlo: desvíos de las reglas de producto a revisar. */
  warnings: string[];
}

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function checkBook(raw: unknown, expectedId?: string): BookCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObj(raw)) {
    return { errors: ["El archivo no contiene un objeto JSON."], warnings };
  }

  const documentId = str(raw.documentId);
  if (!ID_RE.test(documentId)) {
    errors.push(
      `documentId "${documentId}" inválido: usar minúsculas, números y guiones (ej. "mi-libro").`
    );
  } else if (expectedId && documentId !== expectedId) {
    errors.push(
      `documentId "${documentId}" no coincide con el nombre del archivo ("${expectedId}").`
    );
  }
  const title = str(raw.title);
  if (!title) errors.push('Falta "title".');
  const author = str(raw.author);
  if (!author) errors.push('Falta "author".');

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    errors.push('"chapters" debe ser una lista con al menos un capítulo.');
    return { errors, warnings };
  }

  const chapters: Chapter[] = [];
  let order = 0;

  raw.chapters.forEach((rc: unknown, ci: number) => {
    const where = `Capítulo ${ci + 1}`;
    if (!isObj(rc)) {
      errors.push(`${where}: no es un objeto.`);
      return;
    }
    const chTitle = str(rc.title);
    if (!chTitle) errors.push(`${where}: falta "title".`);
    if (!Array.isArray(rc.nodes) || rc.nodes.length === 0) {
      errors.push(`${where}: "nodes" debe tener al menos un nodo.`);
      return;
    }

    const nodes: ConceptNode[] = [];
    rc.nodes.forEach((rn: unknown, ni: number) => {
      const label = `${where}, nodo ${ni + 1}`;
      if (!isObj(rn)) {
        errors.push(`${label}: no es un objeto.`);
        return;
      }
      const nTitle = str(rn.title);
      if (!nTitle) errors.push(`${label}: falta "title".`);

      // "excerpt" (salida del prompt) o "excerptParagraphs" (forma de la app).
      let paragraphs: string[] = [];
      if (Array.isArray(rn.excerptParagraphs)) {
        paragraphs = rn.excerptParagraphs.map(str).filter(Boolean);
      } else if (typeof rn.excerpt === "string") {
        paragraphs = rn.excerpt
          .split(/\n\s*\n/)
          .map((p: string) => p.replace(/\s*\n\s*/g, " ").trim())
          .filter(Boolean);
      }
      if (paragraphs.length === 0) {
        errors.push(`${label} ("${nTitle}"): falta "excerpt" con texto.`);
      }
      const words = wordCount(paragraphs.join(" "));
      if (paragraphs.length > 0 && (words < 300 || words > 600)) {
        warnings.push(
          `${label} ("${nTitle}"): ${words} palabras (la regla es 300–600).`
        );
      }

      const glossRaw = rn.context_glossary ?? rn.contextGlossary ?? [];
      const glossary: GlossaryTerm[] = [];
      if (!Array.isArray(glossRaw)) {
        errors.push(`${label}: "context_glossary" debe ser una lista.`);
      } else {
        glossRaw.forEach((g: unknown, gi: number) => {
          const term = isObj(g) ? str(g.term) : "";
          const definition = isObj(g) ? str(g.definition) : "";
          if (!term || !definition) {
            errors.push(
              `${label}, glosario ${gi + 1}: necesita "term" y "definition".`
            );
            return;
          }
          glossary.push({ term, definition });
          const dw = wordCount(definition);
          if (dw < 15 || dw > 35) {
            warnings.push(
              `${label}, "${term}": definición de ${dw} palabras (la regla es 20–30).`
            );
          }
          // El resaltado del glosario busca el término tal cual en el texto.
          if (
            paragraphs.length > 0 &&
            !paragraphs.join(" ").toLowerCase().includes(term.toLowerCase())
          ) {
            warnings.push(
              `${label}: "${term}" no aparece literal en el texto, no se va a resaltar.`
            );
          }
        });
        if (glossary.length > 3) {
          warnings.push(
            `${label}: ${glossary.length} términos de glosario (el máximo es 3).`
          );
        }
      }

      const reflectionPrompt = str(rn.reflection_prompt ?? rn.reflectionPrompt);
      if (!reflectionPrompt) {
        errors.push(`${label}: falta "reflection_prompt".`);
      }

      // Se renumera de corrido: el libro se genera por capítulos y cada
      // corrida empieza en 1, pero el lector espera 1..N sin repetidos.
      order += 1;
      nodes.push({
        orderIndex: order,
        title: nTitle,
        excerptParagraphs: paragraphs,
        contextGlossary: glossary,
        reflectionPrompt,
      });
    });

    chapters.push({
      id: str(rc.id) || `cap-${ci + 1}`,
      title: chTitle,
      nodes,
    });
  });

  if (errors.length > 0) return { errors, warnings };
  return {
    book: { documentId, title, author, chapters },
    errors,
    warnings,
  };
}
