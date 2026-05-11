import {
  readRecordMetaByFileName,
  sanitizeName,
  writeRecordMetaByFileName,
} from "../../lib";

export const runtime = "nodejs";

export async function POST(_request, context) {
  const params = await context.params;
  const fileName = sanitizeName(params.name);

  const meta = await readRecordMetaByFileName(fileName);
  if (!meta) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }

  meta.chatHistory = [];
  await writeRecordMetaByFileName(fileName, meta);

  return Response.json({
    detail: {
      ...meta,
      url: `/api/records/${encodeURIComponent(meta.name)}`,
      aiSummary: meta.aiInsight?.summary || meta.description,
    },
  });
}
