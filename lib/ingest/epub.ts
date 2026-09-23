import JSZip from "jszip";
import { parse } from "node-html-parser";
import { htmlToParagraphs } from "./html";
import { normalizeSpaces } from "./text";

export interface EpubResult {
  paragraphs: string[];
  title?: string;
  author?: string;
}

function resolvePath(base: string, href: string): string {
  const parts = (base ? base.split("/") : []).concat(decodeURIComponent(href.split("#")[0]).split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

/** EPUB = zip de páginas XHTML; se leen en el orden de lectura ("spine"). */
export async function epubToParagraphs(buffer: Buffer): Promise<EpubResult> {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("El EPUB no tiene índice interno (container.xml).");

  const opfPath = parse(container).querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("El EPUB no indica su contenido (rootfile).");
  const opfXml = await zip.file(opfPath)?.async("string");
  if (!opfXml) throw new Error("No se encontró el contenido del EPUB.");

  const opf = parse(opfXml);
  const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";

  const manifest = new Map<string, string>();
  for (const item of opf.querySelectorAll("item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) manifest.set(id, href);
  }

  const paragraphs: string[] = [];
  for (const ref of opf.querySelectorAll("itemref")) {
    if (ref.getAttribute("linear") === "no") continue;
    const href = manifest.get(ref.getAttribute("idref") ?? "");
    if (!href) continue;
    const html = await zip.file(resolvePath(baseDir, href))?.async("string");
    if (html) paragraphs.push(...htmlToParagraphs(html));
  }

  const meta = (tag: string) => {
    const el = opf.getElementsByTagName(tag)[0];
    const text = el ? normalizeSpaces(el.textContent) : "";
    return text || undefined;
  };

  return { paragraphs, title: meta("dc:title"), author: meta("dc:creator") };
}
