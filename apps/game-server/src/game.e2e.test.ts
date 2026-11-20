/**
 * A whole game played by robots over the real game server: one host and eleven players connect
 * with socket.io, the roles are dealt, the town introduces itself, the mafia shoot at night, the
 * Don and the Sheriff check, the Doctor heals, the town votes the mafia out one by one, and the
 * host ends the game. Along the way it checks that nobody sees a role they should not.
 *
 * The video server is not needed: tokens are signed locally and camera rules that can't reach
 * LiveKit are only logged.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { io, type Socket } from "socket.io-client";
import type { RoomView } from "./types.js";

const require = createRequire(import.meta.url);
const serverDir = fileURLToPath(new URL("..", import.meta.url));
const PORT = 41000 + Math.floor(Math.random() * 2000);
const URL_ = `http://127.0.0.1:${PORT}`;

let server: ChildProcess;

before(async () => {
  server = spawn(process.execPath, [require.resolve("tsx/cli"), "src/index.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      LIVEKIT_KEYS: "robots: a-secret-for-the-robot-game-test-only-1234",
      // Nothing listens here: the camera rules fail quietly, the game goes on.
      LIVEKIT_URL: "http://127.0.0.1:9",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the game server did not start")), 20000);
    server.stdout!.on("data", (d: Buffer) => {
      if (d.toString().includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on("exit", (c) => reject(new Error(`the game server stopped (${c})`)));
  });
});

after(() => {
  server?.kill();
});

type Reply = { ok: boolean; error?: string; [k: string]: unknown };

/** A robot at the table: its socket and the last state the server sent it. */
class Robot {
  socket: Socket;
  state: RoomView | null = null;
  seen: RoomView[] = [];
  constructor(public label: string) {
    this.socket = io(URL_, { transports: ["websocket"], reconnection: false });
    this.socket.on("room:state", (s: RoomView) => {
      this.state = s;
      this.seen.push(s);
    });
  }
  ready() {
    return new Promise<void>((resolve, reject) => {
      if (this.socket.connected) return resolve();
      this.socket.once("connect", () => resolve());
      this.socket.once("connect_error", reject);
    });
  }
  /** Sends an event and resolves with the reply; fails the test on an error reply. */
  ask(event: string, payload: unknown): Promise<Reply> {
    return new Promise((resolve, reject) => {
      this.socket.timeout(5000).emit(event, payload, (err: Error | null, reply: Reply) => {
        if (err) reject(err);
        else if (!reply.ok) reject(new Error(`${this.label} ${event} ${JSON.stringify(payload)}: ${reply.error}`));
        else resolve(reply);
      });
    });
  }
}

