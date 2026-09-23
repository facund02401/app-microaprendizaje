import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { loadBook } from "@/lib/books";
import { mockBook } from "@/lib/mock-data";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ documentId: string }>;
}

export default async function ReaderPage({ params }: Props) {
  const { documentId } = await params;
  if (documentId === mockBook.documentId) return <ReaderView book={mockBook} />;
  if (!supabaseConfigured) notFound();

  const { supabase, user } = await getUser();
  if (!user) notFound();
  const book = await loadBook(supabase, documentId);
  if (!book) notFound();

  return <ReaderView book={book} />;
}
