import type { ReactNode } from "react";
import { fill } from "./format";
import type { RoomLabels, SeatInfo } from "./types";

const ROLE_MARK: Record<NonNullable<SeatInfo["role"]>, string> = {
  civilian: "bg-[var(--color-card)] text-[var(--color-ink)]",
  sheriff: "bg-[var(--color-lamp)] text-[var(--color-ink)]",
  doctor: "bg-[#efe8da] text-[#9d1714]",
  mafia: "bg-[var(--color-oxblood)] text-[var(--color-card)]",
  don: "bg-[var(--color-oxblood)] text-[var(--color-card)] ring-1 ring-[var(--color-card)]",
};

/** Each way out of the game gets its own emblem and stamp colour. */
const OUT_STYLE = {
  killed: { glyph: "✝", cls: "stamp-killed" },
  voted: { glyph: "✋", cls: "stamp-voted" },
  removed: { glyph: "⊘", cls: "stamp-removed" },
} as const;

/**
 * One seat at the table: a video tile with the seat number pinned to its
 * corner like an evidence tag. No game logic: everything comes in as props.
 *
 * - `video`: the camera element (shown only when `camOn`).
 * - `children`: an optional controls overlay (the host panel puts its
 *   buttons here); it sits along the bottom edge, above the name strip.
 */
