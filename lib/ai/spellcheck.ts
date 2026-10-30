import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import nspell from "nspell";
import { askText, CONCEPT_MODEL } from "./claude";
import { applyCorrections, type CorrectionResult, type ReadingCorrection } from "./corrections";
import { findSuspects, toCorrection, type Speller, type Suspect } from "./spell-suspects";

/**
 * Revisión por diccionario + modelo chico (docs/10 D23): el diccionario de español
 * (gratis, sin red) marca las palabras que no existen y Haiku decide solo sobre
 * esas frases. El texto nunca lo devuelve la IA: se aplica con las guardas de
 * `applyCorrections` y queda marcado ⟦…⟧.
 */

/** Modelo para decidir las sospechosas. Cambiable con CLAUDE_SPELL_MODEL. */
const SPELL_MODEL = process.env.CLAUDE_SPELL_MODEL?.trim() || CONCEPT_MODEL;
const BATCH = 50;

/** Carpeta del diccionario; next.config.ts la incluye en el despliegue. */
const DICTIONARY_DIR = path.join(process.cwd(), "node_modules", "dictionary-es");

let speller: Speller | null = null;
function getSpeller(): Speller {
  speller ??= nspell(
    readFileSync(path.join(DICTIONARY_DIR, "index.aff")),
    readFileSync(path.join(DICTIONARY_DIR, "index.dic"))
  );
  return speller;
}

export function spellcheckEnabled(): boolean {
  return process.env.CLAUDE_SPELLCHECK?.trim().toLowerCase() !== "off";
}

const SYSTEM = `Revisás errores de lectura (OCR) en textos de psicoanálisis y filosofía en español. Recibís palabras que un diccionario no reconoce, cada una con su frase (la palabra va entre « ») y sugerencias del diccionario.

Para cada una decidí si es un error de lectura CLARO y cuál es la palabra correcta, según el contexto. Reglas:
- Corregí solo letras confundidas (rn/m, l/i, ll/n), letras perdidas o sobrantes, acentos rotos o palabras pegadas ("noproceso" → "no proceso"). El cambio debe ser mínimo.
- NO corrijas: términos en otros idiomas (alemán, francés, latín, inglés), nombres propios, neologismos o términos técnicos del autor, ortografía antigua o regional. Ante la duda, null.
- Las sugerencias del diccionario son pistas, no órdenes: elegí la que encaje con el sentido de la frase o ninguna.

Respondé SOLO con un arreglo JSON, sin texto antes ni después: [{"id": 1, "replacement": "palabra"}, {"id": 2, "replacement": null}, ...]. Una entrada por cada id recibido.`;

function parseDecisions(text: string): Map<number, string> {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  const out = new Map<number, string>();
  if (start === -1 || end <= start) return out;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return out;
    for (const item of parsed) {
      if (
        item && typeof item === "object" &&
        typeof (item as { id?: unknown }).id === "number" &&
        typeof (item as { replacement?: unknown }).replacement === "string"
      ) {
        out.set((item as { id: number }).id, (item as { replacement: string }).replacement);
      }
    }
  } catch {
    // Respuesta mal formada: no se corrige nada de esta tanda.
  }
  return out;
}

async function decide(batch: Suspect[]): Promise<Map<number, string>> {
  const lines = batch.map(
    (s, i) =>
      `${i + 1}. ${s.context}${s.suggestions.length ? `\n   sugerencias: ${s.suggestions.join(", ")}` : ""}`
  );
  const text = await askText({
    model: SPELL_MODEL,
    system: SYSTEM,
    prompt: lines.join("\n\n"),
    maxTokens: 2000,
  });
  return parseDecisions(text);
}

export interface SpellcheckResult extends CorrectionResult {
  suspects: number;
}

/** Revisa los párrafos de una ventana. Si la IA falla, devuelve el texto sin tocar. */
export async function spellcheckWindow(paragraphs: string[]): Promise<SpellcheckResult> {
  const untouched = { paragraphs, applied: 0, rejected: 0, suspects: 0 };
  try {
    const suspects = findSuspects(paragraphs, getSpeller());
    if (!suspects.length) return untouched;

    const batches: Suspect[][] = [];
    for (let i = 0; i < suspects.length; i += BATCH) batches.push(suspects.slice(i, i + BATCH));
    const decisions = await Promise.all(batches.map(decide));

    const corrections: ReadingCorrection[] = [];
    batches.forEach((batch, b) => {
      batch.forEach((suspect, i) => {
        const replacement = decisions[b].get(i + 1);
        if (!replacement) return;
        const c = toCorrection(paragraphs[suspect.paragraph - 1], suspect, replacement);
        if (c) corrections.push(c);
      });
    });

    return { ...applyCorrections(paragraphs, corrections), suspects: suspects.length };
  } catch (err) {
    console.warn("[ingesta] revisión por diccionario omitida:", err instanceof Error ? err.message : err);
    return untouched;
  }
}
