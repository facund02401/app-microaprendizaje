import { promises as fs } from "node:fs";
import path from "node:path";
import { checkBook } from "@/lib/book-validation";
import { mockBook } from "@/lib/mock-data";
import type { Book } from "@/types";

/**
 * Origen de los libros (solo servidor). Modo prueba (TODO.md §7): además del
 * libro inventado, lee `data/books/*.json` generados fuera de la app. En
 * Fase 2 esto se reemplaza por consultas a Supabase (docs/09 M4) sin tocar
 * a quien lo llama.
 */

const BOOKS_DIR = path.join(process.cwd(), "data", "books");

export interface BookProblem {
  file: string;
  errors: string[];
}

export interface BookLibrary {
  /** El libro de prueba va primero; nunca falta aunque no haya archivos. */
  books: Book[];
  /** Archivos que existen pero no se pudieron cargar. */
  problems: BookProblem[];
}

export async function loadLibrary(): Promise<BookLibrary> {
  const books: Book[] = [mockBook];
  const problems: BookProblem[] = [];

  let files: string[] = [];
  try {
    files = (await fs.readdir(BOOKS_DIR)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    // Sin carpeta data/books: solo el libro de prueba.
    return { books, problems };
  }

  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    try {
      const raw: unknown = JSON.parse(
        await fs.readFile(path.join(BOOKS_DIR, file), "utf8")
      );
      const { book, errors } = checkBook(raw, id);
      if (!book) problems.push({ file, errors });
      else if (books.some((b) => b.documentId === book.documentId)) {
        problems.push({ file, errors: [`documentId "${book.documentId}" repetido.`] });
      } else books.push(book);
    } catch (e) {
      problems.push({
        file,
        errors: [e instanceof SyntaxError ? `JSON mal formado: ${e.message}` : "No se pudo leer el archivo."],
      });
    }
  }
  return { books, problems };
}

export async function getBook(documentId: string): Promise<Book | undefined> {
  return (await loadLibrary()).books.find((b) => b.documentId === documentId);
}
