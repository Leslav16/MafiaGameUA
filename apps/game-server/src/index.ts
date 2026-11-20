import { createServer } from "node:http";
import { randomInt } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { applyMedia, checkVideoServer, closeVideoRoom, joinToken, LIVEKIT_PUBLIC_URL, removeFromVideo } from "./livekit.js";
import { GameError, Room, cleanName, type MediaPermission, type Viewer } from "./room.js";
import type { HostAction } from "./types.js";

/**
 * Game server: owns every room's state (seats, secret roles, phases, timer)
 * and tells LiveKit which cameras and mics are allowed.
 *
 * Socket events (all take an ack callback):
 *   room:create { name, password, isPublic? } -> { ok, code, key }
 *   room:peek   { code }                      -> { ok, freeSeats, phase, locked }
 *   room:join   { code, key }                 (come back with a saved key)
 *             | { code, name, seat?, roomPassword? } (join as a player: first free seat, or "4. Name" / seat if free;
 *                                               roomPassword when the host locked the room, also for watching)
 *             | { code, host: true, password } (join as the host)
 *             | { code, name, watch: true }   (watch without a seat, at any time)
 *                                            -> { ok, key, as: "host" | "player" | "spectator", token, livekitUrl }
 * HTTP GET /rooms -> RoomSummary[] of the tables their hosts made public (for the home page).
 *   host:action HostAction                    -> { ok }
 *   me:rename   { name }                      -> { ok }   (own name; "4. Name" also moves a player to seat 4)
 *   me:seat     { seat }                      -> { ok }   (a player moves to a free seat number)
 * The server pushes "room:closed" when the host closes the room (or it is dropped): go back home.
 * The server pushes "room:state" (RoomView) to each socket whenever anything changes.
 */

const PORT = Number(process.env.PORT ?? 4000);
// Comma-separated list of allowed site addresses. Empty: allow any (fine on a home network).
const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ROOM_IDLE_MS = 6 * 60 * 60 * 1000;
/** A table leaves the home page list this long after the host's last tab closed (a reload comes back sooner). */
const HOST_GRACE_MS = 30 * 1000;
/** A room whose host has been gone this long is closed. */
const HOST_GONE_MS = 30 * 60 * 1000;

const rooms = new Map<string, Room>();
/** Last camera/mic rules sent to LiveKit, per room, to send only what changed. */
const sentMedia = new Map<string, Map<string, MediaPermission>>();

/** Wrong host passwords per address and room: after 5 in 10 minutes, that address waits. */
const PASSWORD_TRIES = 5;
const PASSWORD_WINDOW_MS = 10 * 60 * 1000;
const passwordFails = new Map<string, number[]>();

function passwordBlocked(id: string, now = Date.now()): boolean {
  const recent = (passwordFails.get(id) ?? []).filter((t) => t > now - PASSWORD_WINDOW_MS);
  if (recent.length) passwordFails.set(id, recent);
  else passwordFails.delete(id);
  return recent.length >= PASSWORD_TRIES;
}

/**
 * The player's own address. Through the internet link every connection reaches the game
 * server from the gateway, so the real address comes from Cloudflare's header
 * (or the gateway's X-Forwarded-For).
 */
function clientAddress(socket: Socket): string {
  const h = socket.handshake.headers;
  const cf = h["cf-connecting-ip"];
  if (typeof cf === "string" && cf) return cf;
  const xff = h["x-forwarded-for"];
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim();
  return first || socket.handshake.address;
}

function passwordFailed(id: string, now = Date.now()) {
  passwordFails.set(id, [...(passwordFails.get(id) ?? []), now]);
}

const http = createServer((req, res) => {
  if (req.url === "/rooms" && req.method === "GET") {
    const list = [...rooms.values()]
      .filter((r) => r.listed(Date.now(), HOST_GRACE_MS))
      .map((r) => r.summary())
      .sort((a, b) => b.players - a.players);
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end(JSON.stringify(list));
    return;
  }
  if (req.url === "/video-check" && req.method === "GET") {
    // Used by start-online.bat to tell wrong LiveKit keys apart from a blocked LiveKit address.
    void checkVideoServer().then((video) => {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ video }));
    });
    return;
  }
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

