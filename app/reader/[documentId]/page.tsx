import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { mockBook } from "@/lib/mock-data";

interface Props {
  params: Promise<{ documentId: string }>;
}

export function generateStaticParams() {
  return [{ documentId: mockBook.documentId }];
}

export default async function ReaderPage({ params }: Props) {
  const { documentId } = await params;
  if (documentId !== mockBook.documentId) notFound();

  return <ReaderView book={mockBook} />;
}
