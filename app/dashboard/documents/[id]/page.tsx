import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/AppHeader";
import { DocumentProcessor } from "@/components/upload/DocumentProcessor";
import { CLAUDE_MODEL, aiConfigured } from "@/lib/ai/claude";
import { getUser } from "@/lib/supabase/server";
import { SECTION_COLUMNS, type DocumentRow, type SectionRow } from "@/types";

export const metadata: Metadata = { title: "Procesar documento — Nodos" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const doc = data as DocumentRow;
  const { data: sections } = await supabase
    .from("document_sections")
    .select(SECTION_COLUMNS)
    .eq("document_id", id)
    .order("idx");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        trail={[{ label: "Biblioteca", href: "/dashboard" }, { label: doc.title }]}
        signedIn
      />
      <main className="bg-editor flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[68ch]">
          <DocumentProcessor
            initial={doc}
            initialSections={(sections ?? []) as SectionRow[]}
            model={CLAUDE_MODEL}
            aiReady={aiConfigured()}
          />
        </div>
      </main>
    </div>
  );
}
