import { createServer } from "node:http";
import { Server } from "socket.io";

/**
 * Game server (milestone 1 stub).
 *
 * This process will own all game state: seats, secret roles, phases, timers,
 * votes, and the host's camera/mic commands to LiveKit. For now it only
 * answers a health check and lets a browser join a room by id, so the
 * Docker setup can be verified end to end.
 */

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(http, { cors: { origin: WEB_ORIGIN } });

io.on("connection", (socket) => {
  socket.on("room:join", (roomId: unknown, ack?: (reply: unknown) => void) => {
    if (typeof roomId !== "string" || !/^[a-z0-9-]{3,40}$/.test(roomId)) {
      ack?.({ ok: false, error: "invalid_room_id" });
      return;
    }
    void socket.join(roomId);
    const size = io.sockets.adapter.rooms.get(roomId)?.size ?? 1;
    ack?.({ ok: true, roomId, people: size });
  });
});

http.listen(PORT, () => {
  console.log(`game server listening on :${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    io.close();
    http.close(() => process.exit(0));
  });
}
