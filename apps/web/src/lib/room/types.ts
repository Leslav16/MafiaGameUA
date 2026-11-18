/**
 * The shapes the game server sends to browsers.
 * apps/game-server/src/types.ts is the source of these types; keep them in sync.
 */

export const SEAT_COUNT = 11;

export type Role = "don" | "mafia" | "sheriff" | "doctor" | "civilian";
export type Phase = "lobby" | "day" | "night" | "ended";
export type Winner = "town" | "mafia";

export interface TimerView {
  /** Length the timer was last set to, in milliseconds. */
  durationMs: number;
  /** Time left when paused; when running, compute from endsAt. */
  remainingMs: number;
  /** Server time (ms since epoch) when it reaches zero, or null if paused. */
  endsAt: number | null;
}

export interface SeatView {
  seat: number;
  /** Null when nobody sits here. */
  name: string | null;
  /** LiveKit participant identity of the player in this seat. */
  identity: string | null;
  connected: boolean;
  alive: boolean;
  fouls: number;
  /** Whether the player may have the camera / mic on right now (host rules, phase, death). */
  camAllowed: boolean;
  micAllowed: boolean;
  /** The host switched it off for this player (stays off across phases until the host turns it back on). */
  hostCamOff: boolean;
  hostMicOff: boolean;
  /** Only sent to the host, to this seat's own player, to fellow mafia, and to everyone once the game ends. */
  role?: Role;
}

export type MeView =
  | { kind: "host" }
  | { kind: "player"; seat: number; role: Role | null; teammates: number[] };

export interface RoomView {
  code: string;
  phase: Phase;
  /** Day number, counted from 1 at the first day after roles are dealt. 0 before that. */
  day: number;
  floorSeat: number | null;
  timer: TimerView;
  winner: Winner | null;
  rolesDealt: boolean;
  host: { name: string; identity: string; connected: boolean };
  seats: SeatView[];
  me: MeView;
  /** Server clock when this view was sent, to correct for clock differences. */
  serverNow: number;
}

export type HostAction =
  | { type: "setCam"; seat: number; on: boolean }
  | { type: "setMic"; seat: number; on: boolean }
  | { type: "muteAll" }
  | { type: "unmuteAll" }
  | { type: "camsOffAll" }
  | { type: "camsOnAll" }
  | { type: "setFloor"; seat: number | null }
  | { type: "setPhase"; phase: "day" | "night" }
  | { type: "startGame" }
  | { type: "kill"; seat: number }
  | { type: "revive"; seat: number }
  | { type: "foul"; seat: number; delta: 1 | -1 }
  | { type: "timer"; op: "start" | "pause" | "reset"; seconds?: number }
  | { type: "kick"; seat: number }
  | { type: "moveSeat"; from: number; to: number }
  | { type: "endGame"; winner: Winner }
  | { type: "newGame" };
