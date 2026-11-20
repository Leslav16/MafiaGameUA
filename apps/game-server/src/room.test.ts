import { test } from "node:test";
import assert from "node:assert/strict";
import { GameError, MAX_SPECTATORS, Room, splitSeatFromName } from "./room.js";
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
/** Goes to the night and wakes the mafia. */
function toNight(room: Room) {
  nextUntil(room, "night");
  room.apply({ type: "next" });
  assert.equal(flow(room).nightStep, "mafia");
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

test("snake order: seat 1 opens the intro, day d is opened by seat d + 1 (or the next living player)", () => {
  assert.deepEqual(speakingOrder([1, 2, 3, 4, 5], 0), [1, 2, 3, 4, 5], "intro");
  assert.deepEqual(speakingOrder([1, 2, 3, 4, 5], 1), [2, 3, 4, 5, 1], "day 1: seat 1 speaks last");
  assert.deepEqual(speakingOrder([1, 2, 3, 4, 5], 2), [3, 4, 5, 1, 2], "day 2: seats 1 and 2 speak last");
  // Seat 3 is out on day 2: seat 4 opens and seat 2 closes.
  assert.deepEqual(speakingOrder([1, 2, 4, 5, 6, 7, 8, 9, 10, 11], 2), [4, 5, 6, 7, 8, 9, 10, 11, 1, 2]);
  assert.deepEqual(speakingOrder([1, 2, 3], 11), [1, 2, 3], "wraps round the 11 seats");
});

test("the intro round has no nominations: everyone introduces themselves, then the night", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  assert.throws(() => room.apply({ type: "nominate", seat: 4 }), /intro_no_votes/);
});

test("after the night comes the balagan: one minute when every living player may talk", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  room.apply({ type: "nightPick", seat: 5 });
  quietNight(room);
  room.apply({ type: "next" }, 1_000);
  const v = room.view(host, 1_000);
  assert.equal(v.flow.stage, "balagan");
  assert.equal(v.phase, "day");
  assert.equal(v.floorSeat, null);
  assert.equal(v.timer.endsAt, 61_000, "the minute runs");
  assert.equal(room.mediaFor(1).mic, true);
  assert.equal(room.mediaFor(5).mic, false, "the killed player stays quiet");
  room.apply({ type: "next" });
  assert.equal(flow(room).stage, "speeches");
  assert.equal(flow(room).speakers[0], 2, "day 1 is opened by seat 2");
});

test("after the intro round with no nominations comes the night", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  nextUntil(room, "night");
  const v = room.view(host);
  assert.equal(v.phase, "night");
  assert.ok([...room.allMedia().values()].every((m) => m.cam && !m.mic), "cameras stay on, hidden by subscription rules");
  assert.deepEqual(v.flow.night!.steps, ["mafia", "don", "sheriff", "doctor"]);
  assert.equal(room.view({ kind: "player", seat: 1 }).flow.night, null, "night secrets are host-only");
});

// ---- nominations and voting ---------------------------------------------------------

