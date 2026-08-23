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
      className="border-t border-border bg-sidebar font-mono text-[11.5px] text-muted-foreground"
      role="status"
    >
      <div className="mx-auto flex h-7 max-w-[1400px] items-center gap-3 px-4 sm:gap-5">
        <span>
          <span className="text-foreground">●</span> Nodo {node.orderIndex}/
          {totalNodes}
        </span>
        <span aria-label="Tiempo estimado de lectura">⏱ {minutes} min</span>
        <span className="hidden truncate sm:inline">{book.title}</span>
        <span className="ml-auto hidden sm:inline" title="MVP estático: datos locales">
          mock · sin sincronizar
        </span>
      </div>
    </footer>
  );
}
