import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import {
  SEAT_COUNT,
  type HostAction,
  type MeView,
  type Phase,
  type Role,
  type RoomView,
  type SeatView,
  type Winner,
} from "./types.js";

/**
 * One game table: 11 seats and a host. All game rules live here, with no
 * networking, so they can be tested on their own. index.ts sends the views to
 * browsers and applies the camera/mic permissions to LiveKit.
 */

export const DEFAULT_SPEECH_SECONDS = 60;
export const HOST_IDENTITY = "host";
export const MIN_PLAYERS = 3;

interface Player {
  identity: string;
  key: string;
  name: string;
  connected: number; // open sockets
  alive: boolean;
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

export class Room {
  readonly code: string;
  readonly hostKey = newId(18);
  hostName: string;
  hostConnected = 0;
  lastActive = Date.now();

  private readonly passwordHash: string;
  private readonly seats = new Map<number, Player>();
  private readonly banned = new Set<string>();
  private phase: Phase = "lobby";
  private day = 0;
  private floorSeat: number | null = null;
  private winner: Winner | null = null;
  private rolesDealt = false;
  private timer = { durationMs: DEFAULT_SPEECH_SECONDS * 1000, remainingMs: DEFAULT_SPEECH_SECONDS * 1000, endsAt: null as number | null };

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
   * first free one and set their real seat number afterwards (chooseSeat), or
   * type it in front of their name, like "4. Olena".
   * An explicit seat is still accepted when it is free.
   */
  takeSeat(seatRaw: unknown, nameRaw: unknown): { seat: number; key: string; identity: string } {
    if (this.phase !== "lobby") throw new GameError("game_in_progress");
    const parsed = splitSeatFromName(cleanName(nameRaw));
    const name = parsed.name;
    const free = this.freeSeats();
    if (free.length === 0) throw new GameError("room_full");
    const wanted = seatRaw !== undefined && seatRaw !== null ? assertSeat(seatRaw) : parsed.seat;
    const seat = wanted && !this.seats.has(wanted) ? wanted : free[0];
    const player: Player = {
      identity: `p-${newId(6)}`,
      key: newId(18),
      name,
      connected: 0,
      alive: true,
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
   * Anyone may change their own name at any time. A player who types a seat
   * number in front ("4. Olena") also moves to that seat, if it is free.
   * Returns the viewer's seat afterwards.
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
    const next = seat && seat !== viewer.seat ? this.chooseSeat(viewer, seat) : viewer;
    p.name = name;
    return next;
  }

  /** A player moves themselves to a free seat number. Taken seats are refused; the host can swap people. */
  chooseSeat(viewer: Viewer, seatRaw: unknown): Viewer {
    if (viewer.kind !== "player") throw new GameError("not_joined");
    const to = assertSeat(seatRaw);
    if (to === viewer.seat) return viewer;
    if (this.seats.has(to)) throw new GameError("seat_taken");
    const p = this.seats.get(viewer.seat);
    if (!p) throw new GameError("seat_empty");
    this.seats.delete(viewer.seat);
    this.seats.set(to, p);
    if (this.floorSeat === viewer.seat) this.floorSeat = to;
    this.lastActive = Date.now();
    return { kind: "player", seat: to };
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

  // ---- camera and mic rules ----------------------------------------------

  /** What each seated player may publish right now. The host may always publish. */
  mediaFor(seat: number): MediaPermission {
    const p = this.seats.get(seat);
    if (!p) return { cam: false, mic: false };
    if (this.phase === "ended") return { cam: !p.hostCamOff, mic: !p.hostMicOff };
    const awake = p.alive && this.phase !== "night";
    return {
      cam: awake && !p.hostCamOff,
      mic: awake && !p.hostMicOff && (this.floorSeat === null || this.floorSeat === seat),
    };
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

    switch (action?.type) {
      case "setCam":
        player(action.seat).hostCamOff = !action.on;
        break;
      case "setMic":
        player(action.seat).hostMicOff = !action.on;
        break;
      case "muteAll":
        for (const p of this.seats.values()) p.hostMicOff = true;
        break;
      case "unmuteAll":
        for (const p of this.seats.values()) p.hostMicOff = false;
        break;
      case "camsOffAll":
        for (const p of this.seats.values()) p.hostCamOff = true;
        break;
      case "camsOnAll":
        for (const p of this.seats.values()) p.hostCamOff = false;
        break;
      case "setFloor": {
        if (action.seat === null) {
          this.floorSeat = null;
          this.pauseTimer(now);
          break;
        }
        const p = player(action.seat);
        if (!p.alive && this.phase !== "lobby") throw new GameError("player_dead");
        this.floorSeat = action.seat;
        p.hostMicOff = false;
        this.timer = { durationMs: this.timer.durationMs, remainingMs: this.timer.durationMs, endsAt: null };
        this.startTimer(now);
        break;
      }
      case "setPhase":
        if (action.phase !== "day" && action.phase !== "night") throw new GameError("invalid_phase");
        if (this.phase === "ended") throw new GameError("game_ended");
        if (action.phase === "day" && this.phase !== "day" && this.rolesDealt) this.day += 1;
        this.phase = action.phase;
        this.floorSeat = null;
        this.pauseTimer(now);
        this.timer.remainingMs = this.timer.durationMs;
        break;
      case "startGame":
        // Deal the cards and open with the introduction night.
        if (this.phase !== "lobby") throw new GameError("game_in_progress");
        this.dealRoles();
        this.phase = "night";
        this.floorSeat = null;
        this.pauseTimer(now);
        this.timer.remainingMs = this.timer.durationMs;
        break;
      case "kill": {
        const p = player(action.seat);
        p.alive = false;
        if (this.floorSeat === action.seat) {
          this.floorSeat = null;
          this.pauseTimer(now);
        }
        break;
      }
      case "revive":
        player(action.seat).alive = true;
        break;
      case "foul": {
        const p = player(action.seat);
        if (action.delta !== 1 && action.delta !== -1) throw new GameError("invalid_action");
        p.fouls = Math.min(4, Math.max(0, p.fouls + action.delta));
        break;
      }
      case "timer":
        this.timerOp(action.op, action.seconds, now);
        break;
      case "kick": {
        const seat = assertSeat(action.seat);
        const p = player(seat);
        this.banned.add(p.key);
        this.seats.delete(seat);
        if (this.floorSeat === seat) this.floorSeat = null;
        removed.push(p.identity);
        break;
      }
      case "moveSeat": {
        const from = assertSeat(action.from);
        const to = assertSeat(action.to);
        const a = this.seats.get(from);
        if (!a) throw new GameError("seat_empty");
        const b = this.seats.get(to);
        this.seats.set(to, a);
        if (b) this.seats.set(from, b);
        else this.seats.delete(from);
        if (this.floorSeat === from) this.floorSeat = to;
        else if (this.floorSeat === to) this.floorSeat = b ? from : null;
        break;
      }
      case "endGame":
        if (action.winner !== "town" && action.winner !== "mafia") throw new GameError("invalid_action");
        this.phase = "ended";
        this.winner = action.winner;
        this.floorSeat = null;
        this.pauseTimer(now);
        break;
      case "newGame":
        this.phase = "lobby";
        this.day = 0;
        this.winner = null;
        this.rolesDealt = false;
        this.floorSeat = null;
        this.pauseTimer(now);
        this.timer.remainingMs = this.timer.durationMs;
        for (const p of this.seats.values()) {
          p.alive = true;
          p.fouls = 0;
          p.role = null;
          p.hostCamOff = false;
          p.hostMicOff = false;
        }
        break;
      default:
        throw new GameError("invalid_action");
    }
    return { removed };
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
      p.fouls = 0;
    });
    this.rolesDealt = true;
    this.winner = null;
    this.day = 0;
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

  private timerOp(op: unknown, seconds: unknown, now: number) {
    if (op === "start") {
      if (this.timer.remainingMs <= 0) this.timer.remainingMs = this.timer.durationMs;
      this.startTimer(now);
    } else if (op === "pause") {
      this.pauseTimer(now);
    } else if (op === "reset") {
      if (seconds !== undefined) {
        if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 5 || seconds > 600) {
          throw new GameError("invalid_timer");
        }
        this.timer.durationMs = Math.round(seconds) * 1000;
      }
      this.timer = { durationMs: this.timer.durationMs, remainingMs: this.timer.durationMs, endsAt: null };
    } else {
      throw new GameError("invalid_action");
    }
  }

