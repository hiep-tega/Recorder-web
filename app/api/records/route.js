import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildAiInsight,
  ensureUploadsDir,
  UPLOADS_DIR,
} from "./lib";

export const runtime = "nodejs";

function toApiItem(meta) {
  const aiSummary = meta.aiInsight?.summary || meta.description;
  return {
    ...meta,
    url: `/api/records/${encodeURIComponent(meta.name)}`,
    aiSummary,
  };
}

function extensionFromType(type) {
  if (type.includes("mp4")) {
    return "mp4";
  }
  return "webm";
}

async function readMetaFiles() {
  await ensureUploadsDir();
  const files = await fs.readdir(UPLOADS_DIR);
  const metaFiles = files.filter((file) => file.endsWith(".json"));

  const items = await Promise.all(
    metaFiles.map(async (metaFile) => {
      const metaPath = path.join(UPLOADS_DIR, metaFile);
      const raw = await fs.readFile(metaPath, "utf-8");
      const parsed = JSON.parse(raw);
      const videoPath = path.join(UPLOADS_DIR, parsed.name);
      const exists = await fs
        .access(videoPath)
        .then(() => true)
        .catch(() => false);
      return exists ? parsed : null;
    }),
  );

  return items.filter((item) => item !== null);
}

export async function GET() {
  const records = await readMetaFiles();
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({
    records: records.map(toApiItem),
  });
}

export async function POST(request) {
  await ensureUploadsDir();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const ext = extensionFromType(file.type || "video/webm");
  const base = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const filename = `${base}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, filename), bytes);

  const title = String(form.get("title") || `Recording ${new Date().toLocaleString()}`);
  const description = String(form.get("description") || "Gameplay capture");
  const sourceUrl = String(form.get("sourceUrl") || "about:blank");
  const sizeLabel = String(form.get("sizeLabel") || "Desktop (1200x675)");
  const settingsSnapshotRaw = String(form.get("settingsSnapshot") || "");

  const settingsSnapshot = settingsSnapshotRaw
    ? JSON.parse(settingsSnapshotRaw)
    : undefined;

  const meta = {
    name: filename,
    title,
    description,
    sourceUrl,
    sizeLabel,
    createdAt: new Date().toISOString(),
    settingsSnapshot,
    chatHistory: [],
  };

  meta.aiInsight = buildAiInsight(meta);

  await fs.writeFile(
    path.join(UPLOADS_DIR, `${base}.json`),
    JSON.stringify(meta, null, 2),
    "utf-8",
  );

  return Response.json({
    record: toApiItem(meta),
  });
}
