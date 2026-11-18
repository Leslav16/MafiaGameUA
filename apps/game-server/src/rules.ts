import type { Role, VoteResult, Winner } from "./types.js";

/**
 * Game rules as plain functions, agreed with the owner (2026-11-18):
 * - Speaking order is a "snake": day d is opened by seat d (wrapping round the
 *   table); if that player is out, the next living player opens. Everyone after
 *   follows round the table, so the previous opener speaks last.
 * - Voting: candidates are voted on in the order they were put up. Each living
 *   player votes once; whoever has not voted by the last candidate votes for them.
 *   A single top candidate is out. A tie sends only the tied candidates to a
 *   re-vote; a second tie leaves them all at the table.
 * - Doctor: may heal anyone, but not the same player two nights in a row; may
 *   heal himself at most twice a game (also not two nights in a row).
 */

export const isMafia = (role: Role | null | undefined) => role === "don" || role === "mafia";

/** Living seats in speaking order for day `day` (1-based; the intro round uses 1). */
export function speakingOrder(aliveSeats: number[], day: number, seatCount = 11): number[] {
  const seats = [...aliveSeats].sort((a, b) => a - b);
  if (seats.length === 0) return [];
  const nominal = ((Math.max(1, day) - 1) % seatCount) + 1;
  let start = seats.findIndex((s) => s >= nominal);
  if (start === -1) start = 0;
  return [...seats.slice(start), ...seats.slice(0, start)];
}

/**
 * Counts a vote. `votes` holds the hands raised against every candidate except
 * possibly the last; all living voters who did not vote go to the last candidate.
 */
export function countVotes(candidates: number[], votes: Record<number, number[]>, voters: number[]): VoteResult {
  const used = new Set<number>();
  const tally: Record<number, number> = {};
  candidates.forEach((c, i) => {
    const last = i === candidates.length - 1;
    const hands = last ? voters.filter((v) => !used.has(v)) : (votes[c] ?? []).filter((v) => voters.includes(v) && !used.has(v));
    hands.forEach((v) => used.add(v));
    tally[c] = hands.length;
  });
  const max = Math.max(...candidates.map((c) => tally[c]));
  const top = candidates.filter((c) => tally[c] === max);
  return { tally, out: top.length === 1 ? top[0] : null, tied: top.length > 1 ? top : [] };
}

export interface DoctorMemory {
  lastHeal: number | null;
  selfHeals: number;
}

/** Seats the Doctor (sitting at `doctorSeat`) may not heal tonight. */
export function healBlocked(doctorSeat: number | null, memory: DoctorMemory): number[] {
  const blocked = new Set<number>();
  if (memory.lastHeal !== null) blocked.add(memory.lastHeal);
  if (doctorSeat !== null && memory.selfHeals >= 2) blocked.add(doctorSeat);
  return [...blocked];
}

/** The game looks decided once the mafia is gone, or has as many players as everyone else. */
export function suggestWinner(aliveRoles: (Role | null)[]): Winner | null {
  const mafia = aliveRoles.filter(isMafia).length;
  const town = aliveRoles.length - mafia;
  if (mafia === 0) return "town";
  if (mafia >= town) return "mafia";
  return null;
}
