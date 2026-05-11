import { promises as fs } from "node:fs";
import path from "node:path";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function sanitizeName(rawName) {
  return path.basename(rawName);
}

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function baseNameFromFile(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

export function metaPathFromFile(fileName) {
  return path.join(UPLOADS_DIR, `${baseNameFromFile(fileName)}.json`);
}

export async function readRecordMetaByFileName(fileName) {
  await ensureUploadsDir();
  const metaPath = metaPathFromFile(fileName);
  const raw = await fs.readFile(metaPath, "utf-8").catch(() => null);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

export async function writeRecordMetaByFileName(fileName, meta) {
  await ensureUploadsDir();
  const metaPath = metaPathFromFile(fileName);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
}

export function buildAiInsight(meta) {
  const source = meta.sourceUrl === "about:blank" ? "captured screen" : meta.sourceUrl;
  const now = new Date().toISOString();

  return {
    summary: `${meta.title}: ${meta.description}`,
    analysis: [
      `Detected scene: ${meta.title}.`,
      `Source: ${source}.`,
      `Preset: ${meta.sizeLabel}.`,
    ].join("\n"),
    model: "local-heuristic-v1",
    updatedAt: now,
  };
}

export function buildAssistantReply(meta, userPrompt) {
  const firstLine = meta.aiInsight?.summary || `${meta.title} was captured successfully.`;
  return [
    `Context: ${firstLine}`,
    `You asked: ${userPrompt}`,
    "Answer: This recording is stored in uploads with preserved AI summary and chat history. You can continue this thread in future sessions.",
  ].join("\n");
}
