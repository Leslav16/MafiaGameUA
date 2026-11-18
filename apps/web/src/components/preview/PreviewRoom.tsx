"use client";

import { useEffect, useState } from "react";
import { PhaseBanner } from "../room/PhaseBanner";
import { PlayerTile } from "../room/PlayerTile";
import { RoleCard } from "../room/RoleCard";
import { RoomGrid } from "../room/RoomGrid";
import { Timer } from "../room/Timer";
import type { RoomLabels, RoomPhase, SeatInfo } from "../room/types";

const NAMES = ["Оля", "Тарас", "Ірина", "Max", "Богдан", "Софія", "Андрій", "Kate", "Назар", "Марта", "Дмитро"];

/** A stand-in for a camera: a warm-lit silhouette. Sample page only. */
function FakeVideo({ seed }: { seed: number }) {
  const hue = 20 + ((seed * 37) % 30);
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`bg${seed}`} cx="35%" cy="25%" r="90%">
          <stop offset="0%" stopColor={`hsl(${hue} 45% 34%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 30% 9%)`} />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#bg${seed})`} />
      <ellipse cx={80 + (seed % 3) * 6 - 6} cy="54" rx="21" ry="25" fill={`hsl(${hue} 30% 46%)`} />
      <path d={`M${36 + (seed % 3) * 6} 124c4-30 24-40 ${44 - (seed % 2) * 4} -40s40 10 44 40z`} fill={`hsl(${hue} 18% 13%)`} />
    </svg>
  );
}

/**
 * The game room as a player sees it, with made-up players, so the look can
 * be checked before the real room is wired up.
 */
export function PreviewRoom({ labels }: { labels: RoomLabels }) {
  const [phase, setPhase] = useState<RoomPhase>("day");
  const [left, setLeft] = useState(42);
  const [running, setRunning] = useState(true);
  const night = phase === "night";
  const floorSeat = night ? null : 4;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((s) => (s <= 0 ? 60 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const seats: SeatInfo[] = NAMES.map((name, i) => {
    const seat = i + 1;
    const alive = seat !== 7 && seat !== 2;
    return {
      seat,
      name,
      alive,
      connected: seat !== 10,
      camOn: !night && seat !== 9,
      micOn: !night && (seat === floorSeat || seat === 5),
      fouls: seat === 3 ? 2 : seat === 8 ? 1 : 0,
    };
  });

  return (
    <div data-phase={night ? "night" : "day"} className="phase-surface overflow-hidden rounded-xl border border-[var(--line)]">
      <PhaseBanner phase={phase} labels={labels} round={2} floorSeat={floorSeat}>
        <Timer secondsLeft={left} totalSeconds={60} running={running} labels={labels} />
      </PhaseBanner>

      <div className="p-2 sm:p-4">
        <RoomGrid
          host={
            <PlayerTile
              info={{ seat: 0, name: labels.host, alive: true, connected: true, camOn: true, micOn: true, fouls: 0 }}
              labels={labels}
              tag={labels.host}
              video={<FakeVideo seed={11} />}
            />
          }
          seats={seats.map((s) => (
            <PlayerTile
              key={s.seat}
              info={s}
              labels={labels}
              isMe={s.seat === 6}
              speaking={s.seat === floorSeat}
              video={<FakeVideo seed={s.seat} />}
            />
          ))}
        />
      </div>

      {/* The player's own strip: role card and sample switches */}
      <div className="phase-transition flex flex-wrap items-center gap-4 border-t border-[var(--line)] px-4 py-3 sm:px-6">
        <RoleCard role="sheriff" labels={labels} />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPhase(night ? "day" : "night")}
            className="phase-transition inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--color-lamp)]"
          >
            {night ? labels.phase.day : labels.phase.night}
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="phase-transition inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--color-lamp)]"
          >
            <span aria-hidden>{running ? "❚❚" : "▶"}</span>
            <span className="sr-only">{labels.timerLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
