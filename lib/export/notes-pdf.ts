import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface ExportNode {
  number: number;
  title: string;
  prompt: string;
  answer: string;
  note: string;
}

export interface ExportChapter {
  title: string;
  nodes: ExportNode[];
}

export interface ExportConcept {
  term: string;
  definition: string;
  pending: boolean;
  location: string;
  quote: string | null;
}

export interface NotesExport {
  title: string;
  author: string | null;
  scope: string | null;
  date: string;
  chapters: ExportChapter[];
  concepts: ExportConcept[];
}

// A4, márgenes amplios y tipografía de lectura (Liberation Serif, licencia OFL).
const PAGE: [number, number] = [595.28, 841.89];
const MARGIN_X = 68;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;
const TEXT = rgb(0.13, 0.13, 0.14);
const MUTED = rgb(0.42, 0.42, 0.45);
const RULE = rgb(0.82, 0.82, 0.84);

const FONT_DIR = path.join(process.cwd(), "lib/export/fonts");

class Writer {
  private page!: PDFPage;
  private y = 0;
  private pageNumber = 0;
  readonly width = PAGE[0] - MARGIN_X * 2;

  constructor(
    private doc: PDFDocument,
    public fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
    private footer: string
  ) {
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage(PAGE);
    this.pageNumber++;
    this.y = PAGE[1] - MARGIN_TOP;
    const label = `${this.footer} · ${this.pageNumber}`;
    const size = 8.5;
    this.page.drawText(clean(label, this.fonts.regular), {
      x: PAGE[0] - MARGIN_X - this.fonts.regular.widthOfTextAtSize(clean(label, this.fonts.regular), size),
      y: MARGIN_BOTTOM / 2,
      size,
      font: this.fonts.regular,
      color: MUTED,
    });
  }

  space(pts: number) {
    this.y -= pts;
  }

  /** Asegura lugar para `pts` puntos; si no entra, pasa de página. */
  ensure(pts: number) {
    if (this.y - pts < MARGIN_BOTTOM) this.newPage();
  }

  text(
    content: string,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; leading?: number } = {}
  ) {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 11;
    const leading = opts.leading ?? size * 1.45;
    const indent = opts.indent ?? 0;
    const maxWidth = this.width - indent;

    for (const rawLine of content.split(/\r?\n/)) {
      const words = clean(rawLine, font).split(/\s+/).filter(Boolean);
      if (!words.length) {
        this.space(leading * 0.6);
        continue;
      }
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          this.drawLine(line, font, size, leading, indent, opts.color);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) this.drawLine(line, font, size, leading, indent, opts.color);
    }
  }

  private drawLine(
    line: string,
    font: PDFFont,
    size: number,
    leading: number,
    indent: number,
    color = TEXT
  ) {
    this.ensure(leading);
    this.y -= leading;
    this.page.drawText(line, { x: MARGIN_X + indent, y: this.y + (leading - size) / 2, size, font, color });
  }

  rule() {
    this.ensure(14);
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: PAGE[0] - MARGIN_X, y: this.y },
      thickness: 0.6,
      color: RULE,
    });
    this.y -= 6;
  }
}

/** Reemplaza caracteres que la fuente no puede dibujar (p. ej. emojis). */
const charsets = new WeakMap<PDFFont, Set<number>>();
function clean(text: string, font: PDFFont): string {
  let set = charsets.get(font);
  if (!set) {
    set = new Set(font.getCharacterSet());
    charsets.set(font, set);
  }
  const s = set;
  return Array.from(text.replace(/\t/g, " "))
    .map((ch) => (s.has(ch.codePointAt(0)!) || ch === " " ? ch : ""))
    .join("");
}

export async function buildNotesPdf(data: NotesExport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, bold, italic] = await Promise.all(
    ["LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf", "LiberationSerif-Italic.ttf"].map(async (f) =>
      doc.embedFont(await readFile(path.join(FONT_DIR, f)), { subset: true })
    )
  );
  doc.setTitle(`Apuntes — ${data.title}`);
  doc.setAuthor("Nodos");
  doc.setLanguage("es");

  const w = new Writer(doc, { regular, bold, italic }, `Nodos · ${data.title}`);

  // Portada breve
  w.text("APUNTES DE LECTURA", { font: regular, size: 9, color: MUTED });
  w.space(6);
  w.text(data.title, { font: bold, size: 21, leading: 27 });
  if (data.author) w.text(data.author, { font: italic, size: 12.5, color: MUTED });
  w.space(4);
  w.text([data.scope, `Exportado el ${data.date}`].filter(Boolean).join(" · "), { size: 10, color: MUTED });
  w.rule();

  const withContent = data.chapters
    .map((c) => ({ ...c, nodes: c.nodes.filter((n) => n.answer.trim() || n.note.trim()) }))
    .filter((c) => c.nodes.length);

  if (!withContent.length) {
    w.space(10);
    w.text("Todavía no hay respuestas ni notas en esta parte.", { font: italic, color: MUTED });
  }

  for (const chapter of withContent) {
    w.ensure(60);
    w.space(16);
    w.text(chapter.title, { font: bold, size: 15, leading: 20 });
    w.space(4);

    for (const node of chapter.nodes) {
      w.ensure(70);
      w.space(12);
      w.text(`Nodo ${node.number} · ${node.title}`, { font: bold, size: 11.5 });
      w.space(3);
      if (node.answer.trim()) {
        w.text("Pregunta", { size: 8.5, color: MUTED });
        w.text(node.prompt, { font: italic, size: 10.5, color: MUTED });
        w.space(4);
        w.text("Mi respuesta", { size: 8.5, color: MUTED });
        w.text(node.answer.trim(), { size: 11 });
      }
      if (node.note.trim()) {
        w.space(4);
        w.text("Mis notas", { size: 8.5, color: MUTED });
        w.text(node.note.trim(), { size: 11 });
      }
    }
  }

  if (data.concepts.length) {
    w.ensure(80);
    w.space(18);
    w.rule();
    w.space(8);
    w.text("Banco de conceptos", { font: bold, size: 15, leading: 20 });

    for (const c of data.concepts) {
      w.ensure(60);
      w.space(10);
      w.text(c.term + (c.pending ? "  (explicación pendiente)" : ""), { font: bold, size: 11.5 });
      if (c.definition.trim()) w.text(c.definition.trim(), { size: 11 });
      w.text(c.location, { size: 9, color: MUTED });
      if (c.quote) w.text(`«${c.quote}»`, { font: italic, size: 10.5, color: MUTED, indent: 12 });
    }
  }

  return doc.save();
}

/** La oración del párrafo donde aparece el término (o el comienzo del párrafo). */
export function quoteFor(term: string, paragraph: string | null): string | null {
  if (!paragraph) return null;
  const clean = paragraph.replace(/^\[nota\]\s*/, "").replace(/^#\s*/, "").replace(/[⟦⟧]/g, "");
  const sentences = clean.match(/[^.!?…]+[.!?…]+["»”')\]]*|[^.!?…]+$/g) ?? [clean];
  const hit = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
  const chosen = (hit ?? sentences[0]).trim();
  const words = chosen.split(/\s+/);
  return words.length > 70 ? words.slice(0, 70).join(" ") + "…" : chosen;
}
