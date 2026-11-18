import type { ReactNode } from "react";
import { fill } from "./format";
import { CamIcon, MicIcon } from "./icons";
import type { RoomLabels, SeatInfo } from "./types";

const ROLE_MARK: Record<NonNullable<SeatInfo["role"]>, string> = {
  civilian: "bg-[var(--color-card)]",
  sheriff: "bg-[var(--color-lamp)]",
  mafia: "bg-[var(--color-oxblood)]",
  don: "bg-[var(--color-oxblood)] ring-2 ring-[var(--color-card)]",
};

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
  video,
  children,
  className = "",
}: {
  info: SeatInfo;
  labels: RoomLabels;
  speaking?: boolean;
  isMe?: boolean;
  /** Show the small role mark (host view, or mafia seeing each other). */
  showRole?: boolean;
  /** Replaces the seat number in the corner tag, e.g. "Host". */
  tag?: string;
  video?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { seat, name, alive, connected, camOn, micOn, fouls, role } = info;
  const seatLabel = tag ?? fill(labels.seat, seat);
  const mark = tag ?? seat;
  const showVideo = alive && camOn && connected && video;

  const status = [
    seatLabel,
    name,
    isMe ? labels.you : null,
    !alive ? labels.killed : null,
    speaking && alive ? labels.speaking : null,
    !connected ? labels.offline : null,
    alive && !micOn ? labels.micOff : null,
    alive && !camOn ? labels.camOff : null,
    fouls > 0 ? fill(labels.fouls, fouls) : null,
    showRole && role ? labels.role[role] : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <figure
      aria-label={status}
      data-speaking={speaking && alive ? "" : undefined}
      data-alive={alive ? "" : undefined}
      className={`tile group relative isolate aspect-[4/3] overflow-hidden rounded-lg bg-[var(--tile)] text-[var(--color-card)] ${className}`}
    >
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
        </div>
      )}

      {/* Seat number tag, top-left */}
      <span
        aria-hidden
        className="absolute top-0 left-0 z-10 grid min-w-[2.6em] place-items-center rounded-br-md bg-[var(--color-card)] px-2 py-0.5 font-display text-[clamp(1.1rem,3.4cqw,1.9rem)] leading-tight font-semibold text-[var(--color-ink)] tabular-nums"
      >
        {mark}
      </span>

      {/* Role mark, top-right (host view only) */}
      {showRole && role && (
        <span
          aria-hidden
          title={labels.role[role]}
          className={`absolute top-2 right-2 z-10 size-3.5 rounded-full ${ROLE_MARK[role]}`}
        />
      )}

      {/* Fouls: one notch each, up to four */}
      {fouls > 0 && (
        <span aria-hidden className="absolute top-2.5 left-[3.6em] z-10 flex gap-1">
          {Array.from({ length: Math.min(fouls, 4) }, (_, i) => (
            <span key={i} className="h-3 w-1.5 rounded-sm bg-[var(--color-lamp)]" />
          ))}
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
        {alive && !camOn && <CamIcon off className="size-4 shrink-0 text-[var(--color-smoke)]" />}
        {alive && (
          <MicIcon
            off={!micOn}
            className={`size-4 shrink-0 ${micOn ? "text-[var(--color-card)]" : "text-[var(--color-blood-light)]"}`}
          />
        )}
      </figcaption>

      {/* Disconnected */}
      {!connected && alive && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55">
          <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[clamp(0.7rem,2.6cqw,0.875rem)] whitespace-nowrap">{labels.offline}</span>
        </div>
      )}

      {/* Killed: the tile goes dark and gets stamped */}
      {!alive && (
        <div className="absolute inset-0 z-[5] grid place-items-center bg-[#0b0806]/80">
          <span className="stamp font-display text-[clamp(0.9rem,3.2cqw,1.6rem)] font-semibold tracking-[0.12em] uppercase">
            {labels.killed} · {mark}
          </span>
        </div>
      )}
    </figure>
  );
}
