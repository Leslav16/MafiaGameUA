import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import {
  SEAT_COUNT,
  type FlowView,
  type HostAction,
  type LogEntry,
  type MeView,
  type NightStep,
  type OutReason,
  type Phase,
  type Role,
  type RoomView,
  type SeatView,
  type Stage,
  type VotingView,
  type Winner,
} from "./types.js";
import { countVotes, healBlocked, isMafia, speakingOrder, suggestWinner, type DoctorMemory } from "./rules.js";

/**
 * One game table: 11 seats and a host. All game rules live here, with no
 * networking, so they can be tested on their own. index.ts sends the views to
 * browsers and applies the camera/mic permissions to LiveKit.
 */

/** Every speech, defence and last word lasts one minute (the host can pass the floor earlier). */
export const SPEECH_SECONDS = 60;
export const HOST_IDENTITY = "host";
export const MIN_PLAYERS = 3;

interface Player {
  identity: string;
  key: string;
  name: string;
  connected: number; // open sockets
  alive: boolean;
  out: OutReason | null;
  fouls: number;
  role: Role | null;
  hostCamOff: boolean;
  hostMicOff: boolean;
}

export interface MediaPermission {
  cam: boolean;
  mic: boolean;
}

export type Viewer = { kind: "host" } | { kind: "player"; seat: number } | { kind: "nobody" };

export class GameError extends Error {}

const newId = (bytes: number) => randomBytes(bytes).toString("base64url");

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const got = scryptSync(password, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") throw new GameError("invalid_name");
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 24);
  if (!name) throw new GameError("invalid_name");
  return name;
}

/** "4. Olena", "4) Olena", "4 - Olena" or "4 Olena" -> seat 4, name "Olena". */
export function splitSeatFromName(name: string): { seat: number | null; name: string } {
  const m = /^\s*(\d{1,2})\s*[.):\-–]?\s+(.+)$|^\s*(\d{1,2})\s*[.):\-–]\s*(.+)$/.exec(name);
  if (!m) return { seat: null, name };
  const seat = Number(m[1] ?? m[3]);
  const rest = (m[2] ?? m[4]).trim();
  if (seat < 1 || seat > SEAT_COUNT || !rest) return { seat: null, name };
  return { seat, name: rest };
}

function assertSeat(seat: unknown): number {
  if (typeof seat !== "number" || !Number.isInteger(seat) || seat < 1 || seat > SEAT_COUNT) {
    throw new GameError("invalid_seat");
  }
  return seat;
}

const PUBLIC_LOG = new Set<LogEntry["kind"]>(["nominated", "voted_out", "revote", "nobody_out", "killed", "nobody_killed", "removed"]);
const NIGHT_ORDER: NightStep[] = ["mafia", "don", "sheriff", "doctor"];

interface NightState {
  steps: NightStep[];
  index: number;
  picks: Partial<Record<NightStep, number | null>>;
}

export class Room {
  readonly code: string;
  readonly hostKey = newId(18);
  hostName: string;
  hostConnected = 0;
  lastActive = Date.now();

  private readonly passwordHash: string;
  private readonly seats = new Map<number, Player>();
  private readonly banned = new Set<string>();
  private winner: Winner | null = null;
  private rolesDealt = false;
  private timer = { durationMs: SPEECH_SECONDS * 1000, remainingMs: SPEECH_SECONDS * 1000, endsAt: null as number | null };

  // ---- game flow state ----
  private stage: Stage = "lobby";
  private round: "intro" | "day" | null = null;
  private day = 0;
  private speakers: number[] = [];
  private speakerIndex = 0;
  private nominees: { seat: number; by: number | null }[] = [];
  private voting: VotingView | null = null;
  private lastWord: { seat: number; reason: "killed" | "voted"; then: "night" | "day" } | null = null;
  private night: NightState | null = null;
  private morningKilled: number | null = null;
  private doctor: DoctorMemory = { lastHeal: null, selfHeals: 0 };
  private log: LogEntry[] = [];

