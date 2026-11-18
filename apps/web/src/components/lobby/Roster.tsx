import { fill } from "../room/format";
import type { RoomLabels } from "../room/types";

/** Who's at the table before the game: 11 seats, name and ready mark. */
export function Roster({
  labels,
  seats,
}: {
  labels: RoomLabels;
  /** seat number -> player; missing seats are empty */
  seats: Record<number, { name: string; ready: boolean }>;
}) {
  const readyCount = Object.values(seats).filter((s) => s.ready).length;

  return (
    <section aria-labelledby="roster-title">
      <h2 id="roster-title" className="font-display text-xl tracking-wide">
        {fill(labels.lobby.waiting, readyCount)}
      </h2>
      <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
        {Array.from({ length: 11 }, (_, i) => {
          const n = i + 1;
          const p = seats[n];
          return (
            <li
              key={n}
              className={`phase-transition flex min-h-10 items-center gap-2.5 rounded-md border px-2 ${
                p?.ready ? "border-[var(--color-lamp)]/70" : "border-[var(--line)]"
              }`}
            >
              <span className="w-6 text-center font-display text-lg font-semibold tabular-nums">{n}</span>
              <span className={`min-w-0 flex-1 truncate text-base ${p ? "" : "text-[var(--text-muted)]"}`}>
                {p ? p.name : labels.join.free}
              </span>
              {p && (
                <span
                  aria-label={p.ready ? labels.lobby.ready : labels.lobby.notReady}
                  className={`size-2.5 shrink-0 rounded-full ${p.ready ? "bg-[var(--color-lamp)]" : "bg-[var(--color-smoke)]/50"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
