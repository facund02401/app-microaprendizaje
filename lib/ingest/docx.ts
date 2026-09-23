import mammoth from "mammoth";
import { htmlToParagraphs } from "./html";

export async function docxToParagraphs(buffer: Buffer): Promise<string[]> {
  const { value } = await mammoth.convertToHtml(
    { buffer },
    { ignoreEmptyParagraphs: true }
  );
  return htmlToParagraphs(value);
}