  constructor(code: string, hostName: string, password: string) {
    this.code = code;
    this.hostName = hostName;
    this.passwordHash = hashPassword(password);
  }

  // ---- joining -----------------------------------------------------------

  checkHostPassword(password: unknown): boolean {
    return typeof password === "string" && checkPassword(password, this.passwordHash);
  }

  freeSeats(): number[] {
    const free: number[] = [];
    for (let s = 1; s <= SEAT_COUNT; s++) if (!this.seats.has(s)) free.push(s);
    return free;
  }

  /**
   * Seats a new player. Players don't pick a seat when joining: they get the
   * first free one, then drag their tile (or type "4. Name") to set their number.
   */
  takeSeat(seatRaw: unknown, nameRaw: unknown): { seat: number; key: string; identity: string } {
    if (this.stage !== "lobby") throw new GameError("game_in_progress");
    const parsed = splitSeatFromName(cleanName(nameRaw));
    const free = this.freeSeats();
    if (free.length === 0) throw new GameError("room_full");
    const wanted = seatRaw !== undefined && seatRaw !== null ? assertSeat(seatRaw) : parsed.seat;
    const seat = wanted && !this.seats.has(wanted) ? wanted : free[0];
    const player: Player = {
      identity: `p-${newId(6)}`,
      key: newId(18),
      name: parsed.name,
      connected: 0,
      alive: true,
      out: null,
      fouls: 0,
      role: null,
      hostCamOff: false,
      hostMicOff: false,
    };
    this.seats.set(seat, player);
    return { seat, key: player.key, identity: player.identity };
  }

  /** Who a saved key belongs to, for coming back after a page reload. */
  resolveKey(key: unknown): Viewer {
    if (typeof key !== "string" || this.banned.has(key)) return { kind: "nobody" };
    if (key === this.hostKey) return { kind: "host" };
    for (const [seat, p] of this.seats) if (p.key === key) return { kind: "player", seat };
    return { kind: "nobody" };
  }

  /**
   * Anyone may change their own name at any time. Before the game, a player who
   * types a seat number in front ("4. Olena") also moves to that seat.
   */
  rename(viewer: Viewer, nameRaw: unknown): Viewer {
    const cleaned = cleanName(nameRaw);
    this.lastActive = Date.now();
    if (viewer.kind === "host") {
      this.hostName = cleaned;
      return viewer;
    }
    if (viewer.kind !== "player") throw new GameError("not_joined");
    const p = this.seats.get(viewer.seat);
    if (!p) throw new GameError("seat_empty");
    const { seat, name } = splitSeatFromName(cleaned);
    const next = seat && seat !== viewer.seat && this.stage === "lobby" ? this.chooseSeat(viewer, seat) : viewer;
    p.name = seat && this.stage !== "lobby" ? cleaned : name;
    return next;
  }

  /**
   * Before the game, a player moves to another seat number. Seat number = place
   * on the grid, so moving onto a taken seat swaps the two players.
   */
  chooseSeat(viewer: Viewer, seatRaw: unknown): Viewer {
    if (viewer.kind !== "player") throw new GameError("not_joined");
    const to = assertSeat(seatRaw);
    if (to === viewer.seat) return viewer;
    this.swapSeats(viewer.seat, to);
    this.lastActive = Date.now();
    return { kind: "player", seat: to };
  }

  private swapSeats(from: number, to: number) {
    if (this.stage !== "lobby") throw new GameError("seats_locked");
    const a = this.seats.get(from);
    if (!a) throw new GameError("seat_empty");
    const b = this.seats.get(to);
    this.seats.set(to, a);
    if (b) this.seats.set(from, b);
    else this.seats.delete(from);
  }

  identityOf(viewer: Viewer): { identity: string; name: string } | null {
    if (viewer.kind === "host") return { identity: HOST_IDENTITY, name: this.hostName };
    if (viewer.kind === "player") {
      const p = this.seats.get(viewer.seat);
      return p ? { identity: p.identity, name: p.name } : null;
    }
    return null;
  }

