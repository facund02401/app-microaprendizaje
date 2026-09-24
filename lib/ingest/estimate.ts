import type { SectionRow } from "@/types";

/** Precios en USD por millón de tokens (entrada, salida). Revisar si cambian. */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};

export const WINDOW_WORDS = 6000;
const TOKENS_PER_WORD = 1.7;
export const WORDS_PER_SCANNED_PAGE = 380;
/** Lectura analítica densa (docs/02), igual que estimatedMinutes en types. */
const READING_WPM = 80;

export interface Estimate {
  usd: number;
  processingMinutes: number;
  readingMinutes: number;
}

/** Costo y tiempos de procesar `words` palabras con texto y `ocrPages` páginas escaneadas. */
export function estimateWork(model: string, words: number, ocrPages: number): Estimate {
  const [pin, pout] = PRICES[model] ?? PRICES["claude-opus-5"];
  const totalWords = words + ocrPages * WORDS_PER_SCANNED_PAGE;
  const windows = Math.max(1, Math.ceil(totalWords / WINDOW_WORDS));
  const ocrBatches = Math.ceil(ocrPages / 5);

  const segIn = totalWords * TOKENS_PER_WORD * 1.12 + windows * 2500;
  const segOut = (totalWords / 420) * 330 + windows * 2500;
  const ocrIn = ocrPages * 2000;
  const ocrOut = ocrPages * 1100;

  return {
    usd: ((segIn + ocrIn) * pin + (segOut + ocrOut) * pout) / 1_000_000,
    processingMinutes: windows * 1.5 + ocrBatches * 1.2,
    readingMinutes: totalWords / READING_WPM,
  };
}

/** Estimación de una sección del índice (0 si ya está procesada). */
export function estimateSection(model: string, s: SectionRow): Estimate {
  if (s.status === "done") return { usd: 0, processingMinutes: 0, readingMinutes: s.words / READING_WPM };
  const pending = Math.max(0, s.ocr_pages - s.ocr_done);
  const textWords = s.kind === "pages" ? Math.max(0, s.words - s.ocr_pages * WORDS_PER_SCANNED_PAGE) : s.words;
  return estimateWork(model, textWords, pending);
}

export function sumEstimates(list: Estimate[]): Estimate {
  return list.reduce(
    (a, e) => ({
      usd: a.usd + e.usd,
      processingMinutes: a.processingMinutes + e.processingMinutes,
      readingMinutes: a.readingMinutes + e.readingMinutes,
    }),
    { usd: 0, processingMinutes: 0, readingMinutes: 0 }
  );
}

function amount(n: number): string {
  if (n < 1) return Math.max(0.01, n).toFixed(2);
  return n.toFixed(1);
}

/** Rango honesto: la estimación real varía según el texto. */
export function formatCostRange(usd: number): string {
  if (usd <= 0) return "sin costo";
  return `US$ ${amount(usd * 0.7)}–${amount(usd * 1.5)}`;
}

export function formatMinutes(min: number): string {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = Math.round((m % 60) / 5) * 5;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
