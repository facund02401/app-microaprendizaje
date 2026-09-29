"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { LibraryBig } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getBankServerSnapshot,
  getBankSnapshot,
  subscribeBank,
} from "@/lib/concept-bank";
import { ConceptBankPanel } from "@/components/reader/ConceptBankPanel";
import { NodeGlossarySection } from "@/components/reader/NodeGlossarySection";
import { NodeNavigation } from "@/components/reader/NodeNavigation";
import { ReaderTextDisplay } from "@/components/reader/ReaderTextDisplay";
import { ReflectionBox } from "@/components/reader/ReflectionBox";
import { SelectionSave } from "@/components/reader/SelectionSave";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { FontToggle } from "@/components/shell/FontToggle";
import { StatusBar } from "@/components/shell/StatusBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { ContinuePanel } from "@/components/reader/ContinuePanel";
import { flatNodes, nodeKey } from "@/types";
import { EMPTY_RESPONSE } from "@/types";
import type { Book, NodeResponse, SectionRow } from "@/types";
import { syncBank } from "@/lib/concept-bank";
import { ExportLink } from "@/components/reader/ExportLink";

interface Props {
  book: Book;
  /** Libros subidos: índice para preparar el siguiente capítulo a medida que se lee. */
  processing?: { sections: SectionRow[]; model: string; aiReady: boolean };
  /** Respuestas y notas ya guardadas en la cuenta, por id de nodo. */
  responses?: Record<string, NodeResponse>;
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
export function ReaderView({ book, processing, responses: initialResponses }: Props) {
  const cloud = book.source === "cloud";
  const [responses, setResponses] = useState<Record<string, NodeResponse>>(initialResponses ?? {});

  // Trae al dispositivo el banco de conceptos guardado en la cuenta.
  useEffect(() => {
    if (!cloud) return;
    const t = setTimeout(() => void syncBank(), 0);
    return () => clearTimeout(t);
  }, [cloud]);
  const nodes = useMemo(() => flatNodes(book), [book]);
  const total = nodes.length;
  // Se guarda la identidad del nodo (no su número): si se preparan capítulos
  // anteriores, la lectura sigue en el mismo lugar.
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const found = currentKey ? nodes.findIndex(({ node }) => nodeKey(node) === currentKey) : -1;
  const current = found >= 0 ? found : 0;

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
  // Pestaña activa del explorador: mapa de nodos o banco de conceptos.
  const [explorerTab, setExplorerTab] = useState<"nodos" | "banco">("nodos");
  const bankCount = useSyncExternalStore(
    subscribeBank,
    getBankSnapshot,
    getBankServerSnapshot
  ).length;

  useEffect(() => {
    // Diferido al siguiente tick: evita setState síncrono en effect.
    const id = setTimeout(() => {
      setDesktopPref(localStorage.getItem("nodos-sidebar") !== "closed");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const sidebarOpen = override ?? (isDesktop ? (desktopPref ?? true) : false);

  const positionKey = `nodos-pos-${book.documentId}`;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(nodes.length - 1, Math.max(0, next));
      const key = nodeKey(nodes[clamped].node);
      setCurrentKey(key);
      try {
        localStorage.setItem(positionKey, key);
      } catch {}
    },
    [nodes, positionKey]
  );

  // Retoma el último nodo leído de este libro (diferido: sin desajuste de hidratación).
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem(positionKey);
        if (saved) setCurrentKey(saved);
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, [positionKey]);

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
  // Último nodo preparado de este capítulo: se ofrece exportar sus apuntes.
  const chapterEnds = current === total - 1 || nodes[current + 1].chapter.id !== chapter.id;

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
        <Link
          href="/dashboard"
          title="Volver a la biblioteca"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/60 md:p-1.5"
        >
          <LibraryBig className="size-4" aria-hidden="true" />
          <span className="sr-only">Biblioteca</span>
        </Link>
        <Breadcrumbs
          items={[
            "Libros / Seminarios",
            book.title,
            chapter.title,
            `Nodo ${String(node.orderIndex).padStart(2, "0")}`,
          ]}
          className="min-w-0 flex-1"
        />
        <FontToggle />
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
          {/* Pestañas del explorador: mapa de nodos / banco de conceptos */}
          <div
            role="tablist"
            aria-label="Secciones del explorador"
            className="mb-2 flex gap-1 border-b border-border px-3 pb-1"
          >
            <button
              role="tab"
              aria-selected={explorerTab === "nodos"}
              onClick={() => setExplorerTab("nodos")}
              className={cn(
                "min-h-[36px] rounded-sm px-2 font-mono text-[11px] tracking-[0.12em] uppercase",
                "focus-visible:outline-2 focus-visible:outline-ring/60",
                explorerTab === "nodos"
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Nodos
            </button>
            <button
              role="tab"
              suppressHydrationWarning
              aria-selected={explorerTab === "banco"}
              onClick={() => setExplorerTab("banco")}
              className={cn(
                "min-h-[36px] rounded-sm px-2 font-mono text-[11px] tracking-[0.12em] uppercase",
                "focus-visible:outline-2 focus-visible:outline-ring/60",
                explorerTab === "banco"
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Banco de conceptos{bankCount > 0 ? ` (${bankCount})` : ""}
            </button>
          </div>

          {explorerTab === "nodos" ? (
            <NodeNavigation
              book={book}
              currentNodeIndex={current}
              onSelectNode={(i) => {
                go(i);
                if (!isDesktop) setOverride(false);
              }}
            />
          ) : (
            <ConceptBankPanel />
          )}
        </aside>

        <main
          id="reading-canvas"
          tabIndex={-1}
          className="flex-1 overflow-y-auto"
        >
          <div className="bg-editor min-h-full px-6 py-10 sm:px-10 sm:py-16">
            <ReaderTextDisplay node={node} book={book} chapter={chapter} />
            <NodeGlossarySection node={node} book={book} chapter={chapter} />
            <ReflectionBox
              key={nodeKey(node)}
              node={node}
              documentId={book.documentId}
              cloud={cloud}
              initial={responses[nodeKey(node)] ?? EMPTY_RESPONSE}
              onSaved={(v) => setResponses((prev) => ({ ...prev, [nodeKey(node)]: v }))}
            />

            {/* Navegación inferior */}
            <nav
              aria-label="Nodos vecinos"
              className="mx-auto mt-12 flex max-w-[42rem] items-center justify-between font-mono text-[13px] sm:text-[12px]"
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

            {cloud && chapterEnds && (
              <div className="mx-auto mt-10 flex max-w-[42rem] flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-5 py-4 font-sans">
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  Terminaste <span className="font-serif text-foreground">«{chapter.title}»</span>.
                </p>
                <ExportLink documentId={book.documentId} chapterId={chapter.id} label="Exportar apuntes del capítulo" />
              </div>
            )}

            {processing && (
              <ContinuePanel
                documentId={book.documentId}
                processing={processing}
                position={node.position}
                nearEnd={current >= total - 3}
                atEnd={current === total - 1}
              />
            )}
          </div>
        </main>
      </div>

      <StatusBar book={book} node={node} totalNodes={total} />

      {/* Prototipo v1.2: selección de texto → ⊕ → banco (ver TODO.md) */}
      <SelectionSave node={node} book={book} chapter={chapter} />
    </div>
  );
}
