import { GameError } from "./errors.js";
import { SEAT_COUNT } from "./types.js";

/** Names and seat numbers typed by people: cleaned up and checked. */

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

export function assertSeat(seat: unknown): number {
  if (typeof seat !== "number" || !Number.isInteger(seat) || seat < 1 || seat > SEAT_COUNT) {
    throw new GameError("invalid_seat");
  }
  return seat;
}