  /** Socket connected (+1) or disconnected (-1). Seats are kept for players who drop. */
  presence(viewer: Viewer, delta: 1 | -1): void {
    this.lastActive = Date.now();
    if (viewer.kind === "host") this.hostConnected = Math.max(0, this.hostConnected + delta);
    if (viewer.kind === "player") {
      const p = this.seats.get(viewer.seat);
      if (p) p.connected = Math.max(0, p.connected + delta);
    }
  }

  // ---- derived state -----------------------------------------------------

  private get phase(): Phase {
    if (this.stage === "lobby") return "lobby";
    if (this.stage === "ended") return "ended";
    if (this.stage === "night" || this.stage === "morning") return "night";
    return "day";
  }

  /** The one player who may speak now, if any. */
  get floorSeat(): number | null {
    if (this.stage === "speeches" || this.stage === "defence") return this.speakers[this.speakerIndex] ?? null;
    if (this.stage === "lastWord") return this.lastWord?.seat ?? null;
    return null;
  }

  private aliveSeats(): number[] {
    return [...this.seats].filter(([, p]) => p.alive).map(([s]) => s).sort((a, b) => a - b);
  }

  private seatOfRole(role: Role): number | null {
    for (const [s, p] of this.seats) if (p.role === role && p.alive) return s;
    return null;
  }

  // ---- camera and mic rules ----------------------------------------------

  /**
   * What each seated player may publish right now. The host may always publish.
   * Night: everyone off. Speeches, defence and last words: only the speaker's mic.
   * Voting: cameras on (hands up), mics off. Out players stay off, except for their last word.
   */
  mediaFor(seat: number): MediaPermission {
    const p = this.seats.get(seat);
    if (!p) return { cam: false, mic: false };
    const host = (m: MediaPermission) => ({ cam: m.cam && !p.hostCamOff, mic: m.mic && !p.hostMicOff });
    switch (this.stage) {
      case "lobby":
      case "ended":
        return host({ cam: true, mic: true });
      case "night":
      case "morning":
        return { cam: false, mic: false };
      case "lastWord":
        if (this.lastWord?.seat === seat) return host({ cam: true, mic: true });
        return host({ cam: p.alive, mic: false });
      case "voting":
        return host({ cam: p.alive, mic: false });
      default: {
        const floor = this.floorSeat;
        return host({ cam: p.alive, mic: p.alive && (floor === null || floor === seat) });
      }
    }
  }

  /** identity -> permission for every seated player. */
  allMedia(): Map<string, MediaPermission> {
    const out = new Map<string, MediaPermission>();
    for (const [seat, p] of this.seats) out.set(p.identity, this.mediaFor(seat));
    return out;
  }

  // ---- host actions ------------------------------------------------------

