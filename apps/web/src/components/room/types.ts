import type { Dictionary } from "@/app/[lang]/dictionaries";

/** The room's words, from the "ui" block of the uk/en dictionaries. */
export type RoomLabels = Dictionary["ui"];

export type Role = "civilian" | "sheriff" | "doctor" | "mafia" | "don";
export type RoomPhase = "lobby" | "day" | "night" | "ended";

/**
 * What a tile needs to know about one seat. Mirrors the seat fields of the
 * room state (RoomView) so the room page can pass a seat straight through.
 */
export type SeatInfo = {
  seat: number;
  name: string;
  alive: boolean;
  connected: boolean;
  camOn: boolean;
  micOn: boolean;
  fouls: number;
  role?: Role;
  /** Why the player is out of the game: killed at night, voted out by the town, or removed by the host. */
  out?: OutReason | null;
  /** Put up for the vote today: everyone sees the marker. */
  nominated?: boolean;
  /** A test bot (no camera or mic). */
  bot?: boolean;
};

export type OutReason = "killed" | "voted" | "removed";
