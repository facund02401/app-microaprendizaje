/**
 * Elaboración dialógica (docs/01 §4.3): guarda por separado la respuesta a
 * la consigna de anclaje y las notas libres de cada nodo. MVP estático:
 * persiste en localStorage bajo "nodos-reflections"; migra a Supabase en
 * Fase 3 junto con el feedback de IA (docs/09 M6).
 *
 * Ambos modos conviven sin pisarse: guardar "notes" no borra "prompt" del
 * mismo nodo, ni viceversa (pedido del dueño, 2026-09-21).
 */

export type ReflectionMode = "prompt" | "notes";

interface StoredEntry {
  text: string;
  savedAt: number;
}

type StoredNode = Partial<Record<ReflectionMode, StoredEntry>>;

const KEY = "nodos-reflections";

function readAll(): Record<string, StoredNode> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as Record<string, StoredNode>) : {};
  } catch {
    return {};
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nodeKey(documentId: string, orderIndex: number): string {
  return `${documentId}:${orderIndex}`;
}

export function getReflection(
  documentId: string,
  orderIndex: number,
  mode: ReflectionMode
): StoredEntry | undefined {
  return readAll()[nodeKey(documentId, orderIndex)]?.[mode];
}

export function saveReflection(
  documentId: string,
  orderIndex: number,
  mode: ReflectionMode,
  text: string
): void {
  const all = readAll();
  const key = nodeKey(documentId, orderIndex);
  all[key] = { ...all[key], [mode]: { text, savedAt: Date.now() } };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