test("twelve robots play a whole game through the real server", { timeout: 60000 }, async () => {
  const host = new Robot("host");
  await host.ready();
  const created = await host.ask("room:create", { name: "Robot host", password: "robot-pass", isPublic: false });
  const code = created.code as string;

  /** Waits until the host has seen the server's answer to the last action. */
  const settle = async () => {
    const before = host.seen.length;
    for (let i = 0; i < 100 && host.seen.length === before; i++) await new Promise((r) => setTimeout(r, 10));
    await new Promise((r) => setTimeout(r, 20));
  };
  const act = async (action: Record<string, unknown>) => {
    await host.ask("host:action", action);
    await settle();
  };

  await host.ask("room:join", { code, key: created.key });
  const players: Robot[] = [];
  for (let seat = 1; seat <= 11; seat++) {
    const p = new Robot(`seat ${seat}`);
    await p.ready();
    await p.ask("room:join", { code, name: `Robot ${seat}`, seat });
    players.push(p);
  }
  await settle();
  const view = () => host.state!;
  assert.equal(view().seats.filter((s) => s.name).length, 11, "eleven players sit at the table");

  await act({ type: "startGame" });
  const roles = new Map(view().seats.map((s) => [s.seat, s.role!]));
  const seatsOf = (role: string) => [...roles].filter(([, r]) => r === role).map(([s]) => s);
  const mafiaSeats = [...seatsOf("don"), ...seatsOf("mafia")];
  assert.equal(mafiaSeats.length, 3);
  assert.equal(seatsOf("sheriff").length, 1);
  assert.equal(seatsOf("doctor").length, 1);

  const alive = (seat: number) => view().seats[seat - 1].alive;
  const robot = (seat: number) => players[seat - 1];
  let nights = 0;
  let checks = 0;

  for (let step = 0; step < 400 && !view().flow.suggestedWinner; step++) {
    const f = view().flow;
    if (f.stage === "speeches" && f.round === "day" && f.nominees.length === 0) {
      // The town has figured out one of the mafia.
      await act({ type: "nominate", seat: mafiaSeats.find(alive)! });
      continue;
    }
    if (f.stage === "voting" && f.voting && !f.voting.result) {
      const candidate = f.voting.candidates?.[0] ?? f.nominees[0];
      for (const [seat] of roles) if (alive(seat)) await robot(seat).ask("me:vote", { candidate });
      await settle();
      await act({ type: "countVotes" });
      continue;
    }
    if (f.stage === "night" && f.nightStep && f.nightStep !== "asleep") {
      const stepNow = f.nightStep;
      if (stepNow === "mafia") {
        nights++;
        const target = seatsOf("civilian").find(alive)!;
        // Every living mafia picks the same civilian: the Don's pick stands, and without the Don they agree.
        for (const m of mafiaSeats.filter(alive)) await robot(m).ask("me:night", { seat: target });
      } else {
        const actor = seatsOf(stepNow)[0];
        if (alive(actor)) {
          const options =
            stepNow === "doctor" ? [actor, ...[...roles.keys()].filter((s) => s !== actor)] : stepNow === "sheriff" ? mafiaSeats : seatsOf("sheriff");
          for (const target of options.filter(alive)) {
            try {
              await robot(actor).ask("me:night", { seat: target });
              if (stepNow !== "doctor") checks++;
              break;
            } catch {
              // A blocked heal: try the next player.
            }
          }
        }
      }
      await settle();
      await act({ type: "nightPick", seat: view().flow.night?.suggested ?? null });
      continue;
    }
    await act({ type: "next" });
  }

  assert.equal(view().flow.suggestedWinner, "town", "the town voted out every mafia");
  assert.ok(nights >= 3, "at least three nights were played");
  assert.ok(checks >= 2, "the Don and the Sheriff checked");
  for (const m of mafiaSeats) assert.equal(view().seats[m - 1].out, "voted");

  // Secrets held all game: a civilian never saw another player's role, the Sheriff's
  // answers went only to the Sheriff.
  const civilian = robot(seatsOf("civilian")[0]);
  for (const s of civilian.seen) {
    if (s.phase === "ended") continue;
    for (const seat of s.seats) if (seat.seat !== seatsOf("civilian")[0]) assert.equal(seat.role ?? null, null);
    assert.equal(s.flow.night, null, "players never see the host's night record");
  }

  await act({ type: "endGame", winner: "town" });
  for (const p of players) {
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(p.state!.winner, "town");
    assert.ok(p.state!.seats.every((s) => s.role), "after the game everyone sees all roles");
  }

  for (const r of [host, ...players]) r.socket.disconnect();
});

test("one address can open only a few rooms in a row", { timeout: 20000 }, async () => {
  const r = new Robot("room maker");
  await r.ready();
  // The robot game above already opened one room from this address.
  const results: string[] = [];
  for (let i = 0; i < 6; i++) {
    try {
      await r.ask("room:create", { name: `Host ${i}`, password: "robot-pass" });
      results.push("ok");
    } catch (e) {
      results.push((e as Error).message.split(": ").at(-1)!);
    }
  }
  assert.deepEqual(results, ["ok", "ok", "ok", "ok", "too_many_rooms", "too_many_rooms"]);
  r.socket.disconnect();
});
