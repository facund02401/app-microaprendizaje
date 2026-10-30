"use client";

import { useEffect, useRef } from "react";
import { IDLE_PAUSE_SECONDS, countWords, isValidSample, type NodeSample } from "@/lib/reading-pace";
import { createClient } from "@/lib/supabase/client";
import type { ConceptNode } from "@/types";

/**
 * Mide en silencio cuánto tarda el lector en leer cada nodo (docs/10 D19).
 * Cuenta solo tiempo activo (pestaña visible, con movimiento reciente, fuera de
 * la caja de notas) y guarda la lectura únicamente si pasó al nodo siguiente
 * con "siguiente →" o la flecha, sin usar la voz, y el ritmo es creíble.
 * No muestra nada ni cambia la navegación.
 */

interface Clock {
  index: number;
  id: string | null;
  words: number;
  activeMs: number;
  lastTick: number;
  lastActivity: number;
  usedVoice: boolean;
}

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

function isTyping(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === "TEXTAREA" || tag === "INPUT";
}

function startClock(index: number, node: ConceptNode, cloud: boolean): Clock {
  const now = Date.now();
  return {
    index,
    id: cloud && node.key ? node.key : null,
    words: countWords(node.excerptParagraphs),
    activeMs: 0,
    lastTick: now,
    lastActivity: now,
    usedVoice: false,
  };
}

/** Falla en silencio: medir el ritmo nunca debe molestar la lectura. */
function saveSample(documentId: string, c: Clock, onSample: (s: NodeSample) => void) {
  const seconds = Math.round(c.activeMs / 1000);
  if (!c.id || c.usedVoice || !isValidSample({ words: c.words, seconds })) return;
  onSample({ node_id: c.id, words: c.words, seconds });
  void createClient()
    .from("node_reading_times")
    .upsert(
      { document_id: documentId, node_id: c.id, words: c.words, seconds },
      { onConflict: "user_id,node_id", ignoreDuplicates: true }
    )
    .then(
      () => {},
      () => {}
    );
}

export function useReadingTimer(opts: {
  documentId: string;
  cloud: boolean;
  index: number;
  node: ConceptNode;
  /** La voz está leyendo este nodo: el ritmo lo marca la voz, no el lector. */
  speaking: boolean;
  /** Lectura válida recién terminada: permite ajustar los tiempos sin recargar. */
  onSample: (s: NodeSample) => void;
}) {
  const { documentId, cloud, index, node, speaking, onSample } = opts;
  const clock = useRef<Clock | null>(null);
  const nodeRef = useRef(node);
  const voiceRef = useRef(speaking);
  const onSampleRef = useRef(onSample);

  useEffect(() => {
    nodeRef.current = node;
    voiceRef.current = speaking;
    onSampleRef.current = onSample;
    if (speaking && clock.current) clock.current.usedVoice = true;
  });

  // Cambio de nodo: se cierra la lectura anterior (solo si fue al siguiente) y empieza otra.
  useEffect(() => {
    const prev = clock.current;
    if (prev && index === prev.index + 1 && cloud) saveSample(documentId, prev, onSampleRef.current);
    clock.current = startClock(index, nodeRef.current, cloud);
    if (voiceRef.current) clock.current.usedVoice = true;
  }, [index, documentId, cloud]);

  // Reloj: suma tiempo mientras hay actividad reciente y la pestaña está a la vista.
  useEffect(() => {
    if (!cloud) return;
    const touch = () => {
      if (clock.current) clock.current.lastActivity = Date.now();
    };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, touch, { passive: true });
    // El lienzo de lectura es el que scrollea: el evento no sube hasta window.
    window.addEventListener("scroll", touch, { capture: true, passive: true });

    const timer = setInterval(() => {
      const c = clock.current;
      if (!c) return;
      const now = Date.now();
      const delta = Math.min(now - c.lastTick, 2000);
      c.lastTick = now;
      const idle = now - c.lastActivity > IDLE_PAUSE_SECONDS * 1000;
      if (document.visibilityState === "visible" && !idle && !isTyping()) c.activeMs += delta;
    }, 1000);

    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, touch);
      window.removeEventListener("scroll", touch, { capture: true });
      clearInterval(timer);
    };
  }, [cloud]);
}
