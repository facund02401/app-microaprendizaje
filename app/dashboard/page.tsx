import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/shell/AppHeader";
import { LibraryCard } from "@/components/library/LibraryCard";
import { mockBook } from "@/lib/mock-data";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { estimatedMinutes, flatNodes } from "@/types";
import type { DocumentRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let documents: DocumentRow[] = [];
  let signedIn = false;

  if (supabaseConfigured) {
    const { supabase, user } = await getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      documents = (data ?? []) as DocumentRow[];
    }
  }

  const sampleNodes = flatNodes(mockBook);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader trail={[{ label: "Biblioteca" }]} signedIn={signedIn} />

      <main className="bg-editor flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[68ch]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif text-[30px] font-bold">Biblioteca</h1>
            {signedIn && (
              <Link
                href="/dashboard/upload"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary px-4 font-sans text-[14px] font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60"
              >
                <Plus className="size-4" />
                Subir documento
              </Link>
            )}
          </div>

          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <LibraryCard doc={doc} />
              </li>
            ))}

            <li>
              <Link
                href={`/reader/${mockBook.documentId}`}
                className="block rounded-lg border border-border bg-card p-5 hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring/60"
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-serif text-[19px] font-semibold">{mockBook.title}</h2>
                  <span className="font-mono text-[11.5px] whitespace-nowrap text-muted-foreground">
                    {sampleNodes.length} nodos · ⏱ {estimatedMinutes(sampleNodes[0].node)} min c/u
                  </span>
                </div>
                <p className="font-sans text-[13px] text-muted-foreground">
                  {mockBook.author} · texto de prueba (contenido inventado)
                </p>
              </Link>
            </li>
          </ul>

          {signedIn && documents.length === 0 && (
            <p className="mt-8 font-sans text-[14px] leading-relaxed text-muted-foreground">
              Todavía no subiste textos. Podés subir PDF (también escaneados), Word, EPUB o texto plano:
              Nodos los divide en micro-dosis de 5 a 10 minutos sin tocar las palabras del autor.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
