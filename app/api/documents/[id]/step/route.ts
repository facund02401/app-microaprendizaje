import { handleDocumentAction } from "@/lib/ingest/route-handler";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handleDocumentAction(req, id, "step");
}
