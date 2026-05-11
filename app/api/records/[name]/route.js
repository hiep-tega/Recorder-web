import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { sanitizeName, UPLOADS_DIR } from "../lib";

export const runtime = "nodejs";

function contentTypeForFile(name) {
  if (name.toLowerCase().endsWith(".mp4")) {
    return "video/mp4";
  }
  return "video/webm";
}

export async function GET(request, context) {
  const params = await context.params;
  const fileName = sanitizeName(params.name);
  const filePath = path.join(UPLOADS_DIR, fileName);

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    return Response.json({ error: "Recording not found" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const contentType = contentTypeForFile(fileName);

  if (!range) {
    const stream = createReadStream(filePath);
    return new Response(Readable.toWeb(stream), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  }

  const matches = /bytes=(\d*)-(\d*)/.exec(range);
  if (!matches) {
    return new Response("Invalid range", { status: 416 });
  }

  const start = matches[1] ? Number.parseInt(matches[1], 10) : 0;
  const end = matches[2] ? Number.parseInt(matches[2], 10) : stat.size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stat.size) {
    return new Response("Unsatisfiable range", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${stat.size}`,
      },
    });
  }

  const chunkSize = end - start + 1;
  const partialStream = createReadStream(filePath, { start, end });

  return new Response(Readable.toWeb(partialStream), {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunkSize),
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
