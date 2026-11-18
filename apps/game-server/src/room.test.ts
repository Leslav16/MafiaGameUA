import { test } from "node:test";
import assert from "node:assert/strict";
import { GameError, Room, splitSeatFromName } from "./room.js";
import { countVotes, healBlocked, speakingOrder, suggestWinner } from "./rules.js";
import type { Role } from "./types.js";

function fullRoom(players = 11) {
  const room = new Room("abc123", "Host", "secret");
  for (let s = 1; s <= players; s++) room.takeSeat(s, `Player ${s}`);
  return room;
}

const host = { kind: "host" } as const;
const flow = (room: Room) => room.view(host).flow;
const roleSeat = (room: Room, role: Role) => room.view(host).seats.find((s) => s.role === role)!.seat;
/** Presses "next" until the stage changes (finishes a round of speeches). */
function nextUntil(room: Room, stage: string) {
  for (let i = 0; i < 40 && flow(room).stage !== stage; i++) room.apply({ type: "next" });
  assert.equal(flow(room).stage, stage);
}
/** Plays a night where nobody is shot, checked or healed. */
function quietNight(room: Room) {
  while (flow(room).stage === "night") room.apply({ type: "nightPick", seat: null });
  assert.equal(flow(room).stage, "morning");
}

// ---- joining and seats ----------------------------------------------------

test("host password is checked", () => {
  const room = new Room("abc123", "Host", "secret");
  assert.equal(room.checkHostPassword("secret"), true);
  assert.equal(room.checkHostPassword("wrong"), false);
});

test("players join in any order and get the first free seat; a full room refuses", () => {
  const room = new Room("abc123", "Host", "secret");
  assert.equal(room.takeSeat(undefined, "Ann").seat, 1);
  assert.equal(room.takeSeat(undefined, "7. Cat").seat, 7);
  assert.equal(room.view(host).seats[6].name, "Cat");
  assert.equal(room.takeSeat(undefined, "7. Dan").seat, 2);
  for (let i = 0; i < 8; i++) room.takeSeat(undefined, `P${i}`);
  assert.throws(() => room.takeSeat(undefined, "Late"), /room_full/);
});

test("seat number = place: moving onto a taken seat swaps, and seats lock when the game starts", () => {
  const room = new Room("abc123", "Host", "secret");
  const ann = room.takeSeat(undefined, "Ann");
  const bob = room.takeSeat(undefined, "Bob");
  room.takeSeat(undefined, "Cat");
  room.chooseSeat({ kind: "player", seat: 1 }, 2);
  assert.deepEqual(room.resolveKey(ann.key), { kind: "player", seat: 2 });
  assert.deepEqual(room.resolveKey(bob.key), { kind: "player", seat: 1 });
  room.apply({ type: "moveSeat", from: 2, to: 9 });
  assert.deepEqual(room.resolveKey(ann.key), { kind: "player", seat: 9 });
  room.rename({ kind: "player", seat: 9 }, "5. Annie");
  assert.deepEqual(room.resolveKey(ann.key), { kind: "player", seat: 5 });
  room.apply({ type: "startGame" });
  assert.throws(() => room.apply({ type: "moveSeat", from: 1, to: 4 }), /seats_locked/);
});

test("seat numbers are read from the front of a name", () => {
  for (const [input, seat, name] of [
    ["4. Olena", 4, "Olena"],
    ["4) Olena", 4, "Olena"],
    ["4 - Olena", 4, "Olena"],
    ["11 Olena", 11, "Olena"],
    ["4.Olena", 4, "Olena"],
    ["12. Olena", null, "12. Olena"],
    ["Olena 4", null, "Olena 4"],
    ["007", null, "007"],
  ] as const) {
    assert.deepEqual(splitSeatFromName(input), { seat, name }, input);
  }
});

test("players and the host can change their names", () => {
  const room = fullRoom(2);
  room.rename({ kind: "player", seat: 2 }, "  New   name ");
  room.rename(host, "Boss");
  const v = room.view(host);
  assert.equal(v.seats[1].name, "New name");
  assert.equal(v.host.name, "Boss");
  assert.throws(() => room.rename({ kind: "player", seat: 1 }, "   "), /invalid_name/);
});

