import {
  readRecordMetaByFileName,
  sanitizeName,
} from "../../lib";

export const runtime = "nodejs";

export async function GET(_request, context) {
  const params = await context.params;
  const fileName = sanitizeName(params.name);

  const meta = await readRecordMetaByFileName(fileName);
  if (!meta) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }

  return Response.json({
    detail: {
      ...meta,
      url: `/api/records/${encodeURIComponent(meta.name)}`,
      aiSummary: meta.aiInsight?.summary || meta.description,
    },
  });
}
