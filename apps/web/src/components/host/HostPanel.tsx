"use client";

import { useState, type ReactNode } from "react";
import type { HostAction, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import { SelectedPlayer } from "./SelectedPlayer";

export type HostDict = typeof import("../../app/[lang]/dictionaries/en.json")["hostPanel"];
export type RoleNames = typeof import("../../app/[lang]/dictionaries/en.json")["roomUi"]["roles"];

export const btn =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-3 font-medium transition-colors disabled:opacity-40";
export const plain = "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp";
export const primary = "border-lamp bg-lamp text-ink hover:brightness-105";
export const danger = "border-oxblood bg-oxblood text-card hover:brightness-110";

/** One labelled group of controls. Groups are ordered by how often the host reaches for them. */
function Group({ title, children, hint, minHeight }: { title: string; children: ReactNode; hint?: string; minHeight?: boolean }) {
  return (
    <section
      className={`flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]/60 p-3 ${minHeight ? "min-h-[17rem]" : ""}`}
    >
      <h3 className="font-display text-sm font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase">{title}</h3>
      {children}
      {hint && <p className="text-sm text-[var(--text-muted)]">{hint}</p>}
    </section>
  );
}

/**
 * The host's control panel, grouped by purpose:
 *   1. Game: start the table, day and night, end the game.
 *   2. Speech: who has the floor, and the timer.
 *   3. Everyone's mics and cameras.
 *   4. Selected player: everything for the player whose tile the host clicked.
 */
export function HostPanel({
  view,
  act,
  timerText,
  timerRunning,
  selectedSeat,
  onDeselect,
  t,
  roles,
}: {
  view: RoomView;
  act: (a: HostAction) => void;
  timerText: string;
  timerRunning: boolean;
  selectedSeat: number | null;
  onDeselect: () => void;
  t: HostDict;
  roles: RoleNames;
}) {
  const players = view.seats.filter((s) => s.name).length;
  const [seconds, setSeconds] = useState(String(Math.round(view.timer.durationMs / 1000)));
  const { phase } = view;
  const inGame = phase === "day" || phase === "night";
  const selected = selectedSeat ? view.seats[selectedSeat - 1] : null;

  return (
    // Fixed width, and on wide screens a fixed height that scrolls inside itself, so
    // picking a player or opening a confirm never changes the page's size and the
    // video tiles never shift.
    <aside
      aria-label={t.title}
      className="flex w-full flex-col gap-3 lg:max-h-[calc(100dvh-2rem)] lg:w-[22rem] lg:overflow-y-auto lg:[scrollbar-gutter:stable] lg:pr-1"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-medium tracking-wide">{t.title}</h2>
        <span className="text-sm text-[var(--text-muted)]">{fmt(t.players, { n: players })}</span>
      </div>

      {/* 1. Game */}
      <Group title={t.groupGame} hint={phase === "lobby" ? t.startHint : inGame ? t.nightHint : t.newGameHint}>
        {phase === "lobby" && (
          <button
            type="button"
            disabled={players < 3}
            className={`${btn} ${primary} min-h-12 text-lg`}
            onClick={() => act({ type: "startGame" })}
          >
            {t.startGame}
          </button>
        )}
        {inGame && (
          <>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.phase}>
              <button
                type="button"
                aria-pressed={phase === "day"}
                className={`${btn} ${phase === "day" ? primary : plain}`}
                onClick={() => act({ type: "setPhase", phase: "day" })}
              >
                ☀ {t.day}
              </button>
              <button
                type="button"
                aria-pressed={phase === "night"}
                className={`${btn} ${phase === "night" ? "border-ink bg-ink text-card" : plain}`}
                onClick={() => act({ type: "setPhase", phase: "night" })}
              >
                ☾ {t.night}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{t.end}:</span>
              <ConfirmButton
                question={`${t.townWins}?`}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel}
                className={`${btn} ${plain} min-h-9 text-sm`}
                onConfirm={() => act({ type: "endGame", winner: "town" })}
              >
                {t.townWins}
              </ConfirmButton>
              <ConfirmButton
                question={`${t.mafiaWins}?`}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel}
                className={`${btn} ${plain} min-h-9 text-sm`}
                onConfirm={() => act({ type: "endGame", winner: "mafia" })}
              >
                {t.mafiaWins}
              </ConfirmButton>
            </div>
          </>
        )}
        {phase === "ended" && (
          <button type="button" className={`${btn} ${primary}`} onClick={() => act({ type: "newGame" })}>
            {t.newGame}
          </button>
        )}
      </Group>

      {/* 2. Speech */}
      <Group title={t.groupSpeech}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">
            {view.floorSeat !== null ? fmt(t.hasFloor, { n: view.floorSeat }) : t.noFloor}
          </span>
          {view.floorSeat !== null && (
            <button type="button" className={`${btn} ${primary} min-h-9 text-sm`} onClick={() => act({ type: "setFloor", seat: null })}>
              {t.clearFloor}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-20 font-display text-3xl font-medium tabular-nums">{timerText}</span>
          {timerRunning ? (
            <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "timer", op: "pause" })}>
              {t.pause}
            </button>
          ) : (
            <button type="button" className={`${btn} ${primary}`} onClick={() => act({ type: "timer", op: "start" })}>
              {t.start}
            </button>
          )}
          <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "timer", op: "reset" })}>
            {t.reset}
          </button>
        </div>
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const s = Number(seconds);
            if (Number.isFinite(s)) act({ type: "timer", op: "reset", seconds: s });
          }}
        >
          <input
            type="number"
            min={5}
            max={600}
            step={5}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            aria-label={t.seconds}
            className="min-h-9 w-20 rounded border border-[var(--line)] bg-[var(--surface)] px-2 tabular-nums"
          />
          <span>{t.seconds}</span>
          <button type="submit" className={`${btn} ${plain} min-h-9 text-sm`}>
            {t.reset}
          </button>
        </form>
        <p className="text-sm text-[var(--text-muted)]">{t.floorHint}</p>
      </Group>

      {/* 3. Everyone's mics and cameras */}
      <Group title={t.groupAll}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "muteAll" })}>
            {t.muteAll}
          </button>
          <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "unmuteAll" })}>
            {t.unmuteAll}
          </button>
          <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "camsOffAll" })}>
            {t.camsOffAll}
          </button>
          <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "camsOnAll" })}>
            {t.camsOnAll}
          </button>
        </div>
      </Group>

      {/* 4. Selected player: same height whether or not someone is picked */}
      <Group title={t.groupPlayer} minHeight>
        {selected?.name ? (
          <SelectedPlayer
            seat={selected}
            phase={phase}
            floorSeat={view.floorSeat}
            freeSeats={view.seats.filter((s) => !s.name).map((s) => s.seat)}
            act={act}
            onClose={onDeselect}
            t={t}
            roles={roles}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t.pickPlayer}</p>
        )}
      </Group>
    </aside>
  );
}