/** Plays the intro and a quiet first night, then day 1 speeches with these nominations. */
function toVoting(room: Room, nominees: number[]) {
  room.apply({ type: "startGame" });
  toNight(room);
  quietNight(room);
  room.apply({ type: "next" }); // morning -> balagan
  room.apply({ type: "next" }); // balagan -> speeches
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
  assert.deepEqual(v.flow.log.find((e) => e.kind === "nominated"), { day: 1, kind: "nominated", seat: 7, by: 2 });
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

test("a candidate removed during the vote leaves it; the last one left takes the votes", () => {
  const room = fullRoom();
  toVoting(room, [7, 5, 10]);
  room.apply({ type: "vote", voter: 1 });
  room.apply({ type: "kill", seat: 10 }); // e.g. a fourth foul
  assert.deepEqual(flow(room).voting!.candidates, [7, 5]);
  room.apply({ type: "next" }); // 5 is now the last candidate: counted at once
  const result = flow(room).voting!.result!;
  assert.equal(result.out, 5);
  room.apply({ type: "kill", seat: 5 });
  assert.equal(flow(room).voting!.result!.out, 7, "recounted without the removed player");
});

test("players cast their own vote: one each, changeable, counted by the host at once", () => {
  const room = fullRoom();
  toVoting(room, [7, 5, 10]);
  const me = (seat: number) => ({ kind: "player", seat }) as const;
  room.castVote(me(1), 5);
  room.castVote(me(2), 5);
  room.castVote(me(3), 7);
  room.castVote(me(3), 5); // changed their mind: still one vote
  room.castVote(me(4), 7);
  room.castVote(me(4), null); // took it back: goes to the last candidate
  assert.deepEqual(flow(room).voting!.votes, { 5: [1, 2, 3] });
  assert.deepEqual(room.view(me(9)).flow.voting!.votes, { 5: [1, 2, 3] }, "votes are open, like raised hands");
  assert.throws(() => room.castVote(me(6), 4), /not_a_candidate/);
  assert.throws(() => room.castVote(host, 5), /not_a_player/);
  assert.throws(() => room.apply({ type: "vote", voter: 1 }), /already_voted/, "the host can't add a second hand");
  room.apply({ type: "countVotes" });
  const result = flow(room).voting!.result!;
  assert.deepEqual(result.tally, { 7: 0, 5: 3, 10: 8 });
  assert.equal(result.out, 10);
  assert.throws(() => room.castVote(me(6), 5), /not_voting/, "closed once counted");
});

test("a dead player can't cast a vote", () => {
  const room = fullRoom();
  toVoting(room, [7, 5]);
  room.apply({ type: "kill", seat: 3 });
  assert.throws(() => room.castVote({ kind: "player", seat: 3 }, 5), /player_dead/);
});

test("players' own votes in a re-vote: a second tie keeps everyone", () => {
  const room = fullRoom(10);
  toVoting(room, [1, 3]);
  for (const s of [2, 4, 5, 6, 7]) room.castVote({ kind: "player", seat: s }, 1);
  room.apply({ type: "countVotes" }); // 5 against 1, the other 5 go to 3
  assert.deepEqual(flow(room).voting!.result!.tied, [1, 3]);
  room.apply({ type: "next" });
  assert.equal(flow(room).voting!.revote, true);
  for (const s of [1, 2, 4, 8, 9]) room.castVote({ kind: "player", seat: s }, 1); // 5 and 5 again
  room.apply({ type: "countVotes" });
  assert.equal(flow(room).voting!.result!.out, null);
  room.apply({ type: "next" });
  assert.equal(flow(room).stage, "night");
});

test("countVotes on its own", () => {
  assert.deepEqual(countVotes([7, 5], { 7: [1, 2] }, [1, 2, 3, 4, 5]), { tally: { 7: 2, 5: 3 }, out: 5, tied: [] });
  assert.deepEqual(countVotes([1, 7], { 1: [1, 2] }, [1, 2, 3, 4]), { tally: { 1: 2, 7: 2 }, out: null, tied: [1, 7] });
});

// ---- night and morning ---------------------------------------------------------------

test("night: mafia shot, Don and Sheriff checks, Doctor heal; a healed player survives", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
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
  assert.equal(flow(room).stage, "balagan");
  room.apply({ type: "next" });
  const v = room.view({ kind: "player", seat: 1 });
  assert.equal(v.flow.stage, "speeches");
  assert.equal(v.day, 1);
  assert.equal(v.flow.log.at(-1)!.kind, "nobody_killed");
  assert.ok(!v.flow.log.some((e) => e.kind === "don_check"), "checks stay secret");
});

test("a player shot and not healed is killed by the mafia with no last word, and day 1 starts", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  room.apply({ type: "nightPick", seat: 2 });
  quietNight(room);
  room.apply({ type: "next" });
  room.apply({ type: "next" });
  const v = room.view(host);
  assert.equal(v.flow.stage, "speeches");
  assert.equal(v.flow.lastWord, null);
  assert.equal(v.seats[1].out, "killed");
  assert.deepEqual(v.flow.speakers.slice(0, 2), [3, 4], "seat 2 is out, so seat 3 opens day 1");
  assert.equal(v.flow.speakers.at(-1), 1, "seat 1 speaks last");
});

