"use client";

import { cn } from "@/lib/utils";
import { flatNodes } from "@/types";
import type { Book, ConceptNode } from "@/types";

interface Props {
  book: Book;
  currentNodeIndex: number;
  onSelectNode: (index: number) => void;
}

interface Row {
  node: ConceptNode;
  globalIndex: number;
}

interface Group {
  id: string;
  title: string;
  rows: Row[];
}

/**
 * Explorador de nodos (docs/07 §1): árbol Libro → Capítulo → Nodo
 * con estados discretos: ✓ completado · • en curso · 🔒 bloqueado.
 */
export function NodeNavigation({ book, currentNodeIndex, onSelectNode }: Props) {
  const groups = buildGroups(book);

  return (
    <nav aria-label="Mapa de nodos" className="text-[13px] font-sans">
      <p className="px-3 pb-2 text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
        Nodos
      </p>
      <p className="px-3 pb-3 text-[12px] leading-snug text-muted-foreground/80 italic">
        {book.title}
      </p>
      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group.id}>
            <p className="px-3 py-1 font-medium">{group.title}</p>
            <ul>
              {group.rows.map(({ node, globalIndex }) => {
                const state = nodeState(globalIndex, currentNodeIndex);
                return (
                  <li key={node.orderIndex}>
                    <button
                      onClick={() => onSelectNode(globalIndex)}
                      aria-current={state === "current" || undefined}
                      aria-label={`Nodo ${node.orderIndex}: ${labelFor(state)}`}
                      disabled={state === "locked"}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-3 py-1.5 text-left",
                        "hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring/60",
                        state === "current" && "bg-sidebar-accent font-medium",
                        state === "locked" && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[1px] w-4 shrink-0 text-center"
                      >
                        {iconFor(state)}
                      </span>
                      <span className="leading-snug">
                        <span className="font-mono text-[11px] text-muted-foreground mr-1.5">
                          {String(node.orderIndex).padStart(2, "0")}
                        </span>
                        {node.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function buildGroups(book: Book): Group[] {
  const map = new Map<string, Group>();
  flatNodes(book).forEach(({ chapter, node }, i) => {
    const group = map.get(chapter.id) ?? {
      id: chapter.id,
      title: chapter.title,
      rows: [] as Row[],
    };
    group.rows.push({ node, globalIndex: i });
    map.set(chapter.id, group);
  });
  return [...map.values()];
}

function nodeState(index: number, current: number): NodeUiState {
  if (index < current) return "completed";
  if (index === current) return "current";
  // MVP: solo el nodo siguiente al actual está disponible
  return index === current + 1 ? "available-next" : "locked";
}

type NodeUiState = "completed" | "current" | "available-next" | "locked";

function iconFor(state: NodeUiState): string {
  switch (state) {
    case "completed":
      return "✓";
    case "current":
      return "•";
    default:
      return "🔒";
  }
}

function labelFor(state: NodeUiState): string {
  switch (state) {
    case "completed":
      return "completado";
    case "current":
      return "en curso";
    case "available-next":
      return "disponible";
    default:
      return "bloqueado";
  }
}
