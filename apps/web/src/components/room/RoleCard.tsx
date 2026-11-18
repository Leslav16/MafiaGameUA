"use client";

import { useState } from "react";
import { Figure } from "../figures/Figure";
import type { Role, RoomLabels } from "./types";

const FACE: Record<Role, { mark: string; tone: string }> = {
  civilian: { mark: "♥", tone: "text-[var(--color-ink)]" },
  sheriff: { mark: "★", tone: "text-[var(--color-ochre)]" },
  doctor: { mark: "✚", tone: "text-[#9d1714]" },
  mafia: { mark: "♠", tone: "text-[var(--color-oxblood)]" },
  don: { mark: "♛", tone: "text-[var(--color-oxblood)]" },
};

/**
 * The player's own role card. Lies face down so nobody behind you sees it;
 * tap (or press Enter/Space) to turn it over, tap again to hide.
 */
export function RoleCard({ role, labels, note }: { role: Role; labels: RoomLabels; note?: string }) {
  const [open, setOpen] = useState(false);
  const face = FACE[role];
  const roleText = labels.role[`${role}Text` as const];

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-pressed={open}
      aria-label={open ? `${labels.role.title}: ${labels.role[role]}. ${labels.role.hide}` : `${labels.role.title}. ${labels.role.peek}`}
      className="role-card group block h-36 w-[20rem] max-w-full shrink-0 text-left [perspective:900px]"
    >
      <span data-open={open ? "" : undefined} className="role-card-inner relative block size-full">
        {/* Back */}
        <span className="role-face absolute inset-0 flex flex-col justify-between rounded-lg border border-[var(--color-lamp)]/60 bg-[var(--color-ink)] p-4 text-[var(--color-card)] [background-image:repeating-linear-gradient(45deg,transparent_0_10px,rgba(200,137,63,0.09)_10px_11px)]">
          <span className="font-display text-sm tracking-[0.18em] text-[var(--color-lamp)] uppercase">
            {labels.role.title}
          </span>
          <span className="text-base text-[var(--color-card)]/80">{labels.role.peek}</span>
        </span>
        {/* Front */}
        <span className="role-face role-front absolute inset-0 flex gap-2 rounded-lg bg-[var(--color-card)] py-3 pr-4 pl-1 text-[var(--color-ink)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]">
          <Figure role={role} asleep={!open} className="h-full w-[5.5rem] shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between">
            <span className={`font-display text-3xl leading-none font-semibold tracking-wide ${face.tone}`}>
              {labels.role[role]}
            </span>
            <span aria-hidden className={`text-3xl leading-none ${face.tone}`}>
              {face.mark}
            </span>
          </span>
          <span className="mt-1.5 text-[0.8rem] leading-snug text-[#4a3a28]">{roleText}</span>
          {note && <span className="mt-1 text-[0.8rem] font-semibold text-[var(--color-oxblood)]">{note}</span>}
          <span className="mt-auto text-xs text-[#4a3a28]">{labels.role.hide}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
