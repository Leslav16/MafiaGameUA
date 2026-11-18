"use client";

import type { HostAction, SeatView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import { btn, danger, plain, type HostDict, type RoleNames } from "./ui";

/** Everything the host can do to one player, after clicking their tile. */
export function SelectedPlayer({
  seat,
  inGame,
  act,
  onClose,
  t,
  roles,
}: {
  seat: SeatView;
  inGame: boolean;
  act: (a: HostAction) => void;
  onClose: () => void;
  t: HostDict;
  roles: RoleNames;
}) {
  const n = seat.seat;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-xl font-medium">
            {n} · {seat.name}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {seat.role ? `${roles[seat.role]} · ` : ""}
            {seat.out ? t.out[seat.out] : t.alive}
          </div>
        </div>
        <button type="button" className="min-h-9 rounded px-2 text-sm underline underline-offset-4" onClick={onClose}>
          {t.close}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
      </div>

      <div className="flex items-center gap-2">
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
      </div>
      {seat.fouls >= 4 && seat.alive && inGame && <p className="text-sm font-medium">{t.fourFouls}</p>}

      <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
        {inGame &&
          (seat.alive ? (
            <ConfirmButton
              question={fmt(t.confirmRemove, { n })}
              confirmLabel={t.confirm}
              cancelLabel={t.cancel}
              className={`${btn} ${danger} text-sm`}
              onConfirm={() => act({ type: "kill", seat: n })}
            >
              {t.removeFromGame}
            </ConfirmButton>
          ) : (
            <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "revive", seat: n })}>
              {t.returnToGame}
            </button>
          ))}
        <ConfirmButton
          question={fmt(t.confirmKick, { n })}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          className={`${btn} ${plain} text-sm`}
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
