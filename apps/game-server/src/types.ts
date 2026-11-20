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
  /** A test bot added by the host: no camera or mic. */
  bot: boolean;
  alive: boolean;
  /** Why the player is out: killed by the mafia at night, voted out by the town, or removed by the host. */
  out: OutReason | null;
  fouls: number;
  /** Put up for the vote today. */
  nominated: boolean;
  /**
   * Whether the player may have the camera / mic on right now (host rules, phase, death, who has the floor).
   * These four are sent only to the host and to the seat's own player (others get false), so they can't
   * hint at who is awake at night.
   */
  camAllowed: boolean;
  micAllowed: boolean;
  /** The host switched it off for this player (stays off across phases until the host turns it back on). */
  hostCamOff: boolean;
  hostMicOff: boolean;
  /** Only sent to the host, to this seat's own player, to fellow mafia, and to everyone once the game ends. */
  role?: Role;
}

/**
 * A player's own night record, so they can keep track: the Sheriff's checks (result: mafia?),
 * the Don's checks (result: Sheriff?), the Doctor's heals (count per seat, self-heals included).
 * Sent only to the player who holds that role.
 */
export interface OwnNightMarks {
  role: "sheriff" | "don" | "doctor";
  /** seat -> times picked and, for checks, the result of the latest check. */
  seats: Record<number, { count: number; result?: boolean }>;
  /** Doctor only: times the Doctor healed themselves (at most 2). */
  selfHeals?: number;
}

export type MeView =
  | { kind: "host" }
  | {
      kind: "player";
      seat: number;
      role: Role | null;
      teammates: number[];
      marks: OwnNightMarks | null;
      /** Only while this player's role is awake at night: their own pick. */
      night: MyNightTurn | null;
    }
  /** Watches the table without a seat: sees and hears the day, never roles or the night. */
  | { kind: "spectator"; name: string; wantsSeat: number | null };

/** People watching without a seat. They take no tile; the room shows a small count and a popup of names. */
export interface SpectatorsView {
  count: number;
  /** Names of those online now. */
  names: string[];
  /**
   * Host only: who is watching now, so the host can seat them. `wantsSeat` is set when the spectator
   * says they were sitting there and lost their connection (they ask to come back to their own seat).
   */
  list?: { id: string; name: string; wantsSeat: number | null }[];
}

/** The host's night music: fades in when the night falls and out towards the morning. */
export interface MusicView {
  /** Changes with every new upload; the file is at GET /music/<code>?v=<version>. */
  version: number;
  /** The file's name, as the host's computer called it. */
  name: string;
  /** Table volume the host set, 0..1. Each browser multiplies it by its own setting. */
  volume: number;
}

/** One open table, for the list on the home page (only tables the host made public). */
export interface RoomSummary {
  code: string;
  hostName: string;
  phase: Phase;
  day: number;
  players: number;
  freeSeats: number;
  spectators: number;
  /** Where the introduction round is set, if the host picked a place. */
  location: string | null;
  /** Joining needs the room password. */
  locked: boolean;
}

/**
 * Where the game is. The server walks through these; the host mostly presses "next".
 *   lobby -> speeches (intro round, no nominations) -> night (asleep, mafia, don, sheriff, doctor) -> morning
 *   -> balagan (one free minute, every living mic on) -> speeches (day) -> [defence -> voting -> [lastWord]]
 *   -> night -> ... -> ended
 */
export type Stage = "lobby" | "speeches" | "defence" | "voting" | "lastWord" | "night" | "morning" | "balagan" | "ended";
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
  /**
   * candidate seat -> seats that voted against them. Open to everyone, like hands raised at a real table.
   * Players cast their own vote from the room (me:vote); the host may also raise hands for them.
   */
  votes: Record<number, number[]>;
  /** True on the re-vote between tied candidates. */
  revote: boolean;
  /** Filled once all candidates are counted; the host then confirms with "next". */
  result: VoteResult | null;
}

/** Host only: the night checklist. */
export interface NightView {
  steps: NightStep[];
  /** Step being done now; null while the town is still asleep, or when all are done (then the stage is "morning"). */
  step: NightStep | null;
  /** Steps whose role is already out: they are still called, so the table can't tell, but the pick is "nobody". */
  stepsOut: NightStep[];
  /** Seat picked at each step; null = nobody (a miss, or no check / heal). */
  picks: Partial<Record<NightStep, number | null>>;
  /** Result of the Don's check: did he find the Sheriff? */
  donFoundSheriff: boolean | null;
  /** Result of the Sheriff's check: is the player mafia (or the Don)? */
  sheriffFoundMafia: boolean | null;
  /** Seats the Doctor may not heal tonight (healed last night; himself after two self-heals). */
  healBlocked: number[];
  /** What the woken players picked themselves at the current step: player seat -> target seat. */
  choices: Record<number, number>;
  /**
   * The pick that stands for the current step, ready for the host to confirm: the Don's pick for the
   * mafia (or, with the Don out, the one number every living mafia agreed on); else the role's own pick.
   */
  suggested: number | null;
}

