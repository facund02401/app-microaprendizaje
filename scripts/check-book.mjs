// Uso: npm run check-book -- data/books/mi-libro.json
// Valida un libro generado fuera de la app (TODO.md §7) antes de abrirlo.
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkBook } from "../lib/book-validation.ts";

function main(file) {
  if (!file) {
    console.error("Falta el archivo. Ejemplo: npm run check-book -- data/books/mi-libro.json");
    return 2;
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`No se pudo leer o parsear ${file}: ${e.message}`);
    return 1;
  }

  const { book, errors, warnings } = checkBook(raw, path.basename(file, ".json"));

  if (book) {
    const nodes = book.chapters.flatMap((c) => c.nodes);
    console.log(`${book.title} — ${book.author}`);
    for (const c of book.chapters) {
      console.log(`  ${c.title}: ${c.nodes.length} nodos`);
    }
    console.log(`Total: ${book.chapters.length} capítulos, ${nodes.length} nodos.`);
  }
  for (const w of warnings) console.log(`AVISO  ${w}`);
  for (const e of errors) console.error(`ERROR  ${e}`);
  console.log(
    errors.length
      ? `\n${errors.length} errores: la app no va a cargar este libro.`
      : warnings.length
        ? `\nSe puede cargar; ${warnings.length} avisos para revisar.`
        : "\nTodo en orden."
  );
  return errors.length ? 1 : 0;
}

// exitCode (no process.exit): en Windows exit() corta la salida y rompe libuv.
process.exitCode = main(process.argv[2]);
