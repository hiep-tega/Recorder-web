import {
  buildAssistantReply,
  readRecordMetaByFileName,
  sanitizeName,
  writeRecordMetaByFileName,
} from "../../lib";

export const runtime = "nodejs";

export async function POST(request, context) {
  const params = await context.params;
  const fileName = sanitizeName(params.name);

  const meta = await readRecordMetaByFileName(fileName);
  if (!meta) {
    return Response.json({ error: "Record not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userMessage = { role: "user", content: prompt, createdAt: now };
  const assistantMessage = {
    role: "assistant",
    content: buildAssistantReply(meta, prompt),
    createdAt: new Date().toISOString(),
  };

  const history = meta.chatHistory || [];
  meta.chatHistory = [...history, userMessage, assistantMessage].slice(-80);
  meta.settingsSnapshot = body.settingsSnapshot || meta.settingsSnapshot;

  await writeRecordMetaByFileName(fileName, meta);

  return Response.json({
    detail: {
      ...meta,
      url: `/api/records/${encodeURIComponent(meta.name)}`,
      aiSummary: meta.aiInsight?.summary || meta.description,
    },
  });
}