test("doctor rules: not the same player two nights running; himself at most twice", () => {
  assert.deepEqual(healBlocked(5, { lastHeal: null, selfHeals: 0 }), []);
  assert.deepEqual(healBlocked(5, { lastHeal: 3, selfHeals: 0 }), [3]);
  assert.deepEqual(healBlocked(5, { lastHeal: null, selfHeals: 2 }), [5]);

  const room = fullRoom();
  room.apply({ type: "startGame" });
  const doctor = roleSeat(room, "doctor");
  const playNight = (heal: number | null) => {
    toNight(room);
    while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
    room.apply({ type: "nightPick", seat: heal });
    room.apply({ type: "next" }); // morning -> day
  };
  playNight(doctor);
  toNight(room);
  while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
  assert.throws(() => room.apply({ type: "nightPick", seat: doctor }), /heal_blocked/);
  room.apply({ type: "nightPick", seat: null });
  room.apply({ type: "next" });
  playNight(doctor);
  playNight(null);
  toNight(room);
  while (room.view(host).flow.night!.step !== "doctor") room.apply({ type: "nightPick", seat: null });
  assert.throws(() => room.apply({ type: "nightPick", seat: doctor }), /heal_blocked/, "third self-heal");
});

test("a role that is out is still called at night, but can only pick nobody", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  const sheriff = roleSeat(room, "sheriff");
  room.apply({ type: "kill", seat: sheriff });
  toNight(room);
  const night = room.view(host).flow.night!;
  assert.deepEqual(night.steps, ["mafia", "don", "sheriff", "doctor"]);
  assert.deepEqual(night.stepsOut, ["sheriff"]);
  room.apply({ type: "nightPick", seat: null });
  room.apply({ type: "nightPick", seat: null });
  assert.equal(flow(room).nightStep, "sheriff");
  assert.equal(room.mediaFor(sheriff).cam, false);
  assert.throws(() => room.apply({ type: "nightPick", seat: 1 }), /role_out/);
  room.apply({ type: "nightPick", seat: null });
  assert.equal(flow(room).nightStep, "doctor");
});

test("night: every living camera stays on and every mic off, the same for all, so nothing shows who is awake", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  nextUntil(room, "night");
  const all = room.view(host).seats.map((s) => s.seat);
  const camsOn = () => all.filter((s) => room.mediaFor(s).cam);
  const player = { kind: "player", seat: 1 } as const;

  assert.equal(flow(room).nightStep, "asleep");
  assert.equal(room.view(player).flow.nightStep, "asleep", "everyone knows which role is called");
  assert.deepEqual(camsOn(), all);
  assert.throws(() => room.apply({ type: "nightPick", seat: null }), /night_asleep/);

  for (const step of ["mafia", "don", "sheriff", "doctor"]) {
    if (step === "mafia") room.apply({ type: "next" });
    else room.apply({ type: "nightPick", seat: null });
    assert.equal(flow(room).nightStep, step);
    assert.deepEqual(camsOn(), all, `same cameras at the ${step} step`);
    assert.ok(all.every((s) => !room.mediaFor(s).mic), "no sound at night");
    // Players never see others' camera/mic rules.
    const others = room.view(player).seats.filter((s) => s.seat !== 1);
    assert.ok(others.every((s) => !s.camAllowed && !s.micAllowed && !s.hostCamOff && !s.hostMicOff));
  }
  room.apply({ type: "nightPick", seat: null });
  assert.equal(flow(room).stage, "morning");
  assert.equal(flow(room).nightStep, null);
  assert.deepEqual(camsOn(), []);
});

test("a dead player's camera stays off at night", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  room.apply({ type: "kill", seat: 4 });
  nextUntil(room, "night");
  assert.equal(room.mediaFor(4).cam, false);
  assert.equal(room.mediaFor(5).cam, true);
});

test("the morning log says either who was killed or that nobody was", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  room.apply({ type: "nightPick", seat: 2 });
  quietNight(room);
  room.apply({ type: "next" });
  const kinds = flow(room).log.filter((e) => e.day === 1).map((e) => e.kind);
  assert.ok(kinds.includes("killed"));
  assert.ok(!kinds.includes("nobody_killed"));
});

