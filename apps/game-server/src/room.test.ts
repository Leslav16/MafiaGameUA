import { test } from "node:test";
import assert from "node:assert/strict";
import { GameError, Room } from "./room.js";

function fullRoom(players = 11) {
  const room = new Room("abc123", "Host", "secret");
  for (let s = 1; s <= players; s++) room.takeSeat(s, `Player ${s}`);
  return room;
}

test("host password is checked", () => {
  const room = new Room("abc123", "Host", "secret");
  assert.equal(room.checkHostPassword("secret"), true);
  assert.equal(room.checkHostPassword("wrong"), false);
});

test("a seat can only be taken once", () => {
  const room = fullRoom(1);
  assert.throws(() => room.takeSeat(1, "Other"), GameError);
  assert.deepEqual(room.freeSeats(), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("dealing roles: one Don, the right number of mafia, one Sheriff", () => {
  const room = fullRoom();
  room.apply({ type: "dealRoles", mafia: 3, sheriff: true });
  const roles = room.view({ kind: "host" }).seats.map((s) => s.role);
  assert.equal(roles.filter((r) => r === "don").length, 1);
  assert.equal(roles.filter((r) => r === "mafia").length, 2);
  assert.equal(roles.filter((r) => r === "sheriff").length, 1);
  assert.equal(roles.filter((r) => r === "civilian").length, 7);
});

test("too many mafia is refused", () => {
  const room = fullRoom(6);
  assert.throws(() => room.apply({ type: "dealRoles", mafia: 3, sheriff: true }), /invalid_role_mix/);
});

test("players see only their own role, mafia see each other, host sees all", () => {
  const room = fullRoom();
  room.apply({ type: "dealRoles", mafia: 3, sheriff: true });
  const all = room.view({ kind: "host" }).seats;
  const civilian = all.find((s) => s.role === "civilian")!.seat;
  const civView = room.view({ kind: "player", seat: civilian });
  assert.equal(civView.seats.filter((s) => s.role).length, 1);
  assert.deepEqual(civView.me, { kind: "player", seat: civilian, role: "civilian", teammates: [] });

  const don = all.find((s) => s.role === "don")!.seat;
  const donView = room.view({ kind: "player", seat: don });
  assert.equal(donView.seats.filter((s) => s.role).length, 3);
  assert.equal(donView.me.kind === "player" && donView.me.teammates.length, 2);

  room.apply({ type: "endGame", winner: "town" });
  assert.equal(room.view({ kind: "player", seat: civilian }).seats.filter((s) => s.role).length, 11);
});

test("night turns everyone's camera and mic off, day turns them back on for the living", () => {
  const room = fullRoom();
  room.apply({ type: "dealRoles", mafia: 3, sheriff: true });
  room.apply({ type: "setPhase", phase: "night" });
  assert.ok([...room.allMedia().values()].every((m) => !m.cam && !m.mic));
  room.apply({ type: "kill", seat: 4 });
  room.apply({ type: "setPhase", phase: "day" });
  assert.deepEqual(room.mediaFor(4), { cam: false, mic: false });
  assert.deepEqual(room.mediaFor(5), { cam: true, mic: true });
  assert.equal(room.view({ kind: "host" }).day, 1);
  room.apply({ type: "revive", seat: 4 });
  assert.deepEqual(room.mediaFor(4), { cam: true, mic: true });
});

test("host switch-offs stay until the host switches back on", () => {
  const room = fullRoom();
  room.apply({ type: "setCam", seat: 2, on: false });
  room.apply({ type: "setPhase", phase: "night" });
  room.apply({ type: "setPhase", phase: "day" });
  assert.deepEqual(room.mediaFor(2), { cam: false, mic: true });
  room.apply({ type: "setCam", seat: 2, on: true });
  assert.deepEqual(room.mediaFor(2), { cam: true, mic: true });
});

test("mute all, unmute all, and giving the floor", () => {
  const room = fullRoom();
  room.apply({ type: "muteAll" });
  assert.ok([...room.allMedia().values()].every((m) => !m.mic && m.cam));
  room.apply({ type: "unmuteAll" });
  room.apply({ type: "setFloor", seat: 3 }, 1_000);
  assert.equal(room.mediaFor(3).mic, true);
  assert.equal(room.mediaFor(4).mic, false);
  const timer = room.view({ kind: "host" }, 1_000).timer;
  assert.equal(timer.endsAt, 61_000);
  room.apply({ type: "setFloor", seat: null }, 11_000);
  assert.equal(room.mediaFor(4).mic, true);
  assert.equal(room.view({ kind: "host" }).timer.remainingMs, 50_000);
});

test("timer start, pause and reset", () => {
  const room = fullRoom(1);
  room.apply({ type: "timer", op: "reset", seconds: 30 }, 0);
  room.apply({ type: "timer", op: "start" }, 0);
  room.apply({ type: "timer", op: "pause" }, 10_000);
  assert.deepEqual(room.view({ kind: "host" }).timer, { durationMs: 30_000, remainingMs: 20_000, endsAt: null });
  room.apply({ type: "timer", op: "reset" }, 10_000);
  assert.equal(room.view({ kind: "host" }).timer.remainingMs, 30_000);
});

test("fouls stay between 0 and 4", () => {
  const room = fullRoom(1);
  for (let i = 0; i < 6; i++) room.apply({ type: "foul", seat: 1, delta: 1 });
  assert.equal(room.view({ kind: "host" }).seats[0].fouls, 4);
  room.apply({ type: "foul", seat: 1, delta: -1 });
  assert.equal(room.view({ kind: "host" }).seats[0].fouls, 3);
});

test("kick frees the seat and the old key stops working", () => {
  const room = new Room("abc123", "Host", "secret");
  const { key, identity } = room.takeSeat(5, "Ann");
  assert.deepEqual(room.resolveKey(key), { kind: "player", seat: 5 });
  const { removed } = room.apply({ type: "kick", seat: 5 });
  assert.deepEqual(removed, [identity]);
  assert.deepEqual(room.resolveKey(key), { kind: "nobody" });
  assert.ok(room.freeSeats().includes(5));
});

test("move a player to a free seat or swap two players", () => {
  const room = new Room("abc123", "Host", "secret");
  const a = room.takeSeat(1, "Ann");
  const b = room.takeSeat(2, "Bob");
  room.apply({ type: "moveSeat", from: 1, to: 2 });
  assert.deepEqual(room.resolveKey(a.key), { kind: "player", seat: 2 });
  assert.deepEqual(room.resolveKey(b.key), { kind: "player", seat: 1 });
  room.apply({ type: "moveSeat", from: 1, to: 7 });
  assert.deepEqual(room.resolveKey(b.key), { kind: "player", seat: 7 });
  assert.ok(room.freeSeats().includes(1));
});

test("new game keeps the players and clears roles, deaths and fouls", () => {
  const room = fullRoom();
  room.apply({ type: "dealRoles", mafia: 3, sheriff: true });
  room.apply({ type: "kill", seat: 1 });
  room.apply({ type: "foul", seat: 2, delta: 1 });
  room.apply({ type: "endGame", winner: "mafia" });
  room.apply({ type: "newGame" });
  const v = room.view({ kind: "host" });
  assert.equal(v.phase, "lobby");
  assert.equal(v.rolesDealt, false);
  assert.ok(v.seats.every((s) => s.alive && s.fouls === 0 && !s.role && s.name));
});
