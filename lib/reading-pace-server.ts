import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_READING_WPM, RECENT_SAMPLES, paceFromSamples, type NodeSample } from "@/lib/reading-pace";

/** Últimas lecturas del lector, de la más reciente a la más antigua; nunca falla. */
export async function loadReadingSamples(sb: SupabaseClient): Promise<NodeSample[]> {
  try {
    // Se piden de más: algunas se descartan al revalidarlas con los umbrales actuales.
    const { data } = await sb
      .from("node_reading_times")
      .select("node_id, words, seconds")
      .order("created_at", { ascending: false })
      .limit(RECENT_SAMPLES * 3);
    return (data ?? []) as NodeSample[];
  } catch {
    return [];
  }
}

/** Ritmo del lector (palabras por minuto) según sus últimas lecturas; nunca falla. */
export async function loadReadingWpm(sb: SupabaseClient): Promise<number> {
  const samples = await loadReadingSamples(sb);
  return samples.length ? paceFromSamples(samples) : DEFAULT_READING_WPM;
}