/**
 * The night step on the screen of the player it belongs to (a living role holder whose role is awake):
 * they pick whom to shoot, check or heal themselves. The host confirms.
 */
export interface MyNightTurn {
  step: NightStep;
  /** player seat -> target seat. Mafia see every mafia's pick; the others only their own. */
  choices: Record<number, number>;
  /** Mafia: the pick that stands now (the Don's, or the one all agreed on); null while undecided. */
  agreed: number | null;
  /** Don / Sheriff: the answer to their check, once they picked (Don: is it the Sheriff? Sheriff: is it mafia?). */
  result: boolean | null;
  /** Seats that can't be picked now (the Doctor's blocked heals; yourself for checks). */
  blocked: number[];
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
  /**
   * Public: which role is called at night. "asleep" first, then the host wakes "mafia" (the mafia and
   * the Don together), then "don", "sheriff", "doctor". Every living camera stays on all night (mics off),
   * but each browser lets only the host watch it, plus fellow mafia during the "mafia" step.
   */
  nightStep: NightStep | "asleep" | null;
  /** Host only. */
  night: NightView | null;
  /** Host only, before announcing the morning: who dies (null = nobody). */
  morning: { killed: number | null } | null;
  /** Host only: the game looks decided (no mafia left, or as many mafia as everyone else). */
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
  /** Who is watching without a seat. */
  spectators: SpectatorsView;
  /**
   * Where the introduction round is set, picked by the host before the game: either "loc:<id>" for one
   * of the site's ready places, or the host's own words. Null when not chosen.
   */
  location: string | null;
  /** Shown in the list of open tables on the home page, so others can come and watch. */
  isPublic: boolean;
  /** Joining needs the room password. */
  locked: boolean;
  /** The host's night music, or null when there is none. */
  music: MusicView | null;
  /** Host only: the room password, to share with the players. */
  roomPassword?: string;
  /** Server clock when this view was sent, to correct for clock differences. */
  serverNow: number;
}

export type HostAction =
  | { type: "startGame" }
  /** Move the game on: next speaker, next candidate, count the vote, confirm, end the last word, wake the mafia, announce the morning. */
  | { type: "next" }
  /** Put a player up for the vote (or take them back off) during speeches. */
  | { type: "nominate"; seat: number }
  /** Toggle a voter's hand against the candidate being voted on. */
  | { type: "vote"; voter: number }
  /** Count the vote now, with the votes the players cast themselves (no walk through the candidates). */
  | { type: "countVotes" }
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
  /** Test mode, before the game: fill every free seat with a bot (no camera), or remove all bots. */
  | { type: "addBots" }
  | { type: "removeBots" }
  /** Before the game: drag a tile onto another seat (swaps the two). */
  | { type: "moveSeat"; from: number; to: number }
  /** Before the game: where the introduction round is set ("loc:<id>" or the host's own words; null clears it). */
  | { type: "setLocation"; location: string | null }
  /** Show or hide the table in the home page list. */
  | { type: "setPublic"; on: boolean }
  /** Lock the room with a password players and spectators must type to come in (1-32 characters); null opens it. */
  | { type: "setRoomPassword"; password: string | null }
  /** Close the room for good: everyone is sent back to the home page. Handled by the server, not Room.apply. */
  | { type: "closeRoom" }
  /**
   * Seat someone who is watching: a player who lost their connection and can't come back by
   * themselves, or a stand-in. Mid-game the seat keeps its role and state; the old device is let go.
   * Before the game, only a free seat.
   */
  | { type: "seatSpectator"; spectator: string; seat: number }
  /** Turn down a spectator's request to come back to a seat. */
  | { type: "dismissReturn"; spectator: string }
  /** Table volume of the night music, 0..1. (The file itself is uploaded over HTTP: PUT /music/<code>.) */
  | { type: "musicVolume"; volume: number }
  | { type: "clearMusic" }
  | { type: "endGame"; winner: Winner }
  | { type: "newGame" };
