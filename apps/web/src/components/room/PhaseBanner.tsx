import type { ReactNode } from "react";
import { fill } from "./format";
import { MoonIcon, SunIcon } from "./icons";
import type { RoomLabels, RoomPhase } from "./types";

/**
 * The strip across the top of the room: which phase, which round, who has
 * the floor, and a slot on the right for the timer.
 */
export function PhaseBanner({
  phase,
  labels,
  round,
  floorSeat,
  children,
}: {
  phase: RoomPhase;
  labels: RoomLabels;
  round?: number;
  floorSeat?: number | null;
  /** Usually <Timer />. */
  children?: ReactNode;
}) {
  const Icon = phase === "night" ? MoonIcon : SunIcon;

  return (
    <header
      aria-live="polite"
      className="phase-transition flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-4 py-3 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`size-7 ${phase === "night" ? "text-[var(--color-smoke)]" : "text-[var(--accent-strong)]"}`}
        />
        <h1 className="font-display text-2xl leading-none font-medium tracking-wide sm:text-3xl">
          {labels.phase[phase]}
        </h1>
        {round != null && phase !== "lobby" && (
          <span className="font-display text-lg leading-none text-[var(--text-muted)] phase-transition">
            {fill(labels.round, round)}
          </span>
        )}
      </div>

      {floorSeat != null && (
        <p className="flex items-center gap-2 rounded-full bg-[var(--color-lamp)] py-1 pr-3.5 pl-1 text-base font-medium text-[var(--color-ink)]">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--color-ink)] font-display text-[var(--color-card)] tabular-nums">
            {floorSeat}
          </span>
          {fill(labels.floor, floorSeat)}
        </p>
      )}

      {children && <div className="ml-auto">{children}</div>}
    </header>
  );
}
