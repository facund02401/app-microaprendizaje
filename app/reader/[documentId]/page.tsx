import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { getBook, loadLibrary } from "@/lib/books";

interface Props {
  params: Promise<{ documentId: string }>;
}

export async function generateStaticParams() {
  const { books } = await loadLibrary();
  return books.map((b) => ({ documentId: b.documentId }));
}

export default async function ReaderPage({ params }: Props) {
  const { documentId } = await params;
  const book = await getBook(documentId);
  if (!book) notFound();

  return <ReaderView book={book} />;
}
