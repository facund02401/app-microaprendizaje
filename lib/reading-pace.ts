/**
 * Ritmo de lectura del lector (docs/10 D19). Los tiempos que muestra la app
 * ("⏱ 5 min") se ajustan en silencio a lo que tarda de verdad cada persona:
 * es solo una estimación, no cambia nada del acceso ni se muestra como dato.
 *
 * Módulo puro (sin React ni red) para poder probar las reglas por separado.
 */

import { isNote } from "@/lib/ingest/text";

/** Lectura analítica densa (docs/02): punto de partida y fallback. */
export const DEFAULT_READING_WPM = 80;

/** Límites del ritmo estimado, para que un dato raro no lo lleve a un extremo. */
export const MIN_WPM = 40;
export const MAX_WPM = 200;

/** Una lectura solo cuenta si el ritmo implícito cae en esta franja. */
export const VALID_SAMPLE_WPM = { min: 25, max: 300 };
/** Menos que esto es pasar la vista, aunque el nodo sea corto. */
export const MIN_SAMPLE_SECONDS = 40;
/** Nodos muy cortos (p. ej. el último de un capítulo) dan mediciones ruidosas. */
export const MIN_SAMPLE_WORDS = 100;
/** Sin actividad (scroll, mouse, teclado) durante este lapso, el reloj se pausa. */
export const IDLE_PAUSE_SECONDS = 120;

/** Cuántas lecturas recientes se miran, y cuántas hacen falta para confiar del todo. */
export const RECENT_SAMPLES = 10;
export const TRUSTED_SAMPLES = 5;

export interface PaceSample {
  words: number;
  /** Segundos de lectura activa. */
  seconds: number;
}

export function countWords(paragraphs: string[]): number {
  return paragraphs.filter((p) => !isNote(p)).join(" ").split(/\s+/).filter(Boolean).length;
}

export function sampleWpm(s: PaceSample): number {
  return s.words / (s.seconds / 60);
}

/** ¿Esta lectura refleja lectura real? (Pasar rápido o irse de la pantalla no cuenta.) */
export function isValidSample(s: PaceSample): boolean {
  if (!(s.words >= MIN_SAMPLE_WORDS) || !(s.seconds >= MIN_SAMPLE_SECONDS)) return false;
  const wpm = sampleWpm(s);
  return wpm >= VALID_SAMPLE_WPM.min && wpm <= VALID_SAMPLE_WPM.max;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Ritmo estimado a partir de las lecturas, de la más reciente a la más antigua.
 * Mediana de las últimas válidas; con pocas lecturas pesa más el valor de partida.
 */
export function paceFromSamples(samples: PaceSample[]): number {
  const valid = samples.filter(isValidSample).slice(0, RECENT_SAMPLES);
  if (!valid.length) return DEFAULT_READING_WPM;
  const measured = median(valid.map(sampleWpm));
  const trust = valid.length >= TRUSTED_SAMPLES ? 1 : valid.length / (2 * TRUSTED_SAMPLES);
  const wpm = DEFAULT_READING_WPM + (measured - DEFAULT_READING_WPM) * trust;
  return Math.round(Math.min(MAX_WPM, Math.max(MIN_WPM, wpm)));
}
