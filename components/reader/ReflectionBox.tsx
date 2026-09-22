"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mic } from "lucide-react";
import {
  getReflection,
  saveReflection,
  type ReflectionMode,
} from "@/lib/reflections";
import type { ConceptNode } from "@/types";

interface Props {
  node: ConceptNode;
  documentId: string;
}

const NOTES_INTRO =
  "Espacio libre para anotar lo que te haya resonado de este fragmento, sin consigna: una idea, una asociación, una duda.";

/**
 * Caja de reflexión (docs/01 §4.3). Switch (pedido del dueño, 2026-09-21):
 * elegir entre responder la consigna de anclaje o escribir notas libres
 * sobre el nodo que se acaba de leer. Los dos modos se guardan por separado
 * y no se pisan entre sí (ver lib/reflections.ts); persisten en localStorage
 * hasta que Fase 3 conecte el feedback de IA (docs/09 M6).
 */
export function ReflectionBox({ node, documentId }: Props) {
  const [mode, setMode] = useState<ReflectionMode>("prompt");
  const [promptValue, setPromptValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [savedMode, setSavedMode] = useState<ReflectionMode | null>(null);

  // ReaderView monta este componente con key={documentId+orderIndex}: cada
  // nodo es una instancia nueva, así que el estado no se arrastra de un nodo
  // al siguiente. Solo falta cargar lo ya guardado, diferido al siguiente
  // tick porque localStorage no existe en el servidor.
  useEffect(() => {
    const id = setTimeout(() => {
      setPromptValue(getReflection(documentId, node.orderIndex, "prompt")?.text ?? "");
      setNotesValue(getReflection(documentId, node.orderIndex, "notes")?.text ?? "");
    }, 0);
    return () => clearTimeout(id);
  }, [documentId, node.orderIndex]);

  const value = mode === "prompt" ? promptValue : notesValue;
  const setValue = mode === "prompt" ? setPromptValue : setNotesValue;

  function handleSave() {
    saveReflection(documentId, node.orderIndex, mode, value);
    setSavedMode(mode);
  }

  return (
    <section
      aria-label="Elaboración dialógica"
      className="max-w-[65ch] mx-auto mt-14 pt-8 border-t border-border"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="font-sans text-[13px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
          Tu articulación
        </h3>
        {/* Llave de luz: toda la fila es el área táctil (≥40px), no solo el switch. */}
        <label
          htmlFor="reflection-mode"
          className="flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-md px-1 font-sans text-[12px]"
        >
          <span className={mode === "prompt" ? "text-foreground" : "text-muted-foreground"}>
            Consigna
          </span>
          <Switch
            id="reflection-mode"
            checked={mode === "notes"}
            onCheckedChange={(checked) => setMode(checked ? "notes" : "prompt")}
            aria-label="Elegir entre responder la consigna o escribir notas libres"
          />
          <span className={mode === "notes" ? "text-foreground" : "text-muted-foreground"}>
            Notas libres
          </span>
        </label>
      </div>

      <p className="font-serif text-[length:var(--reading-fs,19px)] leading-[1.7] mb-5">
        {mode === "prompt" ? node.reflectionPrompt : NOTES_INTRO}
      </p>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (savedMode === mode) setSavedMode(null);
          }}
          placeholder={mode === "prompt" ? "Escribí tu reflexión…" : "Escribí tus notas…"}
          rows={6}
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
      <div className="mt-4 flex items-center justify-between gap-4">
        <span aria-live="polite" className="text-[13px] text-muted-foreground">
          {savedMode === mode
            ? mode === "prompt"
              ? "Reflexión guardada ✓"
              : "Notas guardadas ✓"
            : " "}
        </span>
        <Button
          onClick={handleSave}
          disabled={value.trim().length === 0}
          className="h-10 px-4 font-sans sm:h-9"
        >
          {mode === "prompt" ? "Guardar reflexión" : "Guardar notas"}
        </Button>
      </div>
    </section>
  );
}
