"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import type { ConceptNode } from "@/types";

interface Props {
  node: ConceptNode;
}

/**
 * Caja de reflexión (docs/01 §4.3). En el MVP estático guarda en memoria
 * local; la retroalimentación de IA llega en Fase 3.
 */
export function ReflectionBox({ node }: Props) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <section
      aria-label="Elaboración dialógica"
      className="max-w-[65ch] mx-auto mt-14 pt-8 border-t border-border"
    >
      <h3 className="font-sans text-[13px] font-medium tracking-[0.14em] uppercase text-muted-foreground mb-4">
        Tu articulación
      </h3>
      <p className="font-serif text-[19px] leading-[1.7] mb-5">
        {node.reflectionPrompt}
      </p>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="Escribí tu reflexión…"
          rows={6}
          className="w-full resize-y rounded-md border border-input bg-editor px-4 py-3 font-serif text-[17px] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
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
          {saved ? "Reflexión guardada ✓" : " "}
        </span>
        <Button
          onClick={() => setSaved(true)}
          disabled={value.trim().length === 0}
          className="font-sans"
        >
          Guardar reflexión
        </Button>
      </div>
    </section>
  );
}
