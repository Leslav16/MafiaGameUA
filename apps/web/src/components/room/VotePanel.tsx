"use client";

import { useRef, useState } from "react";
import { fmt as fill } from "@/lib/room/format";
import { CheckIcon } from "./icons";
import type { RoomLabels } from "./types";
import { MOTION, gsap, useGSAP } from "@/lib/motion";

type Voting = {
  candidates: number[];
  votes: Record<number, number[]>;
  revote: boolean;
  result: { tally: Record<number, number>; out: number | null; tied: number[] } | null;
};

/**
 * The vote, on the player's own screen: a button for every candidate, so each living
 * player raises their own hand. One vote each; a new pick replaces the old one and a
 * second tap takes it back, until the host counts. Votes are open, like hands at a
 * real table: everyone sees who voted for whom. Dead players and spectators only watch.
 *
 * Wide screens: a column on the right of the table. Phones: a compact strip above the dock.
 */
export function VotePanel({
  voting,
  names,
  mySeat,
  canVote,
  aliveSeats,
  onVote,
  labels,
  compact = false,
}: {
  voting: Voting;
  /** seat -> player name */
  names: Record<number, string>;
  mySeat: number | null;
  /** A living player (not the host, a spectator or a dead player). */
  canVote: boolean;
  /** Seats still in the game: the voters. */
  aliveSeats: number[];
  /** Resolves to an error message, or null when saved. */
  onVote: (candidate: number | null) => Promise<string | null>;
  labels: RoomLabels;
  compact?: boolean;
}) {
  const t = labels.vote;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const { candidates, votes, result } = voting;
  const last = candidates[candidates.length - 1];
  const myVote = mySeat === null ? null : (candidates.find((c) => votes[c]?.includes(mySeat)) ?? null);
  const cast = Object.values(votes).reduce((n, v) => n + v.length, 0);
  const single = candidates.length === 1;
  const voted = new Set(Object.values(votes).flat());
  /** Living seats that haven't voted yet. */
  const waiting = aliveSeats.filter((s) => !voted.has(s));
  const open = canVote && !result && !single;

  // The panel slides in when the vote opens; the bars grow when the count comes in.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION.ok, () => {
        gsap.fromTo(ref.current, { opacity: 0, x: compact ? 0 : 24, y: compact ? 12 : 0 }, { opacity: 1, x: 0, y: 0, duration: 0.5, clearProps: "transform,opacity" });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [voting.revote] },
  );

  const pick = async (c: number) => {
    if (!open || busy) return;
    setBusy(true);
    setError(null);
    const err = await onVote(myVote === c ? null : c);
    setBusy(false);
    if (err) setError(err);
  };

  const status = result
    ? result.out !== null
      ? fill(t.out, { n: result.out })
      : voting.revote
        ? t.keep
        : fill(t.tie, { list: result.tied.map((s) => `№${s}`).join(", ") })
    : single
      ? fill(t.single, { n: last })
      : !canVote
        ? t.watching
        : myVote !== null
          ? fill(t.yours, { n: myVote })
          : fill(t.notYet, { n: last });

  return (
    <section
      ref={ref}
      aria-label={voting.revote ? t.revote : t.title}
      className={`vote-panel phase-transition flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-lamp)]/40 bg-[var(--color-ink)] text-[var(--color-card)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] ${compact ? "gap-2 p-2.5" : "h-full min-h-0 gap-3 p-4"}`}
    >
      <header className={`flex gap-x-3 gap-y-1 ${compact ? "items-baseline justify-between" : "flex-col"}`}>
        <h2 className={`headline leading-none tracking-wide text-[var(--color-lamp)] ${compact ? "text-xl" : "text-[1.7rem]"}`}>
          {voting.revote ? t.revote : t.title}
        </h2>
        {!result && !single && (
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-card)]/60">
            {fill(t.cast, { n: cast, of: aliveSeats.length })}
          </span>
        )}
      </header>
      {!compact && open && <p className="text-sm text-[var(--color-card)]/70">{t.hint}</p>}

      <ul className={compact ? "grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-1.5" : "flex min-h-0 flex-col gap-2 overflow-y-auto"}>
        {candidates.map((c) => {
          const hands = votes[c] ?? [];
          const mine = myVote === c;
          const n = result ? (result.tally[c] ?? 0) : hands.length;
          const out = result?.out === c;
          const share = aliveSeats.length ? n / aliveSeats.length : 0;
          return (
            <li key={c}>
              <button
                type="button"
                disabled={!open || busy}
                aria-pressed={open ? mine : undefined}
                onClick={() => void pick(c)}
                title={open ? (mine ? t.takeBack : fill(t.against, { n: c })) : undefined}
                className={`vote-option btn-feel relative flex w-full items-center gap-3 overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-default ${compact ? "min-h-12 px-2.5 py-1.5" : "min-h-16 px-3 py-2"} ${
                  (mine && !result) || out
                    ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)] text-[var(--color-card)]"
                    : mine
                      ? "border-[var(--color-lamp)]/70 bg-transparent"
                      : open
                      ? "border-[var(--color-card)]/20 bg-[var(--color-card)]/[0.04] hover:border-[var(--color-lamp)]"
                      : "border-[var(--color-card)]/15 bg-transparent"
                }`}
              >
                {/* how many hands, as a bar behind the row */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${(mine && !result) || out ? "bg-black/20" : "bg-[var(--color-lamp)]/15"}`}
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
                <span className={`relative headline shrink-0 leading-none ${compact ? "text-2xl" : "text-4xl"}`}>{c}</span>
                {compact ? (
                  // Phones: the number says who; the name is on the tile above.
                  <span className="sr-only">{names[c]}</span>
                ) : (
                  <span className="relative flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-display text-base tracking-wide">{names[c] ?? `№${c}`}</span>
                    {hands.length > 0 && (
                      <span className="truncate text-xs text-[var(--color-card)]/65">{fill(t.from, { list: hands.join(", ") })}</span>
                    )}
                  </span>
                )}
                {mine && <CheckIcon className={`relative size-5 shrink-0 ${compact ? "ml-auto" : ""}`} />}
                <span className={`relative shrink-0 font-display tabular-nums ${compact ? `text-lg ${mine ? "" : "ml-auto"}` : "text-2xl"}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p role="status" className={`${compact ? "text-xs" : "text-sm"} ${myVote !== null || result ? "text-[var(--color-card)]" : "text-[var(--color-card)]/70"}`}>
        {status}
      </p>
      {!compact && !result && !single && waiting.length > 0 && (
        <p className="mt-auto text-xs text-[var(--color-card)]/55">{fill(t.waiting, { list: waiting.join(", ") })}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#e0857b]">
          {error}
        </p>
      )}
    </section>
  );
}