test("only the host sees the suggested winner", () => {
  const room = fullRoom(3);
  room.apply({ type: "startGame" });
  const town = room.view(host).seats.filter((s) => s.role === "civilian").map((s) => s.seat);
  room.apply({ type: "kill", seat: town[0] });
  assert.equal(flow(room).suggestedWinner, "mafia");
  assert.equal(room.view({ kind: "player", seat: town[1] }).flow.suggestedWinner, null);
});

test("spectators join at any time, take no seat and never see roles or the night", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  const w = room.addSpectator("Watcher");
  const viewer = room.resolveKey(w.key);
  assert.equal(viewer.kind, "spectator");
  room.presence(viewer, 1);
  const v = room.view(viewer);
  assert.deepEqual(v.me, { kind: "spectator", name: "Watcher", wantsSeat: null });
  assert.ok(v.seats.every((s) => s.role === undefined));
  assert.equal(v.flow.night, null);
  assert.deepEqual(room.view({ kind: "player", seat: 1 }).spectators, { count: 1, names: ["Watcher"] });
  assert.equal(room.freeSeats().length, 0, "no seat taken");
  room.rename(viewer, "Olha");
  assert.deepEqual(room.view(host).spectators.names, ["Olha"]);
  room.presence(viewer, -1);
  assert.equal(room.view(host).spectators.count, 0, "only those online are listed");
});

test("spectators who left free their place, so a public table never fills up with ghosts", () => {
  const room = fullRoom();
  for (let i = 0; i < MAX_SPECTATORS; i++) room.addSpectator(`Gone ${i}`);
  const stay = room.addSpectator("Still here");
  room.presence(room.resolveKey(stay.key), 1);
  assert.equal(room.resolveKey(stay.key).kind, "spectator", "someone still watching keeps their place");
  for (let i = 1; i < MAX_SPECTATORS; i++) room.presence(room.resolveKey(room.addSpectator(`Live ${i}`).key), 1);
  assert.throws(() => room.addSpectator("One too many"), /too_many_spectators/);
});

test("the host picks the introduction place before the game, and can list the table publicly", () => {
  const room = fullRoom();
  room.apply({ type: "setLocation", location: "loc:train" });
  assert.equal(room.view({ kind: "player", seat: 3 }).location, "loc:train");
  room.apply({ type: "setPublic", on: true });
  assert.equal(room.summary().location, "loc:train");
  assert.equal(room.summary().players, 11);
  assert.equal(room.isPublic, true);
  room.apply({ type: "startGame" });
  assert.throws(() => room.apply({ type: "setLocation", location: null }), /game_in_progress/);
});