/** Closes a room for good: every browser in it goes back home, and the video room ends. */
async function closeRoom(room: Room): Promise<void> {
  rooms.delete(room.code);
  sentMedia.delete(room.code);
  for (const s of await io.in(room.code).fetchSockets()) {
    s.emit("room:closed");
    s.leave(room.code);
    (s.data as SocketData).code = undefined;
    (s.data as SocketData).key = undefined;
  }
  await closeVideoRoom(room.code);
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
      const { name, password, isPublic } = (payload ?? {}) as Record<string, unknown>;
      if (typeof password !== "string" || password.length < 4 || password.length > 64) {
        throw new GameError("invalid_password");
      }
      const room = new Room(newCode(), cleanName(name), password, isPublic === true);
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
    ack?.({ ok: true, freeSeats: room.freeSeats(), phase: view.phase, hostName: room.hostName, locked: room.locked });
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
        const tries = `${clientAddress(socket)}|${room.code}`;
        if (passwordBlocked(tries)) throw new GameError("too_many_tries");
        if (!room.checkHostPassword(p.password)) {
          passwordFailed(tries);
          throw new GameError("wrong_password");
        }
        passwordFails.delete(tries);
        key = room.hostKey;
      } else if (room.locked && !room.checkJoinPassword(p.roomPassword)) {
        // Players and spectators of a locked room need its password; the same limit on wrong tries as the host's.
        const tries = `${clientAddress(socket)}|${room.code}|room`;
        if (passwordBlocked(tries)) throw new GameError("too_many_tries");
        if (typeof p.roomPassword === "string" && p.roomPassword) passwordFailed(tries);
        throw new GameError(p.roomPassword ? "wrong_room_password" : "room_locked");
      } else if (p.watch === true) {
        key = room.addSpectator(p.name).key;
      } else {
        key = room.takeSeat(p.seat, p.name).key;
      }

      const viewer = room.resolveKey(key);
      const who = room.identityOf(viewer)!;
      const token = await joinToken(
        room.code,
        who.identity,
        who.name,
        viewer.kind === "host"
          ? "host"
          : viewer.kind === "spectator"
            ? "spectator"
            : room.mediaFor((viewer as { seat: number }).seat),
      );

      data.code = room.code;
      data.key = key;
      room.presence(viewer, 1);
      await socket.join(room.code);
      ack?.({ ok: true, key, as: viewer.kind, token, livekitUrl: LIVEKIT_PUBLIC_URL });
      await publish(room);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("host:action", async (action: HostAction, ack?: Ack) => {
    const ctx = viewerOf(socket);
    if (!ctx || ctx.viewer.kind !== "host") return ack?.({ ok: false, error: "not_host" });
    try {
      if ((action as { type?: unknown })?.type === "closeRoom") {
        ack?.({ ok: true });
        return await closeRoom(ctx.room);
      }
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

  socket.on("me:rename", async (payload: unknown, ack?: Ack) => {
    const ctx = viewerOf(socket);
    if (!ctx) return ack?.({ ok: false, error: "not_joined" });
    try {
      ctx.room.rename(ctx.viewer, (payload as { name?: unknown })?.name);
      ack?.({ ok: true });
      await publish(ctx.room);
    } catch (err) {
      fail(ack, err);
    }
  });

  // A living player votes for one of today's candidates (or takes the vote back with null).
  socket.on("me:vote", async (payload: unknown, ack?: Ack) => {
    const ctx = viewerOf(socket);
    if (!ctx) return ack?.({ ok: false, error: "not_joined" });
    try {
      ctx.room.castVote(ctx.viewer, (payload as { candidate?: unknown })?.candidate ?? null);
      ack?.({ ok: true });
      await publish(ctx.room);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("me:seat", async (payload: unknown, ack?: Ack) => {
    const ctx = viewerOf(socket);
    if (!ctx) return ack?.({ ok: false, error: "not_joined" });
    try {
      ctx.room.chooseSeat(ctx.viewer, (payload as { seat?: unknown })?.seat);
      ack?.({ ok: true });
      await publish(ctx.room);
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

// Forget rooms nobody has touched for a long time, and close rooms whose host is long gone.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const hostGone = room.hostLeftAt !== null && now - room.hostLeftAt > HOST_GONE_MS;
    const idle = room.lastActive < now - ROOM_IDLE_MS && room.hostConnected === 0;
    if (hostGone || idle) void closeRoom(room);
  }
}, 60 * 1000).unref();

http.listen(PORT, () => {
  console.log(`game server listening on :${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    io.close();
    http.close(() => process.exit(0));
  });
}
