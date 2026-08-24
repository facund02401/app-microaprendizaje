"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  getBankServerSnapshot,
  getBankSnapshot,
  removeFromBank,
  subscribeBank,
} from "@/lib/concept-bank";

/**
 * Panel del banco de conceptos personal (docs/01 §4, v1.1):
 * lista de términos guardados con su definición y procedencia.
 * v2 (Fase 2) sumará explicaciones generadas por IA para cualquier palabra.
 */
export function ConceptBankPanel() {
  const bank = useSyncExternalStore(
    subscribeBank,
    getBankSnapshot,
    getBankServerSnapshot
  );

  if (bank.length === 0) {
    return (
      <p className="px-3 py-6 font-sans text-[12.5px] leading-relaxed text-muted-foreground/80 italic">
        Todavía no guardaste conceptos. Abrí el glosario de un nodo y tocá ⊕
        junto a un término para tenerlo siempre a mano acá.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {bank.map((c) => (
        <li
          key={c.id}
          className="rounded-md px-2 py-1.5 hover:bg-sidebar-accent/60"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-serif text-[14px] font-semibold leading-snug">
              {c.term}
            </p>
            <div className="-mr-1 flex shrink-0 items-center gap-0.5">
              {c.status === "pending" && (
                <span
                  title="Esperando explicación (botón Explicar ahora cuando esté la IA)"
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground"
                >
                  pendiente
                </span>
              )}
              <button
                onClick={() => removeFromBank(c.id)}
                aria-label={`Quitar "${c.term}" del banco`}
                title="Quitar del banco"
                className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
          <p
            className={
              c.status === "pending"
                ? "mt-1 font-sans text-[13px] italic leading-relaxed text-muted-foreground/80"
                : "mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground"
            }
          >
            {c.definition}
          </p>
          <p className="mt-1.5 truncate font-mono text-[10.5px] text-muted-foreground/70">
            {c.sourceChapterTitle} · nodo{" "}
            {String(c.sourceNodeIndex).padStart(2, "0")}
          </p>
        </li>
      ))}
    </ul>
  );
}
