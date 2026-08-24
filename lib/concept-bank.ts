import type { SavedConcept } from "@/types";

/**
 * Banco de conceptos personal (v1 estática, docs/01 §4):
 * persiste en localStorage bajo "nodos-concept-bank".
 * Expone un mini-store compatible con useSyncExternalStore para que
 * todos los componentes reaccionen a cambios sin efectos síncronos.
 */

const KEY = "nodos-concept-bank";
const EMPTY: SavedConcept[] = [];

const listeners = new Set<() => void>();
let cache: SavedConcept[] | null = null;

function readStorage(): SavedConcept[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (c): c is Omit<SavedConcept, "status"> &
          Partial<Pick<SavedConcept, "status">> =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as SavedConcept).id === "string" &&
          typeof (c as SavedConcept).term === "string"
      )
      // Migración automática v1.1→v1.2: lo guardado antes de existir
      // estados venía del glosario del nodo y ya tiene definición.
      .map((c) => ({
        ...c,
        status: c.status === "pending" ? ("pending" as const) : ("explained" as const),
      }));
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: SavedConcept[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

/** Snapshot estable para useSyncExternalStore en cliente. */
export function getBankSnapshot(): SavedConcept[] {
  if (!cache) cache = readStorage();
  return cache;
}

/** Snapshot de servidor: vacío hasta hidratar (sin mismatch). */
export function getBankServerSnapshot(): SavedConcept[] {
  return EMPTY;
}

export function subscribeBank(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function emit() {
  cache = readStorage();
  listeners.forEach((l) => l());
}

export function isSaved(conceptId: string, bank?: SavedConcept[]): boolean {
  return (bank ?? getBankSnapshot()).some((c) => c.id === conceptId);
}

/** Guarda sin duplicar; si ya existe, lo quita (toggle). Devuelve el estado final. */
export function toggleSaved(concept: Omit<SavedConcept, "savedAt">): boolean {
  const bank = readStorage();
  if (bank.some((c) => c.id === concept.id)) {
    writeStorage(bank.filter((c) => c.id !== concept.id));
    emit();
    return false;
  }
  writeStorage(
    [{ ...concept, savedAt: Date.now() }, ...bank].sort(
      (a, b) => b.savedAt - a.savedAt
    )
  );
  emit();
  return true;
}

/**
 * Agrega un concepto desde la selección de texto (v1.2).
 * A diferencia de toggleSaved NO quita el existente: si ya está,
 * devuelve false para avisar "ya está en tu banco".
 */
export function saveFromSelection(
  concept: Omit<SavedConcept, "savedAt">
): boolean {
  const bank = readStorage();
  if (bank.some((c) => c.id === concept.id)) return false;
  writeStorage(
    [{ ...concept, savedAt: Date.now() }, ...bank].sort(
      (a, b) => b.savedAt - a.savedAt
    )
  );
  emit();
  return true;
}

export function removeFromBank(conceptId: string) {
  writeStorage(readStorage().filter((c) => c.id !== conceptId));
  emit();
}
