"use client";

import type { ReactNode } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { ParticipantMedia } from "@/lib/room/useRoom";
import type { Role } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { CamIcon, MicIcon } from "./icons";
import { AudioOut, VideoView } from "./media";

const roleTone: Record<Role, string> = {
  don: "bg-oxblood text-card",
  mafia: "bg-oxblood text-card",
  sheriff: "bg-lamp text-ink",
  doctor: "bg-[#2f7a5a] text-card",
  civilian: "bg-card text-ink",
};

/**
 * One seat at the table: video, seat number, name, and status.
 * Plain on purpose; the room's final look comes from the design work.
 * `children` is where the host's controls for this seat go.
 */
export function SeatTile({
  label,
  name,
  isYou,
  isFloor,
  alive = true,
  connected = true,
  fouls = 0,
  role,
  media,
  t,
  large,
  hostTile,
  selected,
  onSelect,
  children,
}: {
  label: string;
  name: string | null;
  isYou?: boolean;
  isFloor?: boolean;
  alive?: boolean;
  connected?: boolean;
  fouls?: number;
  role?: Role;
  media: ParticipantMedia;
  t: Dictionary["roomUi"];
  large?: boolean;
  /** The host's own tile: seat 12, set apart from the players. */
  hostTile?: boolean;
  /** Host only: this tile is the player chosen in the host panel. */
  selected?: boolean;
  /** Host only: clicking the tile chooses this player in the host panel. */
  onSelect?: () => void;
  children?: ReactNode;
}) {
  const ring = selected
    ? "ring-4 ring-[#5aa9e6]"
    : media.speaking && media.micOn
      ? "ring-4 ring-lamp"
      : isFloor
        ? "ring-2 ring-lamp/70"
        : hostTile
          ? "ring-2 ring-card/80"
          : "ring-1 ring-[var(--line)]";

  return (
    <li className={`flex flex-col gap-2 ${hostTile ? "rounded-xl bg-card/10 p-1.5" : ""}`}>
      <div
        className={`relative overflow-hidden rounded-lg bg-[#10162a] ${large ? "aspect-video" : "aspect-[4/3]"} ${ring} transition-shadow`}
      >
        {onSelect && name && (
          <button
            type="button"
            aria-pressed={!!selected}
            aria-label={`${label} ${name}`}
            onClick={onSelect}
            className="absolute inset-0 z-10 cursor-pointer"
          />
        )}
        <VideoView track={alive ? media.video : undefined} mirror={media.isLocal} label={name ?? label} />
        {!media.isLocal && <AudioOut track={media.audio} />}

        {(!media.video || !alive) && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-5xl font-semibold text-smoke/60">{name ? label : "·"}</span>
          </div>
        )}

        {/* seat number, pinned like an evidence tag */}
        <span className="absolute top-2 left-2 rounded bg-card px-2 font-display text-xl leading-8 font-semibold text-ink">
          {label}
        </span>

        {role && (
          <span className={`absolute top-2 right-2 rounded px-2 text-sm leading-6 font-medium ${roleTone[role]}`}>
            {t.roles[role]}
          </span>
        )}

        {!alive && (
          <div className="absolute inset-0 grid place-items-center bg-ink/70">
            <span className="-rotate-12 rounded border-4 border-oxblood px-3 font-display text-2xl font-semibold tracking-wider text-[#e05a6a] uppercase">
              {t.killed}
            </span>
          </div>
        )}

        <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-2 text-card">
          <span className="truncate rounded bg-ink/70 px-2 text-sm leading-6">
            {name ?? t.empty}
            {isYou && ` (${t.you})`}
            {name && !connected && ` · ${t.offlineBadge}`}
          </span>
          {name && (
            <span className="flex shrink-0 gap-1 rounded bg-ink/70 px-1.5 py-0.5">
              <span className={media.camOn ? "" : "text-[#e05a6a]"} title={t.camera}>
                <CamIcon off={!media.camOn} />
              </span>
              <span className={media.micOn ? "" : "text-[#e05a6a]"} title={t.mic}>
                <MicIcon off={!media.micOn} />
              </span>
            </span>
          )}
        </div>
      </div>

      {(fouls > 0 || isFloor) && (
        <div className="flex items-center gap-2 text-sm">
          {isFloor && <span className="rounded bg-lamp px-2 font-medium text-ink">{t.speaking}</span>}
          {fouls > 0 && (
            <span aria-label={fmt(t.fouls, { n: fouls })} className="flex items-center gap-1">
              {Array.from({ length: fouls }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${fouls >= 3 ? "bg-oxblood" : "bg-lamp"}`} />
              ))}
              <span className="text-[var(--text-muted)]">{fmt(t.fouls, { n: fouls })}</span>
            </span>
          )}
        </div>
      )}

      {children}
    </li>
  );
}
