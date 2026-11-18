/**
 * The shapes the game server sends to browsers.
 * apps/web/src/lib/room/types.ts holds the same types for the website; keep them in sync.
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

export type OutReason = "killed" | "voted" | "removed";

export interface SeatView {
  seat: number;
  /** Null when nobody sits here. */
  name: string | null;
  /** LiveKit participant identity of the player in this seat. */
  identity: string | null;
  connected: boolean;
  alive: boolean;
  /** Why the player is out: killed by the mafia at night, voted out by the town, or removed by the host. */
  out: OutReason | null;
  fouls: number;
  /** Put up for the vote today. */
  nominated: boolean;
  /** Whether the player may have the camera / mic on right now (host rules, phase, death, who has the floor). */
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

/**
 * Where the game is. The server walks through these; the host mostly presses "next".
 *   lobby -> speeches (intro round) -> night -> morning -> [lastWord] -> speeches (day)
 *   -> [defence -> voting -> [lastWord]] -> night -> ... -> ended
 */
export type Stage = "lobby" | "speeches" | "defence" | "voting" | "lastWord" | "night" | "morning" | "ended";
export type NightStep = "mafia" | "don" | "sheriff" | "doctor";

export interface VoteResult {
  /** Votes per candidate seat. */
  tally: Record<number, number>;
  /** The player voted out, or null on a tie / nobody. */
  out: number | null;
  /** Candidates tied for the most votes (2+ when there is a tie). */
  tied: number[];
}

export interface VotingView {
  candidates: number[];
  /** Candidate being voted on now. The last candidate gets every vote not cast. */
  index: number;
  /** candidate seat -> seats that voted against them. */
  votes: Record<number, number[]>;
  /** True on the re-vote between tied candidates. */
  revote: boolean;
  /** Filled once all candidates are counted; the host then confirms with "next". */
  result: VoteResult | null;
}

/** Host only: the night checklist. */
export interface NightView {
  steps: NightStep[];
  /** Step being done now; null when all are done (then the stage is "morning"). */
  step: NightStep | null;
  /** Seat picked at each step; null = nobody (a miss, or no check / heal). */
  picks: Partial<Record<NightStep, number | null>>;
  /** Result of the Don's check: did he find the Sheriff? */
  donFoundSheriff: boolean | null;
  /** Result of the Sheriff's check: is the player mafia (or the Don)? */
  sheriffFoundMafia: boolean | null;
  /** Seats the Doctor may not heal tonight (healed last night; himself after two self-heals). */
  healBlocked: number[];
}

export type LogKind =
  | "nominated"
  | "voted_out"
  | "revote"
  | "nobody_out"
  | "killed"
  | "nobody_killed"
  | "removed"
  | "shot"
  | "missed"
  | "don_check"
  | "sheriff_check"
  | "healed";

export interface LogEntry {
  /** Day number (0 = introduction round). Night entries carry the day that follows them. */
  day: number;
  kind: LogKind;
  seat?: number;
  /** Who did it: the nominating speaker. */
  by?: number;
  /** Check results. */
  result?: boolean;
}

export interface FlowView {
  stage: Stage;
  /** In "speeches": the introduction round or a normal day. */
  round: "intro" | "day" | null;
  /** Speaking order for "speeches" and "defence". */
  speakers: number[];
  speakerIndex: number;
  /** Put up for the vote today, in order. */
  nominees: number[];
  voting: VotingView | null;
  lastWord: { seat: number; reason: "killed" | "voted" } | null;
  /** Host only. */
  night: NightView | null;
  /** Host only, before announcing the morning: who dies (null = nobody). */
  morning: { killed: number | null } | null;
  /** The game looks decided: no mafia left, or as many mafia as everyone else. */
  suggestedWinner: Winner | null;
  /** What happened. Players see public entries; the host (and everyone after the game) sees all. */
  log: LogEntry[];
}

export interface RoomView {
  code: string;
  /** Simple phase for colours and cameras: night keeps everyone's camera and mic off. */
  phase: Phase;
  /** Day number: 0 for the introduction round, then 1, 2, ... */
  day: number;
  /** Who may speak now (only their mic is on); null when the table is open. */
  floorSeat: number | null;
  timer: TimerView;
  winner: Winner | null;
  rolesDealt: boolean;
  flow: FlowView;
  host: { name: string; identity: string; connected: boolean };
  seats: SeatView[];
  me: MeView;
  /** Server clock when this view was sent, to correct for clock differences. */
  serverNow: number;
}

export type HostAction =
  | { type: "startGame" }
  /** Move the game on: next speaker, next candidate, count the vote, confirm, end the last word, announce the morning. */
  | { type: "next" }
  /** Put a player up for the vote (or take them back off) during speeches. */
  | { type: "nominate"; seat: number }
  /** Toggle a voter's hand against the candidate being voted on. */
  | { type: "vote"; voter: number }
  /** Record the current night step's choice; null = nobody. */
  | { type: "nightPick"; seat: number | null }
  | { type: "timer"; op: "start" | "pause" | "restart" }
  | { type: "setCam"; seat: number; on: boolean }
  | { type: "setMic"; seat: number; on: boolean }
  | { type: "foul"; seat: number; delta: 1 | -1 }
  /** Take a player out of the game by hand (fouls, rule breaks). */
  | { type: "kill"; seat: number }
  | { type: "revive"; seat: number }
  | { type: "kick"; seat: number }
  /** Before the game: drag a tile onto another seat (swaps the two). */
  | { type: "moveSeat"; from: number; to: number }
  | { type: "endGame"; winner: Winner }
  | { type: "newGame" };
