import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Subrayados del lector (docs/10 D17): pasajes marcados con resaltador.
 * Mismo esquema que el banco de conceptos: el dispositivo guarda al instante
 * (localStorage "nodos-highlights", funciona sin conexión) y la cuenta guarda
 * una copia (tabla `highlights`) para otros dispositivos y para exportar.
 *
 * Un subrayado se ancla al párrafo del nodo (`paragraph` = índice en
 * excerptParagraphs) y a posiciones de texto (`start`/`end`) dentro de ese
 * párrafo tal como se ve en pantalla. El texto del autor no cambia, así que la
 * posición es estable; `text` sirve para verificar al dibujar.
 */

export interface Highlight {
  id: string;
  documentId: string;
  /** Identidad del nodo (id en Supabase; en el texto de prueba, su número). */
  nodeKey: string;
  chapterTitle: string;
  nodeIndex: number;
  paragraph: number;
  start: number;
  end: number;
  text: string;
  createdAt: number;
}

/** Tramo de un párrafo (una selección que cruza párrafos da varios). */
export interface HighlightSpan {
  paragraph: number;
  start: number;
  end: number;
  /** Texto completo del párrafo, para unir subrayados que se pisan. */
  paragraphText: string;
}

/** Contexto del nodo donde se subraya. */
export interface HighlightContext {
  documentId: string;
  nodeKey: string;
  chapterTitle: string;
  nodeIndex: number;
}

const KEY = "nodos-highlights";
const DELETED_KEY = "nodos-highlights-deleted";
const EMPTY: Highlight[] = [];

const listeners = new Set<() => void>();
let lastAddedAt = 0;

/** Verdadero justo después de subrayar: un toque "fantasma" no debe abrir "Quitar". */
export function justAdded(): boolean {
  return Date.now() - lastAddedAt < 600;
}
let cache: Highlight[] | null = null;

function isHighlight(h: unknown): h is Highlight {
  if (typeof h !== "object" || h === null) return false;
  const x = h as Highlight;
  return (
    typeof x.id === "string" &&
    typeof x.documentId === "string" &&
    typeof x.nodeKey === "string" &&
    typeof x.paragraph === "number" &&
    typeof x.start === "number" &&
    typeof x.end === "number" &&
    typeof x.text === "string"
  );
}

function readStorage(): Highlight[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isHighlight) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: Highlight[]) {
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

function markDeleted(ids: string[]) {
  if (!ids.length) return;
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...readDeleted(), ...ids])]));
  } catch {}
}

function emit() {
  cache = readStorage();
  listeners.forEach((l) => l());
}

export function getHighlightsSnapshot(): Highlight[] {
  if (!cache) cache = readStorage();
  return cache;
}

export function getHighlightsServerSnapshot(): Highlight[] {
  return EMPTY;
}

export function subscribeHighlights(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * Agrega subrayados. Si uno se pisa o toca con otro del mismo párrafo, se unen
 * en un solo tramo (así nunca hay dos marcas superpuestas ni duplicadas).
 */
export function addHighlights(ctx: HighlightContext, spans: HighlightSpan[]) {
  let items = readStorage();
  const removed: string[] = [];
  const now = Date.now();

  spans.forEach((span, i) => {
    let { start, end } = span;
    const overlapping = items.filter(
      (h) =>
        h.documentId === ctx.documentId &&
        h.nodeKey === ctx.nodeKey &&
        h.paragraph === span.paragraph &&
        h.start <= end &&
        h.end >= start
    );
    for (const h of overlapping) {
      start = Math.min(start, h.start);
      end = Math.max(end, h.end);
      removed.push(h.id);
    }
    const dropped = new Set(overlapping.map((h) => h.id));
    items = items.filter((h) => !dropped.has(h.id));
    items.push({
      id: crypto.randomUUID(),
      ...ctx,
      paragraph: span.paragraph,
      start,
      end,
      text: span.paragraphText.slice(start, end),
      createdAt: now + i,
    });
  });

  lastAddedAt = Date.now();
  markDeleted(removed);
  writeStorage(items);
  emit();
}

export function removeHighlight(id: string) {
  markDeleted([id]);
  writeStorage(readStorage().filter((h) => h.id !== id));
  emit();
}

/** Borra los subrayados de un documento eliminado de la biblioteca (dispositivo y cuenta). */
export async function purgeDocumentHighlights(documentId: string) {
  writeStorage(readStorage().filter((h) => h.documentId !== documentId));
  emit();
  if (!supabaseConfigured) return;
  try {
    await createClient().from("highlights").delete().eq("document_id", documentId);
  } catch {}
}

// ── Sincronización con la cuenta (Supabase) ─────────────────────────

interface RemoteHighlight {
  id: string;
  document_id: string;
  node_id: string;
  chapter_title: string;
  node_index: number;
  paragraph: number;
  start_pos: number;
  end_pos: number;
  text: string;
  created_at: number;
}

const toRemote = (h: Highlight): RemoteHighlight => ({
  id: h.id,
  document_id: h.documentId,
  node_id: h.nodeKey,
  chapter_title: h.chapterTitle,
  node_index: h.nodeIndex,
  paragraph: h.paragraph,
  start_pos: h.start,
  end_pos: h.end,
  text: h.text,
  created_at: h.createdAt,
});

const fromRemote = (r: RemoteHighlight): Highlight => ({
  id: r.id,
  documentId: r.document_id,
  nodeKey: r.node_id,
  chapterTitle: r.chapter_title,
  nodeIndex: r.node_index,
  paragraph: r.paragraph,
  start: r.start_pos,
  end: r.end_pos,
  text: r.text,
  createdAt: Number(r.created_at),
});

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;

function scheduleSync() {
  if (typeof window === "undefined" || !supabaseConfigured) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncHighlights(), 1500);
}

/**
 * Une los subrayados del dispositivo con los de la cuenta: sube lo local, baja
 * lo hecho en otro dispositivo y aplica los borrados pendientes. Sin sesión o
 * sin conexión no hace nada (se reintenta en el próximo cambio o apertura).
 */
export function syncHighlights(): Promise<void> {
  if (typeof window === "undefined" || !supabaseConfigured) return Promise.resolve();
  syncing ??= (async () => {
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const deleted = readDeleted();
      if (deleted.length) {
        const { error } = await supabase.from("highlights").delete().in("id", deleted);
        if (!error) localStorage.setItem(DELETED_KEY, "[]");
      }

      const local = readStorage();
      if (local.length) {
        await supabase.from("highlights").upsert(local.map(toRemote));
      }

      const { data } = await supabase.from("highlights").select("*");
      const remote = ((data ?? []) as RemoteHighlight[]).map(fromRemote);
      const localIds = new Set(local.map((h) => h.id));
      const pendingDeletes = new Set(readDeleted());
      const incoming = remote.filter((h) => !localIds.has(h.id) && !pendingDeletes.has(h.id));
      if (incoming.length) {
        localStorage.setItem(KEY, JSON.stringify([...local, ...incoming]));
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
