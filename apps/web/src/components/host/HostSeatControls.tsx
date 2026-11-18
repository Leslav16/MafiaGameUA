"use client";

import { useState } from "react";
import type { HostAction, Phase, SeatView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import type { HostDict } from "./HostPanel";

const btn =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded border px-2.5 text-sm font-medium transition-colors disabled:opacity-40";
const on = "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp";
const off = "border-oxblood bg-oxblood text-card hover:brightness-110";

/** The control strip under each player's tile, shown only to the host. */
export function HostSeatControls({
  seat,
  phase,
  floorSeat,
  freeSeats,
  act,
  t,
}: {
  seat: SeatView;
  phase: Phase;
  floorSeat: number | null;
  freeSeats: number[];
  act: (a: HostAction) => void;
  t: HostDict;
}) {
  const [moveTo, setMoveTo] = useState<string>("");
  if (!seat.name) return null;
  const n = seat.seat;
  const hasFloor = floorSeat === n;

  return (
    <div className="flex flex-col gap-1.5" aria-label={t.title}>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={!seat.hostCamOff}
          aria-label={fmt(seat.hostCamOff ? t.camOnLabel : t.camOffLabel, { n })}
          className={`${btn} ${seat.hostCamOff ? off : on}`}
          onClick={() => act({ type: "setCam", seat: n, on: seat.hostCamOff })}
        >
          {t.cam} {seat.hostCamOff ? "✕" : "✓"}
        </button>
        <button
          type="button"
          aria-pressed={!seat.hostMicOff}
          aria-label={fmt(seat.hostMicOff ? t.micOnLabel : t.micOffLabel, { n })}
          className={`${btn} ${seat.hostMicOff ? off : on}`}
          onClick={() => act({ type: "setMic", seat: n, on: seat.hostMicOff })}
        >
          {t.mic} {seat.hostMicOff ? "✕" : "✓"}
        </button>
        <button
          type="button"
          aria-pressed={hasFloor}
          aria-label={fmt(t.floorLabel, { n })}
          disabled={!seat.alive || phase === "night" || phase === "ended"}
          className={`${btn} ${hasFloor ? "border-lamp bg-lamp text-ink" : on}`}
          onClick={() => act({ type: "setFloor", seat: hasFloor ? null : n })}
        >
          {t.floor}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1" role="group" aria-label={`${t.foulAdd} / ${t.foulRemove}`}>
          <button
            type="button"
            aria-label={`${t.foulRemove} (${n})`}
            disabled={seat.fouls === 0}
            className={`${btn} ${on} w-9`}
            onClick={() => act({ type: "foul", seat: n, delta: -1 })}
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm tabular-nums">F{seat.fouls}</span>
          <button
            type="button"
            aria-label={`${t.foulAdd} (${n})`}
            disabled={seat.fouls >= 4}
            className={`${btn} ${on} w-9`}
            onClick={() => act({ type: "foul", seat: n, delta: 1 })}
          >
            +
          </button>
        </span>

        {seat.alive ? (
          <ConfirmButton
            question={fmt(t.confirmKill, { n })}
            confirmLabel={t.confirm}
            cancelLabel={t.cancel}
            className={`${btn} border-oxblood text-[var(--text)] hover:bg-oxblood hover:text-card`}
            onConfirm={() => act({ type: "kill", seat: n })}
          >
            {t.kill}
          </ConfirmButton>
        ) : (
          <button type="button" className={`${btn} ${on}`} onClick={() => act({ type: "revive", seat: n })}>
            {t.revive}
          </button>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--text-muted)] select-none">{t.more}</summary>
        <div className="mt-1.5 flex flex-col gap-1.5">
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (moveTo) act({ type: "moveSeat", from: n, to: Number(moveTo) });
              setMoveTo("");
            }}
          >
            <label className="sr-only" htmlFor={`move-${n}`}>
              {t.moveTo}
            </label>
            <select
              id={`move-${n}`}
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className="min-h-9 rounded border border-[var(--line)] bg-[var(--surface-raised)] px-2"
            >
              <option value="">{t.moveTo}</option>
              {Array.from({ length: 11 }, (_, i) => i + 1)
                .filter((s) => s !== n)
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                    {freeSeats.includes(s) ? "" : " ⇄"}
                  </option>
                ))}
            </select>
            <button type="submit" disabled={!moveTo} className={`${btn} ${on}`}>
              {t.move}
            </button>
          </form>
          <ConfirmButton
            question={fmt(t.confirmKick, { n })}
            confirmLabel={t.confirm}
            cancelLabel={t.cancel}
            className={`${btn} ${on} self-start`}
            onConfirm={() => act({ type: "kick", seat: n })}
          >
            {t.kick}
          </ConfirmButton>
        </div>
      </details>
    </div>
  );
}
