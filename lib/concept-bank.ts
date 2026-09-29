import type { SavedConcept } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Banco de conceptos personal (v1 estática, docs/01 §4):
 * persiste en localStorage bajo "nodos-concept-bank".
 * Expone un mini-store compatible con useSyncExternalStore para que
 * todos los componentes reaccionen a cambios sin efectos síncronos.
 */

const KEY = "nodos-concept-bank";
/** Ids borrados localmente que falta borrar en la cuenta. */
const DELETED_KEY = "nodos-concept-bank-deleted";
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
  scheduleSync();
}

function readDeleted(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DELETED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function markDeleted(id: string) {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...readDeleted(), id])]));
  } catch {}
}

// ── Sincronización con la cuenta (Supabase) ─────────────────────────
// El dispositivo sigue siendo la fuente inmediata (funciona sin conexión);
// la cuenta guarda una copia para otros dispositivos y para exportar.

interface RemoteConcept {
  id: string;
  term: string;
  definition: string;
  status: "explained" | "pending";
  document_id: string | null;
  context_paragraph: string | null;
  source_book_title: string;
  source_chapter_title: string;
  source_node_index: number;
  saved_at: number;
}

const toRemote = (c: SavedConcept): RemoteConcept => ({
  id: c.id,
  term: c.term,
  definition: c.definition,
  status: c.status,
  document_id: c.documentId ?? null,
  context_paragraph: c.contextParagraph ?? null,
  source_book_title: c.sourceBookTitle,
  source_chapter_title: c.sourceChapterTitle,
  source_node_index: c.sourceNodeIndex,
  saved_at: c.savedAt,
});

const fromRemote = (r: RemoteConcept): SavedConcept => ({
  id: r.id,
  term: r.term,
  definition: r.definition,
  status: r.status,
  documentId: r.document_id ?? undefined,
  contextParagraph: r.context_paragraph ?? undefined,
  sourceBookTitle: r.source_book_title,
  sourceChapterTitle: r.source_chapter_title,
  sourceNodeIndex: r.source_node_index,
  savedAt: Number(r.saved_at),
});

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;

function scheduleSync() {
  if (typeof window === "undefined" || !supabaseConfigured) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncBank(), 1500);
}

/**
 * Une el banco del dispositivo con el de la cuenta: sube lo local, baja lo que
 * se guardó en otro dispositivo y aplica los borrados pendientes. Sin sesión o
 * sin conexión no hace nada (se reintenta en el próximo cambio o apertura).
 */
export function syncBank(): Promise<void> {
  if (typeof window === "undefined" || !supabaseConfigured) return Promise.resolve();
  syncing ??= (async () => {
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const deleted = readDeleted();
      if (deleted.length) {
        const { error } = await supabase.from("concept_bank").delete().in("id", deleted);
        if (!error) localStorage.setItem(DELETED_KEY, "[]");
      }

      const local = readStorage();
      if (local.length) {
        await supabase.from("concept_bank").upsert(local.map(toRemote));
      }

      const { data } = await supabase.from("concept_bank").select("*");
      const remote = ((data ?? []) as RemoteConcept[]).map(fromRemote);
      const localIds = new Set(local.map((c) => c.id));
      const pendingDeletes = new Set(readDeleted());
      const incoming = remote.filter((c) => !localIds.has(c.id) && !pendingDeletes.has(c.id));
      if (incoming.length) {
        const merged = [...local, ...incoming].sort((a, b) => b.savedAt - a.savedAt);
        localStorage.setItem(KEY, JSON.stringify(merged));
        emit();
      }
    } catch {
      // Sin conexión: queda para la próxima.
    } finally {
      syncing = null;
    }
  })();
  return syncing;
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
    markDeleted(concept.id);
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
  markDeleted(conceptId);
  writeStorage(readStorage().filter((c) => c.id !== conceptId));
  emit();
}
