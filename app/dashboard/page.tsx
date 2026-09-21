import Link from "next/link";
import { loadLibrary } from "@/lib/books";
import { mockBook } from "@/lib/mock-data";
import { estimatedMinutes, flatNodes } from "@/types";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

// Lee data/books/ en cada visita: un libro nuevo aparece sin recompilar.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { books, problems } = await loadLibrary();

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

          <div className="space-y-4">
            {books.map((book) => {
              const nodes = flatNodes(book);
              return (
                <Link
                  key={book.documentId}
                  href={`/reader/${book.documentId}`}
                  className="block rounded-lg border border-border bg-card p-5 hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring/60"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <h2 className="font-serif text-[20px] font-semibold">
                      {book.title}
                    </h2>
                    <span className="font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {nodes.length} nodos · ⏱ {estimatedMinutes(nodes[0].node)} min c/u aprox.
                    </span>
                  </div>
                  <p className="font-sans text-[13px] text-muted-foreground">
                    {book.author}
                    {book.documentId === mockBook.documentId
                      ? " · texto de prueba (contenido inventado)"
                      : ""}
                  </p>
                </Link>
              );
            })}
          </div>

          {problems.map((p) => (
            <p
              key={p.file}
              className="mt-4 font-mono text-[11px] text-muted-foreground"
            >
              No se pudo cargar data/books/{p.file}: {p.errors[0]}
              {p.errors.length > 1 ? ` (y ${p.errors.length - 1} más; correr npm run check-book)` : ""}
            </p>
          ))}

          <p className="mt-8 font-mono text-[11px] text-muted-foreground/70">
            La subida de PDFs llega en Fase 2. Mientras tanto, los libros se
            cargan desde data/books/.
          </p>
        </div>
      </main>
    </div>
  );
}
