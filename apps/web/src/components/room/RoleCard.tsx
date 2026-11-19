"use client";

import { useState } from "react";
import type { Role, RoomLabels } from "./types";
import { RoleArt } from "../cards/RoleArt";

const FACE: Record<Role, { mark: string; tone: string }> = {
  civilian: { mark: "♥", tone: "text-[var(--color-ink)]" },
  sheriff: { mark: "★", tone: "text-[var(--color-ochre)]" },
  doctor: { mark: "✚", tone: "text-[#9d1714]" },
  mafia: { mark: "♠", tone: "text-[var(--color-oxblood)]" },
  don: { mark: "♛", tone: "text-[var(--color-oxblood)]" },
};

/**
 * The player's own role, as a small chip in the dock (the same height as the
 * mic and camera buttons), so it takes no room from the table. It lies face
 * down so nobody behind you sees it; tap (or Enter/Space) to turn it over and
 * see the role and, for the mafia, the teammates; tap again to hide.
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
      aria-label={open ? `${labels.role.title}: ${labels.role[role]}. ${roleText} ${note ?? ""} ${labels.role.hide}` : `${labels.role.title}. ${labels.role.peek}`}
      title={open ? roleText : labels.role.peek}
      className="role-card group block h-12 w-[15rem] max-w-full shrink-0 text-left [perspective:700px]"
    >
      <span data-open={open ? "" : undefined} className="role-card-inner relative block size-full">
        {/* Back */}
        <span className="role-face absolute inset-0 flex items-center gap-2.5 rounded-full border border-[var(--color-lamp)]/60 bg-[var(--color-ink)] px-4 text-[var(--color-card)] [background-image:repeating-linear-gradient(45deg,transparent_0_10px,rgba(200,137,63,0.09)_10px_11px)]">
          <span aria-hidden className="text-lg leading-none text-[var(--color-lamp)]">♠</span>
          <span className="truncate font-display text-base tracking-wide">{labels.role.peek}</span>
        </span>
        {/* Front */}
        <span className="role-face role-front absolute inset-0 flex items-center gap-2 overflow-hidden rounded-full bg-[var(--color-card)] pr-4 pl-1 text-[var(--color-ink)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]">
          <span aria-hidden className="role-medal relative size-10 shrink-0 overflow-hidden rounded-full">
            <RoleArt role={role} className="absolute inset-[3px] size-[calc(100%-6px)] rounded-full" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center leading-none">
            <span className={`headline truncate text-xl leading-none tracking-wide ${face.tone}`}>
              {face.mark} {labels.role[role]}
            </span>
            {note && <span className="mt-0.5 truncate text-[0.72rem] font-semibold text-[var(--color-oxblood)]">{note}</span>}
          </span>
        </span>
      </span>
    </button>
  );
}
