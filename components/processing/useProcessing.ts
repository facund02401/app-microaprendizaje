"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentRow, SectionRow } from "@/types";

interface ApiResult {
  document?: DocumentRow;
  sections?: SectionRow[];
  busy?: boolean;
  message?: string;
  retryAfter?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callApi(
  id: string,
  action: "analyze" | "step" | "queue",
  body?: unknown
): Promise<ApiResult> {
  try {
    const res = await fetch(`/api/documents/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = (await res.json().catch(() => ({}))) as ApiResult;
    if (res.status === 401) return { error: "Tu sesión venció. Volvé a ingresar y retomá desde acá." };
    if (!res.ok && !json.error) {
      // 504 = el servidor cortó por tiempo: el paso se reintenta.
      return { retryAfter: 10, message: "El servidor tardó demasiado; reintentando." };
    }
    return json;
  } catch {
    return { retryAfter: 15, message: "Sin conexión por un momento; reintentando." };
  }
}

export const isActive = (s: SectionRow) => s.status === "queued" || s.status === "processing";

/** Avance de una sección en curso (0–100). */
export function sectionPercent(s: SectionRow): number {
  if (s.status === "done") return 100;
  if (s.kind === "pages" && s.ocr_pages > 0 && s.ocr_done < s.ocr_pages) {
    return Math.round((s.ocr_done / s.ocr_pages) * 60);
  }
  const total = s.kind === "text" ? (s.para_end ?? 0) - (s.para_start ?? 0) : 0;
  const base = s.kind === "pages" && s.ocr_pages > 0 ? 60 : 0;
  if (!total) return base;
  return Math.min(99, base + Math.round((s.cursor / total) * (100 - base)));
}

/** Evita que el celular apague la pantalla mientras se procesa. */
function useWakeLock() {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const wanted = useRef(false);

  useEffect(() => {
    async function onVisible() {
      if (wanted.current && document.visibilityState === "visible" && !sentinel.current) {
        try {
          sentinel.current = await navigator.wakeLock.request("screen");
          sentinel.current.addEventListener("release", () => (sentinel.current = null));
        } catch {}
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return {
    async acquire() {
      wanted.current = true;
      if (!("wakeLock" in navigator) || sentinel.current) return;
      try {
        sentinel.current = await navigator.wakeLock.request("screen");
        sentinel.current.addEventListener("release", () => (sentinel.current = null));
      } catch {}
    },
    release() {
      wanted.current = false;
      sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    },
  };
}

interface RunOptions {
  /** Sección a preparar primero (si está en cola). */
  section?: number;
  /** "section": se detiene al terminar esa sección · "queue": sigue con toda la cola. */
  until: "section" | "queue";
}

/**
 * Estado y acciones del procesamiento de un documento, compartido por la
 * pantalla del documento y el lector (que prepara el siguiente capítulo).
 */
export function useProcessing(
  docId: string,
  initial: { document?: DocumentRow; sections: SectionRow[] },
  onSectionDone?: () => void
) {
  const [doc, setDoc] = useState(initial.document);
  const [sections, setSections] = useState(initial.sections);
  const [running, setRunning] = useState(false);
  const [workingOn, setWorkingOn] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const stopRequested = useRef(false);
  const runningRef = useRef(false);
  const wakeLock = useWakeLock();

  useEffect(() => () => {
    stopRequested.current = true;
  }, []);

  function apply(r: ApiResult) {
    if (r.document) setDoc(r.document);
    if (r.sections) setSections(r.sections);
  }

  async function analyze() {
    setNotice(null);
    const r = await callApi(docId, "analyze");
    apply(r);
    if (r.error) setNotice(r.error);
    return r;
  }

  async function queue(add: number[], remove: number[]) {
    setNotice(null);
    for (let attempt = 0; attempt < 20; attempt++) {
      const r = await callApi(docId, "queue", { add, remove });
      apply(r);
      if (r.error) {
        setNotice(r.error);
        return false;
      }
      if (!r.busy) return true;
      // Otro paso está en curso: la cola se guarda apenas termine.
      await sleep(3000);
    }
    return false;
  }

  async function run({ section, until }: RunOptions) {
    if (runningRef.current) return;
    runningRef.current = true;
    stopRequested.current = false;
    setRunning(true);
    setNotice(null);
    await wakeLock.acquire();

    let target = section ?? null;
    let lastSections = sections;

    while (!stopRequested.current) {
      const r = await callApi(docId, "step", { section: target ?? undefined });
      apply(r);
      if (r.error) {
        setNotice(r.error);
        break;
      }
      const current = r.sections ?? lastSections;
      // Qué sección se trabajó: la pedida o la que quedó en proceso / la que se terminó.
      const worked =
        current.find((s) => s.idx === target) ??
        current.find((s) => s.status === "processing") ??
        current.find((s) => s.status === "done" && lastSections.find((o) => o.idx === s.idx)?.status !== "done");
      if (worked && target === null) target = worked.idx;
      setWorkingOn(target);

      const finished = current.filter(
        (s) => s.status === "done" && lastSections.find((o) => o.idx === s.idx)?.status !== "done"
      );
      lastSections = current;
      if (finished.length) onSectionDone?.();

      const targetDone = target !== null && current.find((s) => s.idx === target)?.status === "done";
      if (targetDone && until === "section") break;
      if (targetDone) target = null;
      if (!current.some(isActive)) break;

      if (r.retryAfter) {
        setNotice(
          r.busy
            ? "Este documento se está procesando en otra pestaña o dispositivo; esperando."
            : `${r.message ?? "Pausa breve."} (en ${r.retryAfter} s)`
        );
        await sleep(r.retryAfter * 1000);
        setNotice(null);
      } else if (r.message) {
        setNotice(r.message);
        break;
      }
    }

    wakeLock.release();
    runningRef.current = false;
    setRunning(false);
    setWorkingOn(null);
  }

  return {
    doc,
    sections,
    running,
    workingOn,
    notice,
    analyze,
    queue,
    run,
    stop: () => {
      stopRequested.current = true;
    },
  };
}
