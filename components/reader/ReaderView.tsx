"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import { NodeNavigation } from "@/components/reader/NodeNavigation";
import { ReaderTextDisplay } from "@/components/reader/ReaderTextDisplay";
import { ReflectionBox } from "@/components/reader/ReflectionBox";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { StatusBar } from "@/components/shell/StatusBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { flatNodes } from "@/types";
import type { Book } from "@/types";

interface Props {
  book: Book;
}

/** Punto de corte escritorio/móvil: <768px el explorador es cajón flotante. */
function subscribeMq(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Shell tipo IDE (docs/07 §1): header con breadcrumbs, sidebar retráctil,
 * lienzo central de lectura y status bar. Navegación por teclado:
 * ← → nodos · s sidebar · Esc cierra cajón móvil.
 * En móvil (<768px) el explorador nace cerrado y se abre como cajón sobre
 * el texto, con fondo oscurecido que lo cierra al tocarlo.
 */
export function ReaderView({ book }: Props) {
  const nodes = flatNodes(book);
  const total = nodes.length;
  const [current, setCurrent] = useState(0);

  // Detecta escritorio sin desincronización de hidratación.
  const isDesktop = useSyncExternalStore(
    subscribeMq,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );

  // Preferencia persistida (solo aplica en escritorio).
  const [desktopPref, setDesktopPref] = useState<boolean | null>(null);
  // Última acción manual del usuario (gana sobre los valores por defecto).
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    // Diferido al siguiente tick: evita setState síncrono en effect.
    const id = setTimeout(() => {
      setDesktopPref(localStorage.getItem("nodos-sidebar") !== "closed");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const sidebarOpen = override ?? (isDesktop ? (desktopPref ?? true) : false);

  const go = useCallback(
    (next: number) => setCurrent(Math.min(total - 1, Math.max(0, next))),
    [total]
  );

  const toggleSidebar = useCallback(() => {
    const base = override ?? (isDesktop ? (desktopPref ?? true) : false);
    const next = !base;
    setOverride(next);
    if (isDesktop) {
      localStorage.setItem("nodos-sidebar", next ? "open" : "closed");
    }
  }, [override, isDesktop, desktopPref]);

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
          toggleSidebar();
          break;
        case "Escape":
          if (!isDesktop) setOverride(false);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, toggleSidebar, isDesktop]);

  useEffect(() => {
    document.getElementById("reading-canvas")?.scrollTo({ top: 0 });
  }, [current]);

  const { chapter, node } = nodes[current];

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-3 md:h-10">
        <button
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="node-explorer"
          title="Alternar explorador de nodos (s)"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:p-1.5"
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
        {/* Fondo oscurecido del cajón móvil */}
        {!isDesktop && sidebarOpen && (
          <div
            onClick={() => setOverride(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/50 duration-300 motion-safe:transition-opacity"
          />
        )}

        <aside
          id="node-explorer"
          aria-hidden={!sidebarOpen}
          inert={!sidebarOpen}
          aria-label="Explorador de nodos"
          className={cn(
            "w-[280px] shrink-0 overflow-y-auto border-r border-border bg-sidebar py-3",
            "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40",
            "max-md:w-[85%] max-md:max-w-[320px] max-md:shadow-xl",
            "max-md:motion-safe:transition-transform max-md:duration-300",
            sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full md:hidden"
          )}
        >
          <NodeNavigation
            book={book}
            currentNodeIndex={current}
            onSelectNode={(i) => {
              go(i);
              if (!isDesktop) setOverride(false);
            }}
          />
        </aside>

        <main
          id="reading-canvas"
          tabIndex={-1}
          className="flex-1 overflow-y-auto"
        >
          <div className="bg-editor min-h-full px-6 py-10 sm:px-10 sm:py-16">
            <ReaderTextDisplay node={node} />
            <ReflectionBox node={node} />

            {/* Navegación inferior */}
            <nav
              aria-label="Nodos vecinos"
              className="mx-auto mt-12 flex max-w-[65ch] items-center justify-between font-mono text-[13px] sm:text-[12px]"
            >
              <button
                onClick={() => go(current - 1)}
                disabled={current === 0}
                className="rounded-sm px-3 py-2 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 disabled:opacity-40"
              >
                ← anterior
              </button>
              <span className="text-muted-foreground/70">
                {current + 1} / {total}
              </span>
              <button
                onClick={() => go(current + 1)}
                disabled={current === total - 1}
                className="rounded-sm px-3 py-2 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 disabled:opacity-40"
              >
                siguiente →
              </button>
            </nav>
          </div>
        </main>
      </div>

      <StatusBar book={book} node={node} totalNodes={total} />
    </div>
  );
}
