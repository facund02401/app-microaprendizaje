import { estimatedMinutes } from "@/types";
import type { Book, ConceptNode } from "@/types";

interface Props {
  book: Book;
  node: ConceptNode;
  totalNodes: number;
}

/**
 * Status bar inferior (docs/07 §1.3): monoespaciada, discreta.
 * Progreso del libro + tiempo estimado de la micro-dosis.
 */
export function StatusBar({ book, node, totalNodes }: Props) {
  const minutes = estimatedMinutes(node);

  return (
    <footer
      className="shrink-0 border-t border-border bg-sidebar font-mono text-[11px] text-muted-foreground sm:text-[11.5px]"
      role="status"
    >
      <div className="mx-auto flex h-7 max-w-[1400px] items-center gap-3 overflow-hidden px-4 whitespace-nowrap sm:gap-5">
        <span className="whitespace-nowrap">
          <span className="text-foreground">●</span> Nodo {node.orderIndex}/
          {totalNodes}
        </span>
        <span
          aria-label="Tiempo estimado de lectura"
          className="whitespace-nowrap"
        >
          ⏱ {minutes} min
        </span>
        <span className="hidden truncate sm:inline">{book.title}</span>
        <span className="ml-auto hidden sm:inline" title="MVP estático: datos locales">
          mock · sin sincronizar
        </span>
      </div>
    </footer>
  );
}
