"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ConceptNode, NodeResponse } from "@/types";

type Mode = "answer" | "note";
type SaveState = "idle" | "saving" | "saved" | "offline";

interface Props {
  node: ConceptNode;
  documentId: string;
  /** Libros subidos guardan en la cuenta; el texto de prueba, solo en el dispositivo. */
  cloud: boolean;
  initial: NodeResponse;
  onSaved: (value: NodeResponse) => void;
}

const draftKey = (documentId: string, nodeKey: string) => `nodos-draft-${documentId}-${nodeKey}`;

function readDraft(key: string): NodeResponse | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<NodeResponse>;
    return { answer: String(v.answer ?? ""), note: String(v.note ?? "") };
  } catch {
    return null;
  }
}

/**
 * Caja de elaboración (docs/01 §4.3): respuesta a la pregunta de anclaje y,
 * con el conmutador, notas libres del nodo. Se guarda sola mientras se escribe;
 * queda una copia en el dispositivo hasta que la cuenta confirma (sin conexión
 * no se pierde nada).
 */
export function ReflectionBox({ node, documentId, cloud, initial, onSaved }: Props) {
  const nodeId = node.key ?? String(node.orderIndex);
  const key = draftKey(documentId, nodeId);
  const [mode, setMode] = useState<Mode>("answer");
  const [value, setValue] = useState<NodeResponse>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);

  async function persist(next: NodeResponse) {
    if (!cloud) {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      onSaved(next);
      setState("saved");
      return;
    }
    setState("saving");
    let failed = false;
    try {
      const { error } = await createClient().from("node_responses").upsert({
        document_id: documentId,
        node_id: nodeId,
        answer: next.answer,
        note: next.note,
        updated_at: new Date().toISOString(),
      });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
    if (failed) {
      setState("offline");
      return;
    }
    if (latest.current === next) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    onSaved(next);
    setState("saved");
  }

  // Al abrir el nodo: si quedó un borrador sin subir (p. ej. sin conexión), se recupera y se sube.
  useEffect(() => {
    const t = setTimeout(() => {
      const draft = readDraft(key);
      if (draft && (draft.answer !== initial.answer || draft.note !== initial.note)) {
        latest.current = draft;
        setValue(draft);
        void persist(draft);
      }
    }, 0);
    return () => clearTimeout(t);
    // Solo al abrir el nodo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Al salir del nodo, se guarda lo pendiente.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void persist(latest.current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function change(text: string) {
    const next = { ...latest.current, [mode]: text };
    latest.current = next;
    setValue(next);
    setState("idle");
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void persist(next);
    }, 1200);
  }

  const text = value[mode];
  const status =
    state === "saving"
      ? "Guardando…"
      : state === "saved"
        ? cloud
          ? "Guardado en tu cuenta ✓"
          : "Guardado en este dispositivo ✓"
        : state === "offline"
          ? "Sin conexión: quedó en este dispositivo y se sube después."
          : " ";

  return (
    <section
      aria-label="Elaboración dialógica"
      className="mx-auto mt-14 max-w-[42rem] border-t border-border pt-8"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-sans text-[13px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Tu articulación
        </h3>
        <div role="tablist" aria-label="Qué escribir" className="flex gap-1 rounded-md bg-muted p-1">
          {(
            [
              ["answer", "Respuesta"],
              ["note", "Nota"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "relative min-h-9 rounded-sm px-3 font-sans text-[13px] focus-visible:outline-2 focus-visible:outline-ring/60",
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {value[m].trim() && mode !== m && (
                <span aria-label="(tiene texto)" className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
              )}
            </button>
          ))}
        </div>
      </div>

      {mode === "answer" ? (
        <p className="mb-5 font-serif text-[length:var(--reading-fs,19px)] leading-[1.7]">
          {node.reflectionPrompt}
        </p>
      ) : (
        <p className="mb-5 font-sans text-[14px] leading-relaxed text-muted-foreground">
          Anotaciones libres sobre este nodo: asociaciones, dudas, casos, relaciones con otros textos.
        </p>
      )}

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => change(e.target.value)}
          onBlur={() => {
            if (timer.current) {
              clearTimeout(timer.current);
              timer.current = null;
              void persist(latest.current);
            }
          }}
          placeholder={mode === "answer" ? "Escribí tu reflexión…" : "Escribí tu nota…"}
          rows={6}
          aria-label={mode === "answer" ? "Tu respuesta a la pregunta" : "Tu nota sobre el nodo"}
          className="w-full resize-y rounded-md border border-input bg-editor px-4 py-3 font-serif text-[length:var(--reading-fs,17px)] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          disabled
          title="Dictado por voz (disponible en Fase 3)"
          aria-label="Dictar por voz, aún no disponible"
          className="absolute right-2 bottom-2 text-muted-foreground"
        >
          <Mic />
        </Button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 font-sans text-[13px] text-muted-foreground">
        {status}
      </p>
    </section>
  );
}
