"use client";

import type { ReactNode } from "react";
import type { HostAction, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import { GameLog } from "./GameLog";
import { downloadGameRecord, gameRecordText } from "./gameRecord";
import { LocationPicker } from "./LocationPicker";
import { locationName, type Location } from "../locations";
import { NowCard } from "./NowCard";
import { SelectedPlayer } from "./SelectedPlayer";
import { btn, plain, type HostDict, type RoleNames } from "./ui";

export type { HostDict, RoleNames } from "./ui";

function Fold({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/60 p-3">
      <summary className="cursor-pointer font-display text-sm font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase select-none">
        {title}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/**
 * The host's control panel. One "Now" block leads the game step by step
 * (start, speeches with nominations, defence, voting, last words, the night
 * checklist, the morning). Below it: the player picked on the grid, the game
 * log, and ending the game by hand.
 */
export function HostPanel({
  view,
  act,
  timerText,
  timerRunning,
  selectedSeat,
  onDeselect,
  onHide,
  t,
  roles,
  locations,
}: {
  view: RoomView;
  act: (a: HostAction) => void;
  timerText: string;
  timerRunning: boolean;
  selectedSeat: number | null;
  onDeselect: () => void;
  /** Hides the panel so the table shows only cameras. */
  onHide?: () => void;
  t: HostDict;
  roles: RoleNames;
  /** Ready places for the introduction round. */
  locations: Location[];
}) {
  const players = view.seats.filter((s) => s.name).length;
  const selected = selectedSeat ? view.seats[selectedSeat - 1] : null;
  const inGame = view.flow.stage !== "lobby" && view.flow.stage !== "ended";

  return (
    // Fixed width, and on wide screens a fixed height that scrolls inside itself,
    // so nothing in the panel changes the page's size or shifts the video tiles.
    <aside
      aria-label={t.title}
      className="flex w-full flex-col gap-3 lg:max-h-[calc(100dvh-2rem)] lg:w-[22rem] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-gutter:stable]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-medium tracking-wide">{t.title}</h2>
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-[var(--text-muted)]">{fmt(t.players, { n: players })}</span>
          {onHide && (
            <button type="button" className="text-sm underline underline-offset-4" onClick={onHide}>
              {t.hide}
            </button>
          )}
        </div>
      </div>

      <NowCard view={view} act={act} timerText={timerText} timerRunning={timerRunning} t={t} />

      {view.flow.stage === "lobby" && <LocationPicker value={view.location} locations={locations} act={act} t={t} />}

      <Fold title={t.player} open={!!selected?.name}>
        {selected?.name ? (
          <SelectedPlayer seat={selected} inGame={inGame} act={act} onClose={onDeselect} t={t} roles={roles} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t.pickPlayer}</p>
        )}
      </Fold>

      {view.rolesDealt && (
        <Fold title={t.log}>
          <GameLog log={view.flow.log} t={t} />
          <button
            type="button"
            className={`${btn} ${plain} mt-3 w-full text-sm`}
            onClick={() => {
              const when = new Date();
              downloadGameRecord(gameRecordText(view, t, roles, locationName(view.location, locations), when), view.code, when);
            }}
          >
            ⤓ {t.recordDownload}
          </button>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t.recordHint}</p>
        </Fold>
      )}

      {inGame && (
        <Fold title={t.endByHand}>
          <div className="flex flex-wrap gap-2">
            {(["town", "mafia"] as const).map((w) => (
              <ConfirmButton
                key={w}
                question={`${t.winner[w]}?`}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel}
                className={`${btn} ${plain} text-sm`}
                onConfirm={() => act({ type: "endGame", winner: w })}
              >
                {w === "town" ? t.townWins : t.mafiaWins}
              </ConfirmButton>
            ))}
          </div>
        </Fold>
      )}
      <label className="flex cursor-pointer items-start gap-2 px-1 text-sm">
        <input
          type="checkbox"
          checked={view.isPublic}
          onChange={(e) => act({ type: "setPublic", on: e.target.checked })}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-lamp)]"
        />
        <span>
          {t.publicTable}
          <span className="block text-xs text-[var(--text-muted)]">{t.publicTableHint}</span>
        </span>
      </label>
    </aside>
  );
}
