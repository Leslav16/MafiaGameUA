import { createServer } from "node:http";
import { randomInt } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { applyMedia, joinToken, LIVEKIT_PUBLIC_URL, removeFromVideo } from "./livekit.js";
import { GameError, Room, cleanName, type MediaPermission, type Viewer } from "./room.js";
import type { HostAction } from "./types.js";

/**
 * Game server: owns every room's state (seats, secret roles, phases, timer)
 * and tells LiveKit which cameras and mics are allowed.
 *
 * Socket events (all take an ack callback):
 *   room:create { name, password }            -> { ok, code, key }
 *   room:peek   { code }                      -> { ok, freeSeats, phase }
 *   room:join   { code, key }                 (come back with a saved key)
 *             | { code, seat, name }          (take a seat as a player)
 *             | { code, host: true, password } (join as the host)
 *                                            -> { ok, key, token, livekitUrl }
 *   host:action HostAction                    -> { ok }
 * The server pushes "room:state" (RoomView) to each socket whenever anything changes.
 */

const PORT = Number(process.env.PORT ?? 4000);
// Comma-separated list of allowed site addresses. Empty: allow any (fine on a home network).
const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ROOM_IDLE_MS = 6 * 60 * 60 * 1000;

const rooms = new Map<string, Room>();
/** Last camera/mic rules sent to LiveKit, per room, to send only what changed. */
const sentMedia = new Map<string, Map<string, MediaPermission>>();

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(http, { cors: { origin: WEB_ORIGIN.length ? WEB_ORIGIN : true } });

interface SocketData {
  code?: string;
  key?: string;
}

type Ack = (reply: Record<string, unknown>) => void;

function newCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)];
    if (!rooms.has(code)) return code;
  }
}

function viewerOf(socket: Socket): { room: Room; viewer: Viewer } | null {
  const { code, key } = socket.data as SocketData;
  const room = code ? rooms.get(code) : undefined;
  if (!room) return null;
  return { room, viewer: room.resolveKey(key) };
}

/** Pushes LiveKit permission changes, then sends every socket in the room its own view. */
async function publish(room: Room): Promise<void> {
  const now = new Map(room.allMedia());
  const before = sentMedia.get(room.code) ?? new Map<string, MediaPermission>();
  const changes = new Map<string, MediaPermission>();
  for (const [identity, media] of now) {
    const old = before.get(identity);
    if (!old || old.cam !== media.cam || old.mic !== media.mic) changes.set(identity, media);
  }
  sentMedia.set(room.code, now);
  // Turning things off must not wait on LiveKit; turning on is sent first so the browser may publish.
  const turningOn = [...changes].some(([id, m]) => (m.cam && !before.get(id)?.cam) || (m.mic && !before.get(id)?.mic));
  if (turningOn) await applyMedia(room.code, changes);
  else void applyMedia(room.code, changes);

  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    const viewer = room.resolveKey((s.data as SocketData).key);
    s.emit("room:state", room.view(viewer));
  }
}

function fail(ack: Ack | undefined, err: unknown) {
  if (err instanceof GameError) ack?.({ ok: false, error: err.message });
  else {
    console.error(err);
    ack?.({ ok: false, error: "server_error" });
  }
}

io.on("connection", (socket) => {
  const data = socket.data as SocketData;

  socket.on("room:create", (payload: unknown, ack?: Ack) => {
    try {
      const { name, password } = (payload ?? {}) as Record<string, unknown>;
      if (typeof password !== "string" || password.length < 4 || password.length > 64) {
        throw new GameError("invalid_password");
      }
      const room = new Room(newCode(), cleanName(name), password);
      rooms.set(room.code, room);
      ack?.({ ok: true, code: room.code, key: room.hostKey });
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("room:peek", (payload: unknown, ack?: Ack) => {
    const code = (payload as { code?: unknown })?.code;
    const room = typeof code === "string" ? rooms.get(code) : undefined;
    if (!room) return ack?.({ ok: false, error: "room_not_found" });
    const view = room.view({ kind: "nobody" });
    ack?.({ ok: true, freeSeats: room.freeSeats(), phase: view.phase, hostName: room.hostName });
  });

  socket.on("room:join", async (payload: unknown, ack?: Ack) => {
    try {
      if (data.code) throw new GameError("already_joined");
      const p = (payload ?? {}) as Record<string, unknown>;
      const room = typeof p.code === "string" ? rooms.get(p.code) : undefined;
      if (!room) throw new GameError("room_not_found");

      let key: string;
      if (typeof p.key === "string") {
        key = p.key;
        if (room.resolveKey(key).kind === "nobody") throw new GameError("key_unknown");
      } else if (p.host === true) {
        if (!room.checkHostPassword(p.password)) throw new GameError("wrong_password");
        key = room.hostKey;
      } else {
        key = room.takeSeat(p.seat, p.name).key;
      }

      const viewer = room.resolveKey(key);
      const who = room.identityOf(viewer)!;
      const token = await joinToken(
        room.code,
        who.identity,
        who.name,
        viewer.kind === "host" ? "host" : room.mediaFor((viewer as { seat: number }).seat),
      );

      data.code = room.code;
      data.key = key;
      room.presence(viewer, 1);
      await socket.join(room.code);
      ack?.({ ok: true, key, token, livekitUrl: LIVEKIT_PUBLIC_URL });
      await publish(room);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("host:action", async (action: HostAction, ack?: Ack) => {
    const ctx = viewerOf(socket);
    if (!ctx || ctx.viewer.kind !== "host") return ack?.({ ok: false, error: "not_host" });
    try {
      const { removed } = ctx.room.apply(action);
      for (const identity of removed) {
        void removeFromVideo(ctx.room.code, identity);
        sentMedia.get(ctx.room.code)?.delete(identity);
      }
      ack?.({ ok: true });
      await publish(ctx.room);
      // Tell removed players' browsers, then drop them from the room channel.
      if (removed.length) {
        for (const s of await io.in(ctx.room.code).fetchSockets()) {
          if (ctx.room.resolveKey((s.data as SocketData).key).kind === "nobody") {
            s.emit("room:kicked");
            s.leave(ctx.room.code);
            (s.data as SocketData).code = undefined;
          }
        }
      }
    } catch (err) {
      fail(ack, err);
    }
  });

  // The browser finished connecting to video: re-send its current rules, in case they
  // changed between issuing its token and the connection.
  socket.on("video:connected", () => {
    const ctx = viewerOf(socket);
    if (!ctx || ctx.viewer.kind !== "player") return;
    const who = ctx.room.identityOf(ctx.viewer);
    if (who) void applyMedia(ctx.room.code, new Map([[who.identity, ctx.room.mediaFor(ctx.viewer.seat)]]));
  });

  socket.on("disconnect", () => {
    const ctx = viewerOf(socket);
    if (!ctx) return;
    ctx.room.presence(ctx.viewer, -1);
    void publish(ctx.room);
  });
});

// Forget rooms nobody has touched for a long time.
setInterval(() => {
  const cutoff = Date.now() - ROOM_IDLE_MS;
  for (const [code, room] of rooms) {
    if (room.lastActive < cutoff && room.hostConnected === 0) {
      rooms.delete(code);
      sentMedia.delete(code);
    }
  }
}, 10 * 60 * 1000).unref();

http.listen(PORT, () => {
  console.log(`game server listening on :${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    io.close();
    http.close(() => process.exit(0));
  });
}
