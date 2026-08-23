import Link from "next/link";
import { mockBook } from "@/lib/mock-data";
import { estimatedMinutes, flatNodes } from "@/types";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default function Dashboard() {
  const total = flatNodes(mockBook).length;
  const firstNode = flatNodes(mockBook)[0].node;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4">
        <span className="font-mono text-[12px] text-muted-foreground">
          Libros / Seminarios
        </span>
        <ThemeToggle />
      </header>

      <main className="bg-editor flex-1 px-6 py-16">
        <div className="max-w-[65ch] mx-auto">
          <h1 className="font-serif text-[30px] font-bold mb-10">Biblioteca</h1>

          <Link
            href={`/reader/${mockBook.documentId}`}
            className="block rounded-lg border border-border bg-card p-5 hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring/60"
          >
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <h2 className="font-serif text-[20px] font-semibold">
                {mockBook.title}
              </h2>
              <span className="font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                {total} nodos · ⏱ {estimatedMinutes(firstNode)} min c/u aprox.
              </span>
            </div>
            <p className="font-sans text-[13px] text-muted-foreground">
              {mockBook.author} · texto de prueba (contenido inventado)
            </p>
          </Link>

          <p className="mt-8 font-mono text-[11px] text-muted-foreground/70">
            La subida de PDFs llega en Fase 2.
          </p>
        </div>
      </main>
    </div>
  );
}
