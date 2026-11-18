"use client";

import type { SeatView } from "@/lib/room/types";

export type PadState = "normal" | "on" | "muted" | "disabled";

/**
 * Seats 1–11 as big number keys, laid out like the table grid. The host taps
 * numbers to put players up for the vote, count hands, or record a night pick.
 */
export function SeatPad({
  seats,
  state,
  badge,
  onTap,
  label,
}: {
  seats: SeatView[];
  state: (seat: SeatView) => PadState;
  /** Small text in the key's corner (order number, a result). */
  badge?: (seat: SeatView) => string | null;
  onTap: (seat: number) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-4 gap-1.5">
      {seats.map((s) => {
        const st = s.name ? state(s) : "disabled";
        const b = badge?.(s);
        return (
          <button
            key={s.seat}
            type="button"
            disabled={st === "disabled"}
            aria-pressed={st === "on"}
            aria-label={s.name ? `${s.seat} ${s.name}` : String(s.seat)}
            onClick={() => onTap(s.seat)}
            className={`relative flex min-h-12 flex-col items-center justify-center rounded-md border font-display leading-none transition-colors disabled:opacity-25 ${
              st === "on"
                ? "border-lamp bg-lamp text-ink"
                : st === "muted"
                  ? "border-[var(--line)] bg-transparent text-[var(--text-muted)]"
                  : "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp"
            }`}
          >
            <span className="text-xl font-semibold">{s.seat}</span>
            {s.name && <span className="max-w-full truncate px-1 font-sans text-[0.65rem] opacity-80">{s.name}</span>}
            {b && (
              <span className="absolute top-0.5 right-1 font-sans text-[0.65rem] font-semibold">{b}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