test("kick frees the seat and the old key stops working", () => {
  const room = new Room("abc123", "Host", "secret");
  const { key, identity } = room.takeSeat(5, "Ann");
  const { removed } = room.apply({ type: "kick", seat: 5 });
  assert.deepEqual(removed, [identity]);
  assert.deepEqual(room.resolveKey(key), { kind: "nobody" });
  assert.ok(room.freeSeats().includes(5));
});

// ---- roles ------------------------------------------------------------------

test("starting deals Don, 2 Mafia, Sheriff, Doctor and 6 civilians and opens the introduction round", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  const v = room.view(host);
  const count = (r: string) => v.seats.filter((s) => s.role === r).length;
  assert.deepEqual([count("don"), count("mafia"), count("sheriff"), count("doctor"), count("civilian")], [1, 2, 1, 1, 6]);
  assert.equal(v.flow.stage, "speeches");
  assert.equal(v.flow.round, "intro");
  assert.deepEqual(v.flow.speakers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(v.floorSeat, 1);
  assert.ok(v.timer.endsAt !== null, "the minute starts by itself");
  assert.throws(() => room.apply({ type: "startGame" }), /game_in_progress/);
});

test("smaller test tables keep the town ahead of the mafia", () => {
  for (let n = 3; n <= 11; n++) {
    const deck = Room.deck(n);
    const mafia = deck.filter((r) => r === "don" || r === "mafia").length;
    assert.equal(deck.length, n);
    assert.ok(mafia * 2 < n, `n=${n}`);
  }
  assert.throws(() => Room.deck(2), /not_enough_players/);
});

test("players see only their own role, mafia see each other, host sees all", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  const civilian = roleSeat(room, "civilian");
  const civView = room.view({ kind: "player", seat: civilian });
  assert.equal(civView.seats.filter((s) => s.role).length, 1);
  const donView = room.view({ kind: "player", seat: roleSeat(room, "don") });
  assert.equal(donView.seats.filter((s) => s.role).length, 3);
  room.apply({ type: "endGame", winner: "town" });
  assert.equal(room.view({ kind: "player", seat: civilian }).seats.filter((s) => s.role).length, 11);
});

// ---- speeches -----------------------------------------------------------------

test("only the speaker's mic is on; next passes the floor and restarts the minute", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" }, 0);
  assert.equal(room.mediaFor(1).mic, true);
  assert.equal(room.mediaFor(2).mic, false);
  assert.equal(room.mediaFor(2).cam, true);
  room.apply({ type: "next" }, 20_000);
  assert.equal(room.view(host, 20_000).floorSeat, 2);
  assert.equal(room.view(host, 20_000).timer.endsAt, 80_000);
});

test("snake order: day d is opened by seat d, or the next living player; the previous opener speaks last", () => {
  assert.deepEqual(speakingOrder([1, 2, 3, 4, 5], 1), [1, 2, 3, 4, 5]);
  assert.deepEqual(speakingOrder([1, 2, 3, 4, 5], 2), [2, 3, 4, 5, 1]);
  // Seat 3 is out on day 3: seat 4 opens and seat 2 closes.
  assert.deepEqual(speakingOrder([1, 2, 4, 5, 6, 7, 8, 9, 10, 11], 3), [4, 5, 6, 7, 8, 9, 10, 11, 1, 2]);
  assert.deepEqual(speakingOrder([1, 2, 3], 12), [1, 2, 3]);
});

test("after the intro round with no nominations comes the night", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  nextUntil(room, "night");
  const v = room.view(host);
  assert.equal(v.phase, "night");
  assert.ok([...room.allMedia().values()].every((m) => !m.cam && !m.mic));
  assert.deepEqual(v.flow.night!.steps, ["mafia", "don", "sheriff", "doctor"]);
  assert.equal(room.view({ kind: "player", seat: 1 }).flow.night, null, "night secrets are host-only");
});

// ---- nominations and voting ---------------------------------------------------------

function toVoting(room: Room, nominees: number[]) {
  room.apply({ type: "startGame" });
  for (const n of nominees) room.apply({ type: "nominate", seat: n });
  nextUntil(room, "defence");
  assert.deepEqual(flow(room).speakers, nominees);
  nextUntil(room, "voting");
}

test("nominations are kept in order and the nominees defend in that order", () => {
  const room = fullRoom();
  toVoting(room, [7, 5, 4]);
  const v = room.view({ kind: "player", seat: 2 });
  assert.deepEqual(v.flow.nominees, [7, 5, 4]);
  assert.ok(v.seats[6].nominated);
  assert.deepEqual(v.flow.voting!.candidates, [7, 5, 4]);
  assert.deepEqual(v.flow.log[0], { day: 0, kind: "nominated", seat: 7, by: 1 });
});

