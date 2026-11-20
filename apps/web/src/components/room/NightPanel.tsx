"use client";

import { useRef, useState } from "react";
import { fmt as fill } from "@/lib/room/format";
import type { MyNightTurn } from "@/lib/room/types";
import { MOTION, gsap, useGSAP } from "@/lib/motion";
import { CheckIcon } from "./icons";
import type { RoomLabels } from "./types";

/**
 * The night, on the screen of the player whose role is awake: a button for every living seat,
 * so the mafia pick their target, the Don and the Sheriff whom to check, the Doctor whom to heal.
 * The host confirms. Mafia see each other's picks: the Don's pick stands; with the Don out,
 * every living mafia must pick the same number. A check is answered at once, only to the
 * player who made it, on a card that turns over.
 *
 * Wide screens: a column on the right of the table. Phones: a compact strip above the dock.
 */
export function NightPanel({
  turn,
  mySeat,
  donSeat,
  aliveSeats,
  names,
  onPick,
  labels,
  compact = false,
}: {
  turn: MyNightTurn;
  mySeat: number;
  /** The Don's seat, for a mafia player (to mark whose pick stands). */
  donSeat: number | null;
  aliveSeats: number[];
  names: Record<number, string>;
  /** Resolves to an error message, or null when saved. */
  onPick: (seat: number) => Promise<string | null>;
  labels: RoomLabels;
  compact?: boolean;
}) {
  const t = labels.night;
  const ref = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = turn.choices[mySeat] ?? null;
  const isCheck = turn.step === "don" || turn.step === "sheriff";
  const locked = isCheck && mine !== null;

  // The panel slides in when the role wakes; the answer card turns over when a check is made.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION.ok, () => {
        gsap.fromTo(
          ref.current,
          { opacity: 0, x: compact ? 0 : 24, y: compact ? 12 : 0 },
          { opacity: 1, x: 0, y: 0, duration: 0.5, clearProps: "transform,opacity" },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [turn.step] },
  );
  useGSAP(
    () => {
      if (turn.result === null) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION.ok, () => {
        gsap
          .timeline()
          .fromTo(".nt-answer", { rotateY: -100, opacity: 0 }, { rotateY: 0, opacity: 1, duration: 0.9, ease: "back.out(1.4)" })
          .fromTo(".nt-answer-word", { scale: 1.6, opacity: 0, filter: "blur(6px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5 }, "-=0.35");
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [turn.result, mine] },
  );

  const pick = async (seat: number) => {
    if (busy || locked || seat === mine) return;
    setBusy(true);
    setError(null);
    const err = await onPick(seat);
    setBusy(false);
    if (err) setError(err);
  };

  // Mafia: who picked whom.
  const pickedBy = new Map<number, number[]>();
  for (const [by, target] of Object.entries(turn.choices)) pickedBy.set(target, [...(pickedBy.get(target) ?? []), Number(by)]);

  const status =
    turn.step === "mafia"
      ? turn.agreed !== null
        ? fill(t.agreed, { n: turn.agreed })
        : donSeat !== null
          ? t.waitDon
          : t.notAgreed
      : mine !== null
        ? fill(t.yours, { n: mine })
        : t.hint[turn.step];

  const answer =
    turn.result === null
      ? null
      : turn.step === "don"
        ? turn.result
          ? t.isSheriff
          : t.notSheriff
        : turn.result
          ? t.isMafia
          : t.notMafia;

  return (
    <section
      ref={ref}
      aria-label={t.title[turn.step]}
      className={`night-panel phase-transition flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-lamp)]/40 bg-[var(--color-ink)] text-[var(--color-card)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)] ${compact ? "gap-2 p-2.5" : "h-full min-h-0 gap-3 p-4"}`}
    >
      <h2 className={`headline leading-none tracking-wide text-[var(--color-lamp)] ${compact ? "text-xl" : "text-[1.7rem]"}`}>
        {t.title[turn.step]}
      </h2>
      {!compact && <p className="text-sm text-[var(--color-card)]/70">{t.rule[turn.step]}</p>}

      {answer !== null && mine !== null && (
        <div
          role="status"
          className={`nt-answer flex items-center gap-3 rounded-lg border px-3 py-2 ${
            turn.result
              ? "border-[var(--color-blood-light)] bg-[var(--color-oxblood)] text-[var(--color-card)]"
              : "border-[var(--color-lamp)]/60 bg-[var(--color-lamp)]/10"
          }`}
        >
          <span className="headline text-3xl leading-none">{mine}</span>
          <span className="min-w-0 flex-1 truncate text-sm opacity-80">{names[mine]}</span>
          <strong className="nt-answer-word headline text-2xl leading-none">{answer}</strong>
        </div>
      )}

      {!locked && (
        <ul className={compact ? "grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5" : "grid min-h-0 grid-cols-2 gap-2 overflow-y-auto"}>
          {aliveSeats.map((s) => {
            const blocked = turn.blocked.includes(s);
            const chosen = mine === s;
            const by = turn.step === "mafia" ? (pickedBy.get(s) ?? []).filter((x) => x !== mySeat) : [];
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={busy || blocked}
                  aria-pressed={chosen}
                  onClick={() => void pick(s)}
                  title={blocked && turn.step === "doctor" ? t.blocked : names[s]}
                  className={`btn-feel relative flex w-full items-center gap-2 rounded-lg border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${compact ? "min-h-12 justify-center px-1.5" : "min-h-14 px-3 py-1.5"} ${
                    chosen
                      ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)]"
                      : turn.agreed === s
                        ? "border-[var(--color-oxblood)] bg-transparent"
                        : "border-[var(--color-card)]/20 bg-[var(--color-card)]/[0.04] hover:border-[var(--color-lamp)]"
                  }`}
                >
                  <span className={`headline shrink-0 leading-none ${compact ? "text-2xl" : "text-3xl"}`}>{s}</span>
                  {compact ? (
                    <span className="sr-only">{names[s]}</span>
                  ) : (
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{names[s]}</span>
                      {by.length > 0 && (
                        <span className="truncate text-xs text-[var(--color-blood-light)]">
                          {fill(t.from, { list: by.map((x) => (x === donSeat ? t.don : `№${x}`)).join(", ") })}
                        </span>
                      )}
                    </span>
                  )}
                  {chosen && !compact && <CheckIcon className="size-4 shrink-0" />}
                  {compact && by.length > 0 && (
                    <span aria-hidden className="absolute top-0.5 right-1 text-[0.65rem] text-[var(--color-blood-light)]">
                      {by.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p role="status" className={`${compact ? "text-xs" : "text-sm"} text-[var(--color-card)]/80`}>
        {status}
        {mine !== null && turn.step !== "mafia" ? ` ${t.waitHost}` : ""}
      </p>
      {error && (
        <p role="alert" className="text-sm text-[#e0857b]">
          {error}
        </p>
      )}
    </section>
  );
}