  /** Applies a host action. Returns identities that must be removed from the video room. */
  apply(action: HostAction, now = Date.now()): { removed: string[] } {
    this.lastActive = now;
    const removed: string[] = [];
    const player = (seatRaw: unknown) => {
      const p = this.seats.get(assertSeat(seatRaw));
      if (!p) throw new GameError("seat_empty");
      return p;
    };
    const inGame = () => {
      if (this.stage === "lobby") throw new GameError("not_started");
      if (this.stage === "ended") throw new GameError("game_ended");
    };

    switch (action?.type) {
      case "startGame":
        if (this.stage !== "lobby") throw new GameError("game_in_progress");
        this.dealRoles();
        this.startSpeeches("intro", now);
        break;
      case "next":
        inGame();
        this.next(now);
        break;
      case "nominate": {
        if (this.stage !== "speeches") throw new GameError("not_speeches");
        const seat = assertSeat(action.seat);
        const p = player(seat);
        const i = this.nominees.findIndex((n) => n.seat === seat);
        if (i >= 0) {
          this.nominees.splice(i, 1);
          this.log = this.log.filter((e) => !(e.kind === "nominated" && e.day === this.day && e.seat === seat));
        } else {
          if (!p.alive) throw new GameError("player_dead");
          const by = this.floorSeat;
          this.nominees.push({ seat, by });
          this.log.push({ day: this.day, kind: "nominated", seat, ...(by ? { by } : {}) });
        }
        break;
      }
      case "vote":
        this.toggleVote(action.voter);
        break;
      case "nightPick":
        this.nightPick(action.seat);
        break;
      case "timer":
        if (action.op === "start") {
          if (this.timer.remainingMs <= 0) this.timer.remainingMs = this.timer.durationMs;
          this.startTimer(now);
        } else if (action.op === "pause") this.pauseTimer(now);
        else if (action.op === "restart") this.restartTimer(now, this.floorSeat !== null);
        else throw new GameError("invalid_action");
        break;
      case "setCam":
        player(action.seat).hostCamOff = !action.on;
        break;
      case "setMic":
        player(action.seat).hostMicOff = !action.on;
        break;
      case "foul": {
        const p = player(action.seat);
        if (action.delta !== 1 && action.delta !== -1) throw new GameError("invalid_action");
        p.fouls = Math.min(4, Math.max(0, p.fouls + action.delta));
        break;
      }
      case "kill": {
        inGame();
        const seat = assertSeat(action.seat);
        this.takeOut(seat, "removed");
        this.log.push({ day: this.day, kind: "removed", seat });
        this.dropFromToday(seat, now);
        break;
      }
      case "revive": {
        const seat = assertSeat(action.seat);
        const p = player(seat);
        p.alive = true;
        p.out = null;
        this.log = this.log.filter((e) => !(e.seat === seat && ["removed", "killed", "voted_out"].includes(e.kind) && e.day === this.day));
        break;
      }
      case "kick": {
        const seat = assertSeat(action.seat);
        const p = player(seat);
        this.banned.add(p.key);
        this.seats.delete(seat);
        this.dropFromToday(seat, now);
        removed.push(p.identity);
        break;
      }
      case "moveSeat":
        this.swapSeats(assertSeat(action.from), assertSeat(action.to));
        break;
      case "endGame":
        if (action.winner !== "town" && action.winner !== "mafia") throw new GameError("invalid_action");
        this.stage = "ended";
        this.winner = action.winner;
        this.resetTimer();
        break;
      case "newGame":
        this.resetGame();
        break;
      default:
        throw new GameError("invalid_action");
    }
    return { removed };
  }

  // ---- the flow ----------------------------------------------------------

  private startSpeeches(round: "intro" | "day", now: number) {
    this.stage = "speeches";
    this.round = round;
    this.speakers = speakingOrder(this.aliveSeats(), round === "intro" ? 1 : this.day, SEAT_COUNT);
    this.speakerIndex = 0;
    this.nominees = [];
    this.voting = null;
    this.restartTimer(now, true);
  }

  private next(now: number) {
    switch (this.stage) {
      case "speeches":
      case "defence":
        if (this.speakerIndex + 1 < this.speakers.length) {
          this.speakerIndex += 1;
          this.restartTimer(now, true);
          return;
        }
        if (this.stage === "speeches") {
          const nominees = this.nominees.map((n) => n.seat).filter((s) => this.seats.get(s)?.alive);
          if (nominees.length === 0) return this.startNight();
          this.stage = "defence";
          this.speakers = nominees;
          this.speakerIndex = 0;
          this.restartTimer(now, true);
          return;
        }
        return this.startVoting(this.speakers, false);
      case "voting": {
        const v = this.voting!;
        if (!v.result) {
          if (v.index + 1 < v.candidates.length - 1) {
            v.index += 1;
            return;
          }
          v.index = v.candidates.length - 1;
          v.result = countVotes(v.candidates, v.votes, this.aliveSeats());
          return;
        }
        if (v.result.out !== null) {
          const seat = v.result.out;
          this.takeOut(seat, "voted");
          this.log.push({ day: this.day, kind: "voted_out", seat });
          this.startLastWord(seat, "voted", "night", now);
          return;
        }
        if (!v.revote && v.result.tied.length > 1) {
          this.log.push({ day: this.day, kind: "revote" });
          return this.startVoting(v.result.tied, true);
        }
        this.log.push({ day: this.day, kind: "nobody_out" });
        return this.startNight();
      }
      case "lastWord": {
        const then = this.lastWord!.then;
        this.lastWord = null;
        if (then === "night") return this.startNight();
        return this.startSpeeches("day", now);
      }
      case "night":
        throw new GameError("night_not_done");
      case "morning": {
        this.day += 1;
        this.night = null;
        const killed = this.morningKilled;
        this.morningKilled = null;
        if (killed !== null && this.seats.get(killed)?.alive) {
          this.takeOut(killed, "killed");
          this.log.push({ day: this.day, kind: "killed", seat: killed });
          return this.startLastWord(killed, "killed", "day", now);
        }
        this.log.push({ day: this.day, kind: "nobody_killed" });
        return this.startSpeeches("day", now);
      }
    }
  }

