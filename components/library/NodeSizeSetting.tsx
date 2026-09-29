"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NODE_SIZES, type NodeSize } from "@/lib/node-size";
import { cn } from "@/lib/utils";

/**
 * Tamaño de los nodos nuevos: preferencia de la cuenta. Aplica a lo que se
 * prepare de ahora en adelante; lo ya procesado no cambia. Solo muestra
 * "Guardado" cuando Supabase confirmó el cambio.
 */
export function NodeSizeSetting({ initial }: { initial: NodeSize }) {
  const [size, setSize] = useState<NodeSize>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function choose(next: NodeSize) {
    if (next === size || status === "saving") return;
    const previous = size;
    setSize(next);
    setStatus("saving");
    const { error } = await createClient().auth.updateUser({ data: { node_size: next } });
    if (error) {
      setSize(previous);
      setStatus("error");
    } else {
      setStatus("saved");
    }
  }

  return (
    <section aria-labelledby="node-size-title" className="mb-8 rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="node-size-title" className="font-sans text-[14px] font-semibold">
          Tamaño de los nodos nuevos
        </h2>
        <span role="status" className="font-mono text-[11.5px] text-muted-foreground">
          {status === "saving" && "Guardando…"}
          {status === "saved" && "Guardado"}
          {status === "error" && "No se pudo guardar. Probá de nuevo."}
        </span>
      </div>
      <div role="radiogroup" aria-labelledby="node-size-title" className="grid grid-cols-3 gap-2">
        {(Object.keys(NODE_SIZES) as NodeSize[]).map((key) => {
          const o = NODE_SIZES[key];
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={size === key}
              onClick={() => choose(key)}
              className={cn(
                "min-h-10 rounded-md border border-border px-2 py-2 text-left font-sans hover:border-ring/60",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
                size === key && "border-ring bg-muted"
              )}
            >
              <span className="block text-[13.5px] font-medium">{o.label}</span>
              <span className="block font-mono text-[11px] text-muted-foreground">
                {o.range} palabras · ~{o.minutes} min
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-muted-foreground">
        Vale para lo que prepares de ahora en adelante; lo que ya está procesado no cambia. Con nodos más
        largos hay menos nodos y el costo de preparar un libro baja un poco.
      </p>
    </section>
  );
}