test("the Sheriff, Don and Doctor each see only their own night record", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  const [sheriff, don, doctor] = (["sheriff", "don", "doctor"] as Role[]).map((r) => roleSeat(room, r));
  const civ = roleSeat(room, "civilian");
  const me = (seat: number) => room.view({ kind: "player", seat }).me as { marks: unknown };
  nextUntil(room, "night");
  room.apply({ type: "next" });
  for (const p of [null, sheriff, don, doctor]) room.apply({ type: "nightPick", seat: p });
  room.apply({ type: "next" });
  nextUntil(room, "night");
  room.apply({ type: "next" });
  for (const p of [null, civ, civ, civ]) room.apply({ type: "nightPick", seat: p });
  assert.deepEqual(me(sheriff).marks, { role: "sheriff", seats: { [don]: { count: 1, result: true }, [civ]: { count: 1, result: false } } });
  assert.deepEqual(me(don).marks, { role: "don", seats: { [sheriff]: { count: 1, result: true }, [civ]: { count: 1, result: false } } });
  assert.deepEqual(me(doctor).marks, { role: "doctor", seats: { [doctor]: { count: 1 }, [civ]: { count: 1 } }, selfHeals: 1 });
  assert.equal(me(civ).marks, null, "other players get nothing");
  assert.equal(me(roleSeat(room, "mafia")).marks, null);
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

test("the host can lock the room with a password, and only the host sees it", () => {
  const room = fullRoom(2);
  assert.equal(room.checkJoinPassword(undefined), true, "an open room needs nothing");
  room.apply({ type: "setRoomPassword", password: "  tiger " });
  assert.equal(room.locked, true);
  assert.equal(room.checkJoinPassword("tiger"), true);
  assert.equal(room.checkJoinPassword("lion"), false);
  assert.equal(room.view(host).roomPassword, "tiger");
  assert.equal(room.view({ kind: "player", seat: 1 }).roomPassword, undefined);
  assert.equal(room.view({ kind: "player", seat: 1 }).locked, true);
  assert.throws(() => room.apply({ type: "setRoomPassword", password: "   " }), /invalid_password/);
  room.apply({ type: "setRoomPassword", password: null });
  assert.equal(room.locked, false);
});

test("a public table leaves the list shortly after the host's last tab closes", () => {
  const room = new Room("abc123", "Host", "secret", true);
  room.presence(host, 1);
  assert.equal(room.listed(Date.now() + 3_600_000, 30_000), true, "listed while the host is here");
  room.presence(host, -1);
  const left = room.hostLeftAt!;
  assert.equal(room.listed(left + 10_000, 30_000), true, "a reload keeps it");
  assert.equal(room.listed(left + 31_000, 30_000), false);
  room.presence(host, 1);
  assert.equal(room.hostLeftAt, null);
});

// ---- coming back after a dropped connection --------------------------------

test("a player who lost their connection asks from the spectators, and the host returns them to their seat", () => {
  const room = fullRoom(5);
  const old = room.takeSeat(undefined, "x"); // seat 6
  room.presence({ kind: "player", seat: 6 }, 1);
  room.apply({ type: "startGame" });
  const before = room.view(host).seats[5];
  room.presence({ kind: "player", seat: 6 }, -1); // the connection dropped
  assert.deepEqual(room.returnableSeats().find((r) => r.seat === 6), { seat: 6, name: "x" });

  const w = room.addSpectator("Olena", 6);
  room.presence(room.resolveKey(w.key), 1);
  const list = room.view(host).spectators.list!;
  assert.deepEqual(list, [{ id: w.identity, name: "Olena", wantsSeat: 6 }]);
  // Other players never see the list.
  assert.equal(room.view({ kind: "player", seat: 1 }).spectators.list, undefined);

  const { removed } = room.apply({ type: "seatSpectator", spectator: w.identity, seat: 6 });
  assert.ok(removed.includes(w.identity) && removed.includes(old.identity));
  assert.deepEqual(room.resolveKey(w.key), { kind: "player", seat: 6 });
  assert.deepEqual(room.resolveKey(old.key), { kind: "nobody" });
  const after = room.view(host).seats[5];
  assert.equal(after.role, before.role);
  assert.equal(after.connected, true);
  assert.notEqual(after.identity, before.identity);
  assert.equal(room.view(host).spectators.count, 0);
});

test("returning needs a game in progress and a real player's seat; the host can turn a request down", () => {
  const room = fullRoom(4);
  assert.throws(() => room.addSpectator("A", 2), /not_started/);
  room.apply({ type: "startGame" });
  assert.throws(() => room.addSpectator("A", 9), /seat_empty/);
  const w = room.addSpectator("A", 2);
  room.presence(room.resolveKey(w.key), 1);
  room.apply({ type: "dismissReturn", spectator: w.identity });
  assert.equal(room.view(host).spectators.list![0].wantsSeat, null);
  assert.throws(() => room.apply({ type: "seatSpectator", spectator: "w-nope", seat: 2 }), /spectator_gone/);
});

test("before the game the host can seat a spectator only in a free seat", () => {
  const room = fullRoom(3);
  const w = room.addSpectator("Lev");
  assert.throws(() => room.apply({ type: "seatSpectator", spectator: w.identity, seat: 1 }), /seat_taken/);
  room.apply({ type: "seatSpectator", spectator: w.identity, seat: 8 });
  assert.equal(room.view(host).seats[7].name, "Lev");
  assert.deepEqual(room.resolveKey(w.key), { kind: "player", seat: 8 });
});

test("night music: the host's file and table volume, shown to everyone", () => {
  const room = fullRoom(3);
  assert.equal(room.view(host).music, null);
  room.setMusic("Godfather  waltz.mp3", "audio/mpeg", Buffer.from([1, 2, 3]));
  assert.deepEqual(room.view({ kind: "player", seat: 1 }).music, { version: 1, name: "Godfather waltz.mp3", volume: 0.4 });
  room.apply({ type: "musicVolume", volume: 3 });
  assert.equal(room.view(host).music!.volume, 1);
  assert.throws(() => room.setMusic("x.exe", "application/x-msdownload", Buffer.from([1])), /music_not_audio/);
  room.setMusic("b.ogg", "audio/ogg", Buffer.from([1]));
  assert.equal(room.view(host).music!.version, 2);
  room.apply({ type: "clearMusic" });
  assert.equal(room.view(host).music, null);
});

// ---- players pick their own night targets ----------------------------------

test("the Don's pick stands for the mafia; the host confirms it", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  const don = roleSeat(room, "don");
  const mafia = room.view(host).seats.find((s) => s.role === "mafia")!.seat;
  const civ = room.view(host).seats.filter((s) => s.role === "civilian").map((s) => s.seat);
  // A civilian can't pick, and doesn't see a turn.
  assert.throws(() => room.nightChoose({ kind: "player", seat: civ[0] }, civ[1]), /not_your_turn/);
  assert.equal((room.view({ kind: "player", seat: civ[0] }).me as { night: unknown }).night, null);
  room.nightChoose({ kind: "player", seat: mafia }, civ[0]);
  assert.equal(room.view(host).flow.night!.suggested, null); // the Don hasn't picked
  room.nightChoose({ kind: "player", seat: don }, civ[1]);
  assert.equal(room.view(host).flow.night!.suggested, civ[1]);
  const mine = (room.view({ kind: "player", seat: mafia }).me as { night: { choices: Record<number, number>; agreed: number } }).night;
  assert.deepEqual(mine.choices, { [mafia]: civ[0], [don]: civ[1] });
  assert.equal(mine.agreed, civ[1]);
  room.apply({ type: "nightPick", seat: civ[1] });
  assert.equal(flow(room).nightStep, "don");
});