  private startVoting(candidates: number[], revote: boolean) {
    this.stage = "voting";
    this.resetTimer();
    this.voting = { candidates: [...candidates], index: 0, votes: {}, revote, result: null };
    // One candidate: everyone's vote goes to them, so the count is immediate.
    if (candidates.length === 1) this.voting.result = countVotes(candidates, {}, this.aliveSeats());
  }

  private toggleVote(voterRaw: unknown) {
    const v = this.voting;
    if (this.stage !== "voting" || !v || v.result) throw new GameError("not_voting");
    const voter = assertSeat(voterRaw);
    if (!this.seats.get(voter)?.alive) throw new GameError("player_dead");
    const candidate = v.candidates[v.index];
    const hands = (v.votes[candidate] ??= []);
    const i = hands.indexOf(voter);
    if (i >= 0) {
      hands.splice(i, 1);
      return;
    }
    // One vote each: a hand already raised for an earlier candidate can't be raised again.
    for (const c of v.candidates) if (c !== candidate && v.votes[c]?.includes(voter)) throw new GameError("already_voted");
    hands.push(voter);
  }

  private startLastWord(seat: number, reason: "killed" | "voted", then: "night" | "day", now: number) {
    this.stage = "lastWord";
    this.lastWord = { seat, reason, then };
    this.restartTimer(now, true);
  }

  private startNight() {
    this.stage = "night";
    this.resetTimer();
    this.voting = null;
    this.nominees = [];
    const alive = this.aliveSeats().map((s) => this.seats.get(s)!.role);
    const steps = NIGHT_ORDER.filter((step) =>
      step === "mafia" ? alive.some(isMafia) : alive.includes(step as Role),
    );
    this.night = { steps, index: 0, picks: {} };
    if (steps.length === 0) this.finishNight();
  }

  private nightPick(seatRaw: unknown) {
    const n = this.night;
    if (this.stage !== "night" || !n) throw new GameError("not_night");
    const step = n.steps[n.index];
    const seat = seatRaw === null ? null : assertSeat(seatRaw);
    if (seat !== null && !this.seats.get(seat)?.alive) throw new GameError("player_dead");
    if (step === "doctor" && seat !== null && healBlocked(this.seatOfRole("doctor"), this.doctor).includes(seat)) {
      throw new GameError("heal_blocked");
    }
    n.picks[step] = seat;
    const target = seat !== null ? this.seats.get(seat)!.role : null;
    const day = this.day + 1;
    if (step === "mafia") this.log.push(seat === null ? { day, kind: "missed" } : { day, kind: "shot", seat });
    if (step === "don" && seat !== null) this.log.push({ day, kind: "don_check", seat, result: target === "sheriff" });
    if (step === "sheriff" && seat !== null) this.log.push({ day, kind: "sheriff_check", seat, result: isMafia(target) });
    if (step === "doctor" && seat !== null) this.log.push({ day, kind: "healed", seat });
    n.index += 1;
    if (n.index >= n.steps.length) this.finishNight();
  }