  // ---- views -------------------------------------------------------------

  /** The room as one viewer may see it. Roles are filtered here, never in the browser. */
  view(viewer: Viewer, now = Date.now()): RoomView {
    const own = viewer.kind === "player" ? this.seats.get(viewer.seat) : undefined;
    const ownIsMafia = own?.role === "don" || own?.role === "mafia";
    const teammates: number[] = [];

    const seats: SeatView[] = [];
    for (let s = 1; s <= SEAT_COUNT; s++) {
      const p = this.seats.get(s);
      const media = this.mediaFor(s);
      const isMafia = p?.role === "don" || p?.role === "mafia";
      if (ownIsMafia && isMafia && viewer.kind === "player" && s !== viewer.seat) teammates.push(s);
      const seeRole =
        p?.role &&
        (viewer.kind === "host" ||
          this.phase === "ended" ||
          (viewer.kind === "player" && (viewer.seat === s || (ownIsMafia && isMafia))));
      seats.push({
        seat: s,
        name: p?.name ?? null,
        identity: p?.identity ?? null,
        connected: (p?.connected ?? 0) > 0,
        alive: p?.alive ?? true,
        fouls: p?.fouls ?? 0,
        camAllowed: media.cam,
        micAllowed: media.mic,
        hostCamOff: p?.hostCamOff ?? false,
        hostMicOff: p?.hostMicOff ?? false,
        ...(seeRole ? { role: p!.role! } : {}),
      });
    }

    let me: MeView = { kind: "host" };
    if (viewer.kind === "player") me = { kind: "player", seat: viewer.seat, role: own?.role ?? null, teammates };

    return {
      code: this.code,
      phase: this.phase,
      day: this.day,
      floorSeat: this.floorSeat,
      timer: { ...this.timer },
      winner: this.winner,
      rolesDealt: this.rolesDealt,
      host: { name: this.hostName, identity: HOST_IDENTITY, connected: this.hostConnected > 0 },
      seats,
      me,
      serverNow: now,
    };
  }
}
