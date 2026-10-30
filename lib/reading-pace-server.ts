import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_READING_WPM, RECENT_SAMPLES, paceFromSamples } from "@/lib/reading-pace";

/** Ritmo del lector (palabras por minuto) según sus últimas lecturas; nunca falla. */
export async function loadReadingWpm(sb: SupabaseClient): Promise<number> {
  try {
    // Se piden de más: algunas se descartan al revalidarlas con los umbrales actuales.
    const { data } = await sb
      .from("node_reading_times")
      .select("words, seconds")
      .order("created_at", { ascending: false })
      .limit(RECENT_SAMPLES * 3);
    return paceFromSamples((data ?? []) as { words: number; seconds: number }[]);
  } catch {
    return DEFAULT_READING_WPM;
  }
}