  private finishNight() {
    const picks = this.night?.picks ?? {};
    const shot = picks.mafia ?? null;
    const heal = picks.doctor ?? null;
    if (this.night?.steps.includes("doctor")) {
      const doctorSeat = this.seatOfRole("doctor");
      if (heal !== null && heal === doctorSeat) this.doctor.selfHeals += 1;
      this.doctor.lastHeal = heal;
    }
    this.morningKilled = shot !== null && shot !== heal ? shot : null;
    this.stage = "morning";
  }

  private takeOut(seat: number, reason: OutReason) {
    const p = this.seats.get(seat);
    if (!p) throw new GameError("seat_empty");
    p.alive = false;
    p.out = reason;
  }

  /** A player removed mid-day leaves today's queue, nominations and vote. */
  private dropFromToday(seat: number, now: number) {
    const speaking = this.floorSeat === seat;
    if (this.stage === "speeches" || this.stage === "defence") {
      const i = this.speakers.indexOf(seat);
      if (i >= 0) {
        this.speakers.splice(i, 1);
        if (i < this.speakerIndex) this.speakerIndex -= 1;
      }
      if (speaking) {
        if (this.speakerIndex >= this.speakers.length) {
          this.speakerIndex = Math.max(0, this.speakers.length - 1);
          this.next(now);
        } else this.restartTimer(now, true);
      }
    }
    this.nominees = this.nominees.filter((n) => n.seat !== seat);
  }

  private resetGame() {
    this.stage = "lobby";
    this.round = null;
    this.day = 0;
    this.winner = null;
    this.rolesDealt = false;
    this.speakers = [];
    this.speakerIndex = 0;
    this.nominees = [];
    this.voting = null;
    this.lastWord = null;
    this.night = null;
    this.morningKilled = null;
    this.doctor = { lastHeal: null, selfHeals: 0 };
    this.log = [];
    this.resetTimer();
    for (const p of this.seats.values()) {
      p.alive = true;
      p.out = null;
      p.fouls = 0;
      p.role = null;
      p.hostCamOff = false;
      p.hostMicOff = false;
    }
  }

  /**
   * The owner's lineup for 11 players: Don, 2 Mafia, Sheriff, Doctor, 6 civilians.
   * With fewer players (test games) the mafia shrinks so the town still outnumbers it,
   * and the Doctor, then the Sheriff, drop out when there is no room for them.
   */
  static deck(players: number): Role[] {
    if (players < MIN_PLAYERS) throw new GameError("not_enough_players");
    const mafia = Math.min(3, Math.ceil(players / 2) - 1);
    const deck: Role[] = ["don", ...Array<Role>(mafia - 1).fill("mafia")];
    if (players >= 4) deck.push("sheriff");
    if (players >= 5) deck.push("doctor");
    while (deck.length < players) deck.push("civilian");
    return deck;
  }