test("each player votes once, and votes not cast go to the last candidate", () => {
  const room = fullRoom();
  toVoting(room, [7, 5, 10]);
  for (const voter of [1, 2, 3]) room.apply({ type: "vote", voter });
  room.apply({ type: "next" });
  assert.throws(() => room.apply({ type: "vote", voter: 1 }), /already_voted/);
  room.apply({ type: "vote", voter: 4 });
  room.apply({ type: "next" }); // counts: the last candidate takes the rest
  const result = flow(room).voting!.result!;
  assert.deepEqual(result.tally, { 7: 3, 5: 1, 10: 7 });
  assert.equal(result.out, 10);
  room.apply({ type: "next" });
  const v = room.view(host);
  assert.equal(v.flow.stage, "lastWord");
  assert.equal(v.seats[9].out, "voted");
  assert.equal(room.mediaFor(10).mic, true, "the last word is heard");
  room.apply({ type: "next" });
  assert.equal(flow(room).stage, "night");
});

test("a tie sends only the tied candidates to a re-vote; a second tie keeps them all", () => {
  const room = fullRoom(10);
  toVoting(room, [1, 3, 4, 7]);
  for (const voter of [2, 5, 6, 8]) room.apply({ type: "vote", voter }); // 4 against 1
  room.apply({ type: "next" });
  for (const voter of [9, 10, 1, 3]) room.apply({ type: "vote", voter }); // 4 against 3
  room.apply({ type: "next" });
  room.apply({ type: "vote", voter: 4 }); // 1 against 4
  room.apply({ type: "next" }); // 7 gets the last vote (7's own)
  assert.deepEqual(flow(room).voting!.result!.tied, [1, 3]);
  room.apply({ type: "next" });
  const revote = flow(room).voting!;
  assert.equal(revote.revote, true);
  assert.deepEqual(revote.candidates, [1, 3]);
  for (const voter of [2, 4, 5, 6, 7]) room.apply({ type: "vote", voter });
  room.apply({ type: "next" });
  assert.equal(flow(room).voting!.result!.out, null);
  room.apply({ type: "next" });
  assert.equal(flow(room).stage, "night");
  assert.ok(room.view(host).seats.every((s) => s.alive));
});

test("countVotes on its own", () => {
  assert.deepEqual(countVotes([7, 5], { 7: [1, 2] }, [1, 2, 3, 4, 5]), { tally: { 7: 2, 5: 3 }, out: 5, tied: [] });
  assert.deepEqual(countVotes([1, 7], { 1: [1, 2] }, [1, 2, 3, 4]), { tally: { 1: 2, 7: 2 }, out: null, tied: [1, 7] });
});

// ---- night and morning ---------------------------------------------------------------

test("night: mafia shot, Don and Sheriff checks, Doctor heal; a healed player survives", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  nextUntil(room, "night");
  const sheriff = roleSeat(room, "sheriff");
  const don = roleSeat(room, "don");
  const target = roleSeat(room, "civilian");
  room.apply({ type: "nightPick", seat: target });
  room.apply({ type: "nightPick", seat: sheriff });
  assert.equal(room.view(host).flow.night!.donFoundSheriff, true);
  room.apply({ type: "nightPick", seat: don });
  assert.equal(room.view(host).flow.night!.sheriffFoundMafia, true);
  room.apply({ type: "nightPick", seat: target });
  assert.equal(flow(room).stage, "morning");
  assert.deepEqual(flow(room).morning, { killed: null });
  room.apply({ type: "next" });
  const v = room.view({ kind: "player", seat: 1 });
  assert.equal(v.flow.stage, "speeches");
  assert.equal(v.day, 1);
  assert.equal(v.flow.log.at(-1)!.kind, "nobody_killed");
  assert.ok(!v.flow.log.some((e) => e.kind === "don_check"), "checks stay secret");
});

test("a player shot and not healed is killed by the mafia, gets a last word, then day 1 starts", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  nextUntil(room, "night");
  room.apply({ type: "nightPick", seat: 1 });
  quietNight(room);
  room.apply({ type: "next" });
  const v = room.view(host);
  assert.equal(v.flow.stage, "lastWord");
  assert.deepEqual(v.flow.lastWord, { seat: 1, reason: "killed" });
  assert.equal(v.seats[0].out, "killed");
  room.apply({ type: "next" });
  assert.deepEqual(flow(room).speakers.slice(0, 2), [2, 3], "seat 1 is out, so seat 2 opens day 1");
});

