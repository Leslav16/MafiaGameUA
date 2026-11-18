"use client";

import { useState } from "react";
import type { HostAction, Phase, SeatView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import { btn, danger, plain, primary, type HostDict, type RoleNames } from "./HostPanel";

/** Everything the host can do to one player, shown in the panel after clicking their tile. */
export function SelectedPlayer({
  seat,
  phase,
  floorSeat,
  freeSeats,
  act,
  onClose,
  t,
  roles,
}: {
  seat: SeatView;
  phase: Phase;
  floorSeat: number | null;
  freeSeats: number[];
  act: (a: HostAction) => void;
  onClose: () => void;
  t: HostDict;
  roles: RoleNames;
}) {
  const [moveTo, setMoveTo] = useState("");
  const n = seat.seat;
  const hasFloor = floorSeat === n;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-xl font-medium">
            {n} · {seat.name}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {seat.role ? `${roles[seat.role]} · ` : ""}
            {seat.alive ? t.alive : t.dead}
          </div>
        </div>
        <button type="button" className="min-h-9 rounded px-2 text-sm underline underline-offset-4" onClick={onClose}>
          {t.deselect}
        </button>
      </div>

      {/* Camera, mic, floor */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={!seat.hostCamOff}
          aria-label={fmt(seat.hostCamOff ? t.camOnLabel : t.camOffLabel, { n })}
          className={`${btn} ${seat.hostCamOff ? danger : plain} text-sm`}
          onClick={() => act({ type: "setCam", seat: n, on: seat.hostCamOff })}
        >
          {t.cam} {seat.hostCamOff ? "✕" : "✓"}
        </button>
        <button
          type="button"
          aria-pressed={!seat.hostMicOff}
          aria-label={fmt(seat.hostMicOff ? t.micOnLabel : t.micOffLabel, { n })}
          className={`${btn} ${seat.hostMicOff ? danger : plain} text-sm`}
          onClick={() => act({ type: "setMic", seat: n, on: seat.hostMicOff })}
        >
          {t.mic} {seat.hostMicOff ? "✕" : "✓"}
        </button>
        <button
          type="button"
          aria-pressed={hasFloor}
          aria-label={fmt(t.floorLabel, { n })}
          disabled={!seat.alive || phase === "night" || phase === "ended"}
          className={`${btn} ${hasFloor ? primary : plain} text-sm`}
          onClick={() => act({ type: "setFloor", seat: hasFloor ? null : n })}
        >
          {hasFloor ? t.takeFloor : t.giveFloor}
        </button>
      </div>

      {/* Fouls and kill */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{t.fouls}</span>
        <button
          type="button"
          aria-label={`${t.foulRemove} (${n})`}
          disabled={seat.fouls === 0}
          className={`${btn} ${plain} w-10`}
          onClick={() => act({ type: "foul", seat: n, delta: -1 })}
        >
          −
        </button>
        <span className="min-w-6 text-center font-display text-xl tabular-nums">{seat.fouls}</span>
        <button
          type="button"
          aria-label={`${t.foulAdd} (${n})`}
          disabled={seat.fouls >= 4}
          className={`${btn} ${plain} w-10`}
          onClick={() => act({ type: "foul", seat: n, delta: 1 })}
        >
          +
        </button>
        <span className="flex-1" />
        {seat.alive ? (
          <ConfirmButton
            question={fmt(t.confirmKill, { n })}
            confirmLabel={t.confirm}
            cancelLabel={t.cancel}
            className={`${btn} ${danger}`}
            onConfirm={() => act({ type: "kill", seat: n })}
          >
            {t.kill}
          </ConfirmButton>
        ) : (
          <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "revive", seat: n })}>
            {t.revive}
          </button>
        )}
      </div>

      {/* Seat changes */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (moveTo) act({ type: "moveSeat", from: n, to: Number(moveTo) });
            setMoveTo("");
          }}
        >
          <label className="sr-only" htmlFor="host-move-to">
            {t.moveTo}
          </label>
          <select
            id="host-move-to"
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
            className="min-h-9 rounded border border-[var(--line)] bg-[var(--surface-raised)] px-2 text-sm"
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
          <button type="submit" disabled={!moveTo} className={`${btn} ${plain} min-h-9 text-sm`}>
            {t.move}
          </button>
        </form>
        <ConfirmButton
          question={fmt(t.confirmKick, { n })}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          className={`${btn} ${plain} min-h-9 text-sm`}
          onConfirm={() => {
            act({ type: "kick", seat: n });
            onClose();
          }}
        >
          {t.kick}
        </ConfirmButton>
      </div>
    </div>
  );
}