export function PlayerTile({
  info,
  labels,
  speaking = false,
  isMe = false,
  showRole = false,
  tag,
  isHost = false,
  selected = false,
  onSelect,
  video,
  children,
  className = "",
  against,
  nightMark,
}: {
  info: SeatInfo;
  labels: RoomLabels;
  speaking?: boolean;
  isMe?: boolean;
  /** Show the small role mark (host view, or mafia seeing each other). */
  showRole?: boolean;
  /** Replaces the seat number in the corner tag, e.g. "Host". */
  tag?: string;
  /** The host's own tile: set apart with a lamp frame. */
  isHost?: boolean;
  /** Host view: tiles can be clicked to select a player. */
  selected?: boolean;
  onSelect?: () => void;
  video?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Voting: seats that voted against this player. Shown as a column of badges on the right edge until the vote ends. */
  against?: number[];
  /** A private note only this viewer sees, e.g. the Sheriff's check result. `tone` colours it. */
  nightMark?: { text: string; tone: "bad" | "good" | "info" } | null;
}) {
  // No camera/mic icons on tiles: at night they could hint at who is awake.
  const { seat, name, alive, connected, camOn, fouls, role, nominated = false } = info;
  const out = alive ? null : (info.out ?? "killed");
  const outLabel = out === "voted" ? labels.votedOut : out === "removed" ? labels.removed : labels.killed;
  const seatLabel = tag ?? fill(labels.seat, seat);
  const mark = tag ?? seat;
  const showVideo = alive && camOn && connected && video;

  const status = [
    seatLabel,
    name,
    isMe ? labels.you : null,
    out ? outLabel : null,
    nominated && alive ? labels.nominated : null,
    speaking && alive ? labels.speaking : null,
    !connected ? labels.offline : null,
    fouls > 0 ? fill(labels.fouls, fouls) : null,
    showRole && role ? labels.role[role] : null,
    against && against.length ? fill(labels.votesAgainst, against.length) : null,
    nightMark ? nightMark.text : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <figure
      aria-label={status}
      data-speaking={speaking && alive ? "" : undefined}
      data-alive={alive ? "" : undefined}
      data-host={isHost ? "" : undefined}
      data-selected={selected ? "" : undefined}
      data-nominated={nominated && alive ? "" : undefined}
      className={`tile group relative isolate aspect-[4/3] overflow-hidden rounded-lg bg-[var(--tile)] text-[var(--color-card)] ${className}`}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`${labels.select}: ${status}`}
          className="absolute inset-0 z-30 cursor-pointer rounded-lg focus-visible:outline-offset-[-3px]"
        />
      )}
      {/* Camera, or the seat number when the camera is off */}
      {showVideo ? (
        <div className="absolute inset-0 [&>*]:size-full [&>*]:object-cover">{video}</div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span
            hidden={!connected}
            aria-hidden
            className="font-display text-[clamp(2.5rem,7cqw,5rem)] leading-none font-medium text-[var(--tile-number)] tabular-nums"
          >
            {mark}
          </span>
          {info.bot && (
            <span aria-hidden className="absolute bottom-9 font-display text-[clamp(0.7rem,2.4cqw,0.9rem)] tracking-[0.2em] text-[var(--tile-number)] uppercase">
              ⚙ bot
            </span>
          )}
        </div>
      )}

      {/* Seat number tag, top-left */}
      <span
        aria-hidden
        className={`absolute top-0 left-0 z-10 grid min-w-[2.6em] place-items-center rounded-br-md px-2 py-0.5 ${isHost ? "bg-[var(--color-lamp)] tracking-wide uppercase" : "bg-[var(--color-card)]"} font-display text-[clamp(1.1rem,3.4cqw,1.9rem)] leading-tight font-semibold text-[var(--color-ink)] tabular-nums`}
      >
        {mark}
      </span>

      {/* Role mark, top-right (host view only) */}
      {showRole && role && (
        <span
          aria-hidden
          className={`absolute top-1.5 right-1.5 z-10 rounded-sm px-1.5 text-[clamp(0.65rem,2.4cqw,0.85rem)] leading-5 font-semibold ${ROLE_MARK[role]}`}
        >
          {labels.role[role]}
        </span>
      )}

      {/* Nominated: a raised-hand badge, top-centre, seen by everyone */}
      {nominated && alive && (
        <span
          aria-hidden
          className="nominee-badge absolute top-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--color-oxblood)] px-2 font-display text-[clamp(0.65rem,2.4cqw,0.9rem)] leading-6 tracking-wide text-[var(--color-card)] uppercase ring-1 ring-[var(--color-card)]/60"
        >
          <span aria-hidden>☝</span>
          {labels.nominated}
        </span>
      )}

      {/* Fouls: one notch each, up to four */}
      {fouls > 0 && (
        <span aria-hidden className="absolute top-2.5 left-[3.6em] z-10 flex gap-1">
          {Array.from({ length: Math.min(fouls, 4) }, (_, i) => (
            <span key={i} className="h-3 w-1.5 rounded-sm bg-[var(--color-lamp)]" />
          ))}
        </span>
      )}

      {/* Votes against: thumbs-down badges stacked on the right edge, never over the face */}
      {against && against.length > 0 && (
        <div aria-hidden className="absolute top-9 right-1.5 bottom-10 z-20 flex flex-col flex-wrap-reverse content-start items-end gap-1">
          <span className="vote-badge vote-count flex h-6 items-center gap-1 rounded-full px-2 font-display text-[0.85rem] leading-none tabular-nums">
            <ThumbDown className="size-3.5" />
            {against.length}
          </span>
          {against.map((v) => (
            <span key={v} className="vote-badge flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-display text-[0.7rem] leading-none tabular-nums">
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Private night mark (only this viewer sees it) */}
      {nightMark && (
        <span
          aria-hidden
          data-tone={nightMark.tone}
          className="night-mark absolute bottom-9 left-1.5 z-20 rounded-full px-2 font-display text-[clamp(0.65rem,2.3cqw,0.85rem)] leading-5 tracking-wide"
        >
          {nightMark.text}
        </span>
      )}

      {/* Controls slot (host panel) */}
      {children && (
        <div className="absolute inset-x-0 bottom-9 z-20 flex justify-center gap-1.5 px-2">
          {children}
        </div>
      )}

      {/* Name strip */}
      <figcaption className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 pt-5 pb-1.5 text-[clamp(0.8rem,2.4cqw,1rem)] leading-tight">
        <span className="min-w-0 flex-1 truncate font-medium">
          {name}
          {isMe && (
            <span className="ml-1.5 rounded-sm bg-[var(--color-lamp)] px-1 text-[0.8em] font-semibold text-[var(--color-ink)]">
              {labels.you}
            </span>
          )}
        </span>
      </figcaption>

      {/* Disconnected */}
      {!connected && alive && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55">
          <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[clamp(0.7rem,2.6cqw,0.875rem)] whitespace-nowrap">{labels.offline}</span>
        </div>
      )}

      {/* Out of the game: the tile goes dark and gets a stamp per reason */}
      {out && (
        <div className="absolute inset-0 z-[5] grid place-items-center bg-[#0b0806]/80">
          <span
            className={`stamp ${OUT_STYLE[out].cls} flex items-center gap-2 font-display text-[clamp(0.9rem,3.2cqw,1.6rem)] font-semibold tracking-[0.12em] uppercase`}
          >
            <span aria-hidden className="text-[1.2em] leading-none">{OUT_STYLE[out].glyph}</span>
            {outLabel} · {mark}
          </span>
        </div>
      )}
    </figure>
  );
}

function ThumbDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M15 3H6.3a2 2 0 0 0-2 1.6l-1.3 7A2 2 0 0 0 5 14h5.6l-.8 4.2a1.6 1.6 0 0 0 .4 1.4l.9.9 5.6-6.1A2 2 0 0 0 17 13V5a2 2 0 0 0-2-2Zm3 0h1.5A1.5 1.5 0 0 1 21 4.5v8a1.5 1.5 0 0 1-1.5 1.5H18Z" />
    </svg>
  );
}
