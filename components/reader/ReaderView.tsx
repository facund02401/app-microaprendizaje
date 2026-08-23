"use client";

import { useCallback, useEffect, useState } from "react";
import { NodeNavigation } from "@/components/reader/NodeNavigation";
import { ReaderTextDisplay } from "@/components/reader/ReaderTextDisplay";
import { ReflectionBox } from "@/components/reader/ReflectionBox";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { StatusBar } from "@/components/shell/StatusBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { flatNodes } from "@/types";
import type { Book } from "@/types";

interface Props {
  book: Book;
}

/**
 * Shell tipo IDE (docs/07 §1): header con breadcrumbs, sidebar retráctil,
 * lienzo central de lectura y status bar. Navegación por teclado:
 * ← → nodos · s sidebar · t tema.
 */
export function ReaderView({ book }: Props) {
  const nodes = flatNodes(book);
  const total = nodes.length;
  const [current, setCurrent] = useState(0);
  // Lazy init: evita setState síncrono en effect (regla React Compiler).
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nodos-sidebar") !== "closed";
  });

  const go = useCallback(
    (next: number) => setCurrent(Math.min(total - 1, Math.max(0, next))),
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;

      switch (e.key) {
        case "ArrowLeft":
          go(current - 1);
          break;
        case "ArrowRight":
          go(current + 1);
          break;
        case "s":
        case "S":
          setSidebarOpen((open) => {
            localStorage.setItem("nodos-sidebar", open ? "closed" : "open");
            return !open;
          });
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go]);

  useEffect(() => {
    document.getElementById("reading-canvas")?.scrollTo({ top: 0 });
  }, [current]);

  const { chapter, node } = nodes[current];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-3">
          <button
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              localStorage.setItem(
                "nodos-sidebar",
                !sidebarOpen ? "open" : "closed"
              );
            }}
            aria-expanded={sidebarOpen}
            aria-controls="node-explorer"
            title="Alternar explorador de nodos (s)"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60"
          >
            <span aria-hidden="true" className="font-mono text-sm">≡</span>
            <span className="sr-only">Explorador de nodos</span>
          </button>
          <Breadcrumbs
            items={[
              "Libros / Seminarios",
              book.title,
              chapter.title,
              `Nodo ${String(node.orderIndex).padStart(2, "0")}`,
            ]}
            className="min-w-0 flex-1"
          />
          <ThemeToggle />
        </header>

        {/* Cuerpo */}
        <div className="flex min-h-0 flex-1">
          <aside
            id="node-explorer"
            suppressHydrationWarning
            hidden={!sidebarOpen}
            aria-label="Explorador de nodos"
            className="w-[280px] shrink-0 overflow-y-auto border-r border-border bg-sidebar py-3"
          >
            <NodeNavigation
              book={book}
              currentNodeIndex={current}
              onSelectNode={go}
            />
          </aside>

          <main
            id="reading-canvas"
            tabIndex={-1}
            className="flex-1 overflow-y-auto"
          >
            <div className="bg-editor min-h-full px-6 py-16 sm:px-10">
              <ReaderTextDisplay node={node} />
              <ReflectionBox node={node} />

              {/* Navegación inferior */}
              <nav
                aria-label="Nodos vecinos"
                className="max-w-[65ch] mx-auto mt-12 flex items-center justify-between font-mono text-[12px]"
              >
                <button
                  onClick={() => go(current - 1)}
                  disabled={current === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring/60 rounded-sm px-2 py-1"
                >
                  ← anterior
                </button>
                <span className="text-muted-foreground/70">
                  {current + 1} / {total}
                </span>
                <button
                  onClick={() => go(current + 1)}
                  disabled={current === total - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring/60 rounded-sm px-2 py-1"
                >
                  siguiente →
                </button>
              </nav>
            </div>
          </main>
        </div>

        <StatusBar book={book} node={node} totalNodes={total} />
      </div>
    </TooltipProvider>
  );
}