test("doctor rules: not the same player two nights running; himself at most twice", () => {
  assert.deepEqual(healBlocked(5, { lastHeal: null, selfHeals: 0 }), []);
  assert.deepEqual(healBlocked(5, { lastHeal: 3, selfHeals: 0 }), [3]);
  assert.deepEqual(healBlocked(5, { lastHeal: null, selfHeals: 2 }), [5]);

  const room = fullRoom();
  room.apply({ type: "startGame" });
  const doctor = roleSeat(room, "doctor");
  const playNight = (heal: number | null) => {
    nextUntil(room, "night");
    while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
    room.apply({ type: "nightPick", seat: heal });
    room.apply({ type: "next" }); // morning -> day
  };
  playNight(doctor);
  nextUntil(room, "night");
  while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
  assert.throws(() => room.apply({ type: "nightPick", seat: doctor }), /heal_blocked/);
  room.apply({ type: "nightPick", seat: null });
  room.apply({ type: "next" });
  playNight(doctor);
  playNight(null);
  nextUntil(room, "night");
  while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
  assert.throws(() => room.apply({ type: "nightPick", seat: doctor }), /heal_blocked/, "third self-heal");
});

test("night steps for dead roles are skipped", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  room.apply({ type: "kill", seat: roleSeat(room, "sheriff") });
  nextUntil(room, "night");
  assert.deepEqual(room.view(host).flow.night!.steps, ["mafia", "don", "doctor"]);
});

// ---- the end -----------------------------------------------------------------------

test("the panel suggests the winner when the game is decided", () => {
  assert.equal(suggestWinner(["civilian", "sheriff"]), "town");
  assert.equal(suggestWinner(["don", "civilian"]), "mafia");
  assert.equal(suggestWinner(["don", "civilian", "doctor"]), null);
});

test("host camera/mic switch-offs hold through the phases until switched back", () => {
  const room = fullRoom();
  room.apply({ type: "setCam", seat: 2, on: false });
  assert.deepEqual(room.mediaFor(2), { cam: false, mic: true });
  room.apply({ type: "startGame" });
  assert.equal(room.mediaFor(2).cam, false);
  room.apply({ type: "setCam", seat: 2, on: true });
  assert.equal(room.mediaFor(2).cam, true);
});

test("fouls stay between 0 and 4", () => {
  const room = fullRoom(1);
  for (let i = 0; i < 6; i++) room.apply({ type: "foul", seat: 1, delta: 1 });
  assert.equal(room.view(host).seats[0].fouls, 4);
});

test("removing a player mid-speech passes the floor on", () => {
  const room = fullRoom(5);
  room.apply({ type: "startGame" });
  room.apply({ type: "kill", seat: 1 });
  const v = room.view(host);
  assert.equal(v.floorSeat, 2);
  assert.equal(v.seats[0].out, "removed");
});

test("new game keeps the players and clears roles, deaths, fouls and the log", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  room.apply({ type: "kill", seat: 1 });
  room.apply({ type: "foul", seat: 2, delta: 1 });
  room.apply({ type: "endGame", winner: "mafia" });
  room.apply({ type: "newGame" });
  const v = room.view(host);
  assert.equal(v.flow.stage, "lobby");
  assert.equal(v.flow.log.length, 0);
  assert.ok(v.seats.every((s) => s.alive && !s.out && s.fouls === 0 && !s.role && s.name));
  assert.throws(() => room.apply({ type: "next" }), GameError);
});

test("test mode: bots fill the free seats and can be removed before the game", () => {
  const room = new Room("abc123", "Host", "secret");
  room.takeSeat(undefined, "Ann");
  room.apply({ type: "addBots" });
  const v = room.view(host);
  assert.equal(v.seats.filter((s) => s.bot).length, 10);
  assert.ok(v.seats.filter((s) => s.bot).every((s) => s.name && s.connected));
  room.apply({ type: "removeBots" });
  assert.equal(room.freeSeats().length, 10);
  room.apply({ type: "addBots" });
  room.apply({ type: "startGame" });
  assert.equal(room.view(host).seats.filter((s) => s.role).length, 11);
  assert.throws(() => room.apply({ type: "removeBots" }), /game_in_progress/);
});
