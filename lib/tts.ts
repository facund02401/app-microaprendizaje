/**
 * Lectura en voz alta (docs/10 D18): usa la voz del navegador (`speechSynthesis`),
 * sin servidor, sin claves y sin costo. Estas funciones son puras: arman qué se
 * lee y con qué voz; la reproducción vive en `components/reader/ReadAloud.tsx`.
 */
import { HEADING_PREFIX, NOTE_PREFIX } from "@/lib/ingest/text";
import type { ConceptNode } from "@/types";

export const TTS_RATES = [0.8, 1, 1.2, 1.5] as const;
export const DEFAULT_TTS_RATE = 1;
export const TTS_RATE_KEY = "nodos-tts-rate";
export const TTS_VOICE_KEY = "nodos-tts-voice";

/** Un trozo corto de texto; `paragraph` es el índice a resaltar (null = título). */
export interface SpeechChunk {
  paragraph: number | null;
  text: string;
}

// Chrome corta los textos largos (~15 s): se lee por frases de hasta este largo.
const MAX_CHUNK_CHARS = 220;

/** Quita las marcas de escaneo: ⟦reconstruido⟧ se lee sin corchetes, [ilegible] se omite. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\[ilegible\]/g, " ")
    .replace(/[⟦⟧]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parte un párrafo en frases; las frases muy largas se cortan en comas o espacios. */
export function splitIntoChunks(text: string, max = MAX_CHUNK_CHARS): string[] {
  const sentences = text.match(/[^.!?…;:]+[.!?…;:]*["»”')\]]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    let rest = raw.trim();
    while (rest.length > max) {
      let cut = rest.lastIndexOf(",", max);
      if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
      if (cut <= 0) cut = max;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** Lo que se lee de un nodo: título y párrafos; las notas al pie se omiten. */
export function buildSpeechChunks(node: Pick<ConceptNode, "title" | "excerptParagraphs">): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  const title = cleanForSpeech(node.title);
  if (title) chunks.push({ paragraph: null, text: `${title}.` });

  node.excerptParagraphs.forEach((paragraph, index) => {
    if (paragraph.startsWith(NOTE_PREFIX)) return;
    const body = paragraph.startsWith(HEADING_PREFIX)
      ? paragraph.slice(HEADING_PREFIX.length)
      : paragraph;
    const clean = cleanForSpeech(body);
    if (!clean) return;
    for (const text of splitIntoChunks(clean)) chunks.push({ paragraph: index, text });
  });
  return chunks;
}

/** Orden de preferencia de región: la del lector primero, luego las más cercanas. */
const REGION_ORDER = ["es-ar", "es-uy", "es-mx", "es-es", "es-us"];

function voiceScore(v: Pick<SpeechSynthesisVoice, "lang" | "name" | "localService">): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  const region = REGION_ORDER.indexOf(lang);
  let score = region >= 0 ? 20 - region : lang.startsWith("es") ? 5 : 0;
  // Voces "naturales"/neuronales suenan mejor que las básicas.
  if (/natural|neural|online|google|premium|enhanced/i.test(v.name)) score += 30;
  return score;
}

/** Voces en español, de mejor a peor. */
export function spanishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("es"))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

/** Voz elegida por el lector si sigue disponible; si no, la mejor en español. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  savedUri: string | null
): SpeechSynthesisVoice | null {
  const spanish = spanishVoices(voices);
  return spanish.find((v) => v.voiceURI === savedUri) ?? spanish[0] ?? null;
}
