"use client";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { SpectatorsView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ModalButton } from "../Modal";

/**
 * Spectators take no tile: just a small eye with the count in the dock,
 * opening a popup with the names of everyone watching now.
 */
export function SpectatorsButton({
  spectators,
  t,
  closeLabel,
}: {
  spectators: SpectatorsView;
  t: Dictionary["roomUi"];
  closeLabel: string;
}) {
  return (
    <ModalButton
      label={
        <>
          <span aria-hidden>👁</span>
          <span className="tabular-nums">{spectators.count}</span>
          <span className="sr-only">{fmt(t.spectatorsCount, { n: spectators.count })}</span>
        </>
      }
      title={t.spectators}
      closeLabel={closeLabel}
      className="phase-transition inline-flex min-h-12 items-center gap-1.5 rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--color-lamp)]"
    >
      <p className="mb-3 text-[var(--text-muted)]">{fmt(t.spectatorsCount, { n: spectators.count })}</p>
      {spectators.names.length === 0 ? (
        <p>{t.spectatorsNone}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {spectators.names.map((name, i) => (
            <li key={`${name}-${i}`} className="rounded-full border border-[var(--line)] px-3 py-1">
              {name}
            </li>
          ))}
        </ul>
      )}
    </ModalButton>
  );
}
