import type { IncomingMessage, ServerResponse } from "node:http";
import { GameError } from "./errors.js";
import { MAX_MUSIC_BYTES, type Room } from "./room.js";

/** HTTP for the host's night music: PUT uploads the file (host key needed), GET plays it with byte ranges. */

/** Reads a request body up to `limit` bytes; null if it is bigger. */
function readBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) over = true;
      else chunks.push(c);
    });
    req.on("end", () => resolve(over ? null : Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export const MUSIC_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, OPTIONS",
  "access-control-allow-headers": "content-type, x-room-key, x-file-name, range",
  "access-control-expose-headers": "content-length, content-range, accept-ranges",
};

/** The host's night music: the host uploads one file per room; every browser in the room plays it. */
export async function handleMusic(req: IncomingMessage, res: ServerResponse, room: Room | undefined, changed: (room: Room) => void) {
  if (req.method === "OPTIONS") return res.writeHead(204, MUSIC_CORS).end();
  if (!room) return res.writeHead(404, MUSIC_CORS).end();

  if (req.method === "PUT") {
    if (room.resolveKey(req.headers["x-room-key"]).kind !== "host") return res.writeHead(403, MUSIC_CORS).end();
    const body = await readBody(req, MAX_MUSIC_BYTES);
    const reply = (status: number, payload: Record<string, unknown>) =>
      res.writeHead(status, { ...MUSIC_CORS, "content-type": "application/json" }).end(JSON.stringify(payload));
    if (!body) return reply(413, { ok: false, error: "music_too_big" });
    let name = "music";
    try {
      name = decodeURIComponent(String(req.headers["x-file-name"] ?? "music"));
    } catch {}
    try {
      room.setMusic(name, String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase(), body);
    } catch (err) {
      return reply(400, { ok: false, error: err instanceof GameError ? err.message : "server_error" });
    }
    reply(200, { ok: true });
    return changed(room);
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const music = room.getMusic();
    if (!music) return res.writeHead(404, MUSIC_CORS).end();
    const total = music.data.length;
    const head = { ...MUSIC_CORS, "content-type": music.type, "accept-ranges": "bytes", "cache-control": "private, max-age=86400" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : total - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : total - 1;
      start = Math.max(0, start);
      end = Math.min(total - 1, end);
      if (start > end) return res.writeHead(416, { ...head, "content-range": `bytes */${total}` }).end();
      res.writeHead(206, { ...head, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${total}` });
      return res.end(req.method === "HEAD" ? undefined : music.data.subarray(start, end + 1));
    }
    res.writeHead(200, { ...head, "content-length": total });
    return res.end(req.method === "HEAD" ? undefined : music.data);
  }
  res.writeHead(405, MUSIC_CORS).end();
}
