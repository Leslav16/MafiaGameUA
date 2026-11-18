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
import { RoomSettings } from "./RoomSettings";
import { SelectedPlayer } from "./SelectedPlayer";
import { btn, plain, type HostDict, type RoleNames } from "./ui";
import { PanelIcon } from "../room/icons";

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
      className="flex w-full flex-col gap-3 lg:max-h-[calc(100dvh-2rem)] lg:w-[22rem] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight font-medium tracking-wide whitespace-nowrap">{t.title}</h2>
          <p className="text-sm text-[var(--text-muted)] tabular-nums">{fmt(t.players, { n: players })}</p>
        </div>
        {onHide && (
          <button
            type="button"
            className="btn-feel inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 text-sm hover:border-lamp"
            onClick={onHide}
          >
            <PanelIcon className="size-4" />
            {t.hide}
          </button>
        )}
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
      <Fold title={t.roomSettings}>
        <RoomSettings view={view} act={act} t={t} />
      </Fold>
    </aside>
  );
}
