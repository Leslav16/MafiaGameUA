import { clock } from "./format";
import type { RoomLabels } from "./types";

/**
 * A speech timer. Pure display: the room state counts down, this draws it.
 * Turns red for the last ten seconds.
 */
export function Timer({
  secondsLeft,
  totalSeconds,
  running,
  labels,
}: {
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
  labels: RoomLabels;
}) {
  const share = totalSeconds > 0 ? Math.min(1, Math.max(0, secondsLeft / totalSeconds)) : 0;
  const urgent = running && secondsLeft <= 10;
  const color = urgent ? "var(--urgent)" : "var(--color-lamp)";

  return (
    <div
      role="timer"
      aria-label={`${labels.timerLabel}: ${clock(secondsLeft)}${running ? "" : `, ${labels.paused}`}`}
      className="flex items-center gap-3"
    >
      <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-[var(--line)] phase-transition" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${share * 100} 100`}
          stroke={color}
          className="transition-[stroke-dasharray] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        aria-hidden
        className={`font-display text-3xl leading-none font-medium tabular-nums ${urgent ? "text-[var(--urgent)]" : ""} ${running ? "" : "opacity-60"}`}
      >
        {clock(secondsLeft)}
      </span>
      {!running && (
        <span aria-hidden className="text-sm text-[var(--text-muted)] phase-transition">
          {labels.paused}
        </span>
      )}
    </div>
  );
}
