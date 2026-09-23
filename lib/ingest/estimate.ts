/** Precios en USD por millón de tokens (entrada, salida). Revisar si cambian. */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};

export const WINDOW_WORDS = 6000;
const TOKENS_PER_WORD = 1.7;
const WORDS_PER_SCANNED_PAGE = 380;

export interface Estimate {
  minUsd: number;
  maxUsd: number;
  minutes: number;
  steps: number;
}

export function estimateProcessing(
  model: string,
  words: number,
  ocrPages: number
): Estimate {
  const [pin, pout] = PRICES[model] ?? PRICES["claude-opus-5"];
  const totalWords = words + ocrPages * WORDS_PER_SCANNED_PAGE;
  const windows = Math.max(1, Math.ceil(totalWords / WINDOW_WORDS));
  const ocrBatches = Math.ceil(ocrPages / 5);

  const segIn = totalWords * TOKENS_PER_WORD * 1.12 + windows * 2500;
  const segOut = (totalWords / 420) * 330 + windows * 2500;
  const ocrIn = ocrPages * 2000;
  const ocrOut = ocrPages * 1100;

  const usd = ((segIn + ocrIn) * pin + (segOut + ocrOut) * pout) / 1_000_000;
  const round = (n: number) => Math.max(0.05, Math.round(n * 20) / 20);

  return {
    minUsd: round(usd * 0.7),
    maxUsd: round(usd * 1.5),
    minutes: Math.max(1, Math.round(windows * 1.5 + ocrBatches * 1.2)),
    steps: windows + ocrBatches,
  };
}

export function formatUsd(n: number): string {
  return n < 1 ? `US$ ${n.toFixed(2)}` : `US$ ${n.toFixed(1)}`;
}