  private dealRoles(): void {
    const seats = [...this.seats.keys()];
    const deck = Room.deck(seats.length);
    // Fisher-Yates shuffle with a cryptographic random source.
    for (let i = deck.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    seats.forEach((seat, i) => {
      const p = this.seats.get(seat)!;
      p.role = deck[i];
      p.alive = true;
      p.out = null;
      p.fouls = 0;
    });
    this.rolesDealt = true;
    this.winner = null;
    this.day = 0;
    this.log = [];
    this.doctor = { lastHeal: null, selfHeals: 0 };
  }

  // ---- timer -------------------------------------------------------------

  private startTimer(now: number) {
    if (this.timer.endsAt !== null || this.timer.remainingMs <= 0) return;
    this.timer.endsAt = now + this.timer.remainingMs;
  }

  private pauseTimer(now: number) {
    if (this.timer.endsAt === null) return;
    this.timer.remainingMs = Math.max(0, this.timer.endsAt - now);
    this.timer.endsAt = null;
  }

  private resetTimer() {
    this.timer = { durationMs: SPEECH_SECONDS * 1000, remainingMs: SPEECH_SECONDS * 1000, endsAt: null };
  }

  private restartTimer(now: number, run: boolean) {
    this.resetTimer();
    if (run) this.startTimer(now);
  }

  // ---- views -------------------------------------------------------------

  /** The room as one viewer may see it. Roles and night secrets are filtered here, never in the browser. */
  view(viewer: Viewer, now = Date.now()): RoomView {
    const own = viewer.kind === "player" ? this.seats.get(viewer.seat) : undefined;
    const ownIsMafia = isMafia(own?.role);
    const isHost = viewer.kind === "host";
    const ended = this.stage === "ended";
    const teammates: number[] = [];
    const nominated = new Set(this.nominees.map((n) => n.seat));

    const seats: SeatView[] = [];
    for (let s = 1; s <= SEAT_COUNT; s++) {
      const p = this.seats.get(s);
      const media = this.mediaFor(s);
      const mafia = isMafia(p?.role);
      if (ownIsMafia && mafia && viewer.kind === "player" && s !== viewer.seat) teammates.push(s);
      const seeRole =
        p?.role && (isHost || ended || (viewer.kind === "player" && (viewer.seat === s || (ownIsMafia && mafia))));
      seats.push({
        seat: s,
        name: p?.name ?? null,
        identity: p?.identity ?? null,
        connected: (p?.connected ?? 0) > 0,
        alive: p?.alive ?? true,
        out: p?.out ?? null,
        fouls: p?.fouls ?? 0,
        nominated: nominated.has(s),
        camAllowed: media.cam,
        micAllowed: media.mic,
        hostCamOff: p?.hostCamOff ?? false,
        hostMicOff: p?.hostMicOff ?? false,
        ...(seeRole ? { role: p!.role! } : {}),
      });
    }

    let me: MeView = { kind: "host" };
    if (viewer.kind === "player") me = { kind: "player", seat: viewer.seat, role: own?.role ?? null, teammates };

    const n = this.night;
    const night =
      isHost && n
        ? {
            steps: [...n.steps],
            step: n.steps[n.index] ?? null,
            picks: { ...n.picks },
            donFoundSheriff: n.picks.don != null ? this.seats.get(n.picks.don)?.role === "sheriff" : null,
            sheriffFoundMafia: n.picks.sheriff != null ? isMafia(this.seats.get(n.picks.sheriff)?.role) : null,
            healBlocked: healBlocked(this.seatOfRole("doctor"), this.doctor),
          }
        : null;

    const flow: FlowView = {
      stage: this.stage,
      round: this.stage === "speeches" ? this.round : null,
      speakers: [...this.speakers],
      speakerIndex: this.speakerIndex,
      nominees: this.nominees.map((x) => x.seat),
      voting: this.voting
        ? {
            ...this.voting,
            candidates: [...this.voting.candidates],
            votes: Object.fromEntries(Object.entries(this.voting.votes).map(([k, v]) => [k, [...v]])),
          }
        : null,
      lastWord: this.lastWord ? { seat: this.lastWord.seat, reason: this.lastWord.reason } : null,
      night,
      morning: isHost && this.stage === "morning" ? { killed: this.morningKilled } : null,
      suggestedWinner:
        this.rolesDealt && !ended ? suggestWinner(this.aliveSeats().map((s) => this.seats.get(s)!.role)) : null,
      log: this.log.filter((e) => isHost || ended || PUBLIC_LOG.has(e.kind)).map((e) => ({ ...e })),
    };

    return {
      code: this.code,
      phase: this.phase,
      day: this.day,
      floorSeat: this.floorSeat,
      timer: { ...this.timer },
      winner: this.winner,
      rolesDealt: this.rolesDealt,
      flow,
      host: { name: this.hostName, identity: HOST_IDENTITY, connected: this.hostConnected > 0 },
      seats,
      me,
      serverNow: now,
    };
  }
}