test("with the Don out, the living mafia must agree on one number", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  room.apply({ type: "kill", seat: roleSeat(room, "don") });
  toNight(room);
  const mafia = room.view(host).seats.filter((s) => s.role === "mafia" && s.alive).map((s) => s.seat);
  const civ = room.view(host).seats.filter((s) => s.role === "civilian").map((s) => s.seat);
  room.nightChoose({ kind: "player", seat: mafia[0] }, civ[0]);
  room.nightChoose({ kind: "player", seat: mafia[1] }, civ[1]);
  assert.equal(room.view(host).flow.night!.suggested, null);
  room.nightChoose({ kind: "player", seat: mafia[1] }, civ[0]);
  assert.equal(room.view(host).flow.night!.suggested, civ[0]);
});

test("a check is answered at once, only to the checker, and can't be changed", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  room.apply({ type: "nightPick", seat: null }); // mafia miss
  const don = roleSeat(room, "don");
  const sheriff = roleSeat(room, "sheriff");
  assert.throws(() => room.nightChoose({ kind: "player", seat: don }, don), /invalid_seat/);
  room.nightChoose({ kind: "player", seat: don }, sheriff);
  const turn = (room.view({ kind: "player", seat: don }).me as { night: { result: boolean } }).night;
  assert.equal(turn.result, true);
  assert.throws(() => room.nightChoose({ kind: "player", seat: don }, 1), /already_checked/);
  assert.equal(room.view(host).flow.night!.suggested, sheriff);
});

test("the Doctor can't pick a blocked heal", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  for (let i = 0; i < 3; i++) room.apply({ type: "nightPick", seat: null });
  const doctor = roleSeat(room, "doctor");
  room.nightChoose({ kind: "player", seat: doctor }, 1);
  room.apply({ type: "nightPick", seat: 1 });
  room.apply({ type: "next" }); // morning -> balagan
  nextUntil(room, "night");
  room.apply({ type: "next" });
  for (let i = 0; i < 3; i++) room.apply({ type: "nightPick", seat: null });
  assert.throws(() => room.nightChoose({ kind: "player", seat: doctor }, 1), /heal_blocked/);
});

test("at night nobody but the host can speak", () => {
  const room = fullRoom();
  room.apply({ type: "startGame" });
  toNight(room);
  for (let s = 1; s <= 11; s++) assert.equal(room.mediaFor(s).mic, false);
});
