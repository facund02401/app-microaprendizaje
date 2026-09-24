import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { CLAUDE_MODEL, aiConfigured } from "@/lib/ai/claude";
import { loadBook } from "@/lib/books";
import { mockBook } from "@/lib/mock-data";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { SECTION_COLUMNS, type SectionRow } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ documentId: string }>;
}

export default async function ReaderPage({ params }: Props) {
  const { documentId } = await params;
  if (documentId === mockBook.documentId) return <ReaderView book={mockBook} />;
  if (!supabaseConfigured) notFound();

  const { supabase, user } = await getUser();
  if (!user) notFound();
  const [book, { data: sections }] = await Promise.all([
    loadBook(supabase, documentId),
    supabase.from("document_sections").select(SECTION_COLUMNS).eq("document_id", documentId).order("idx"),
  ]);
  if (!book) notFound();

  return (
    <ReaderView
      book={book}
      processing={{
        sections: (sections ?? []) as SectionRow[],
        model: CLAUDE_MODEL,
        aiReady: aiConfigured(),
      }}
    />
  );
}
