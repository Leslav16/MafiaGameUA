"use client";

import { useState, type ReactNode } from "react";
import type { HostAction, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";

export type HostDict = typeof import("../../app/[lang]/dictionaries/en.json")["hostPanel"];

const btn =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-3 font-medium transition-colors disabled:opacity-40";
const plain = "border-[var(--line)] bg-[var(--surface-raised)] hover:border-lamp";
const primary = "border-lamp bg-lamp text-ink hover:brightness-105";

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col gap-2 border-t border-[var(--line)] pt-3">
      <h3 className="font-display text-lg font-medium tracking-wide">{title}</h3>
      {children}
      {hint && <p className="text-sm text-[var(--text-muted)]">{hint}</p>}
    </section>
  );
}

/**
 * The host's table-wide controls: day and night, everyone's mics, the speech
 * timer, dealing roles, and ending the game. Per-player controls are on each
 * seat (HostSeatControls).
 */
export function HostPanel({
  view,
  act,
  timerText,
  timerRunning,
  t,
}: {
  view: RoomView;
  act: (a: HostAction) => void;
  timerText: string;
  timerRunning: boolean;
  t: HostDict;
}) {
  const players = view.seats.filter((s) => s.name).length;
  const [mafia, setMafia] = useState(3);
  const [sheriff, setSheriff] = useState(true);
  const [seconds, setSeconds] = useState(String(Math.round(view.timer.durationMs / 1000)));
  const ended = view.phase === "ended";
  const maxMafia = Math.max(1, Math.ceil(players / 2) - 1);
  const mafiaShown = Math.min(mafia, maxMafia);
  const civ = Math.max(0, players - mafiaShown - (sheriff ? 1 : 0));

  return (
    <aside aria-label={t.title} className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)]/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-medium tracking-wide">{t.title}</h2>
        <span className="text-sm text-[var(--text-muted)]">{fmt(t.players, { n: players })}</span>
      </div>

      <Section title={t.phase} hint={t.nightHint}>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.phase}>
          <button
            type="button"
            aria-pressed={view.phase === "day"}
            disabled={ended}
            className={`${btn} ${view.phase === "day" ? primary : plain}`}
            onClick={() => act({ type: "setPhase", phase: "day" })}
          >
            ☀ {t.day}
          </button>
          <button
            type="button"
            aria-pressed={view.phase === "night"}
            disabled={ended}
            className={`${btn} ${view.phase === "night" ? "border-ink bg-ink text-card" : plain}`}
            onClick={() => act({ type: "setPhase", phase: "night" })}
          >
            ☾ {t.night}
          </button>
        </div>
      </Section>

      <Section title={t.mics} hint={t.floorHint}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "muteAll" })}>
            {t.muteAll}
          </button>
          <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "unmuteAll" })}>
            {t.unmuteAll}
          </button>
          {view.floorSeat !== null && (
            <button type="button" className={`${btn} ${primary}`} onClick={() => act({ type: "setFloor", seat: null })}>
              {t.clearFloor} ({view.floorSeat})
            </button>
          )}
        </div>
      </Section>

      <Section title={t.timer}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-20 font-display text-3xl font-medium tabular-nums" aria-live="off">
            {timerText}
          </span>
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
      </Section>

      <Section title={t.roles}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            {t.mafiaCount}
            <input
              type="number"
              min={1}
              max={maxMafia}
              value={mafiaShown}
              onChange={(e) => setMafia(Number(e.target.value) || 1)}
              className="min-h-9 w-16 rounded border border-[var(--line)] bg-[var(--surface)] px-2 tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sheriff} onChange={(e) => setSheriff(e.target.checked)} className="h-4 w-4" />
            {t.withSheriff}
          </label>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {fmt(t.dealHint, { players, mafia: mafiaShown, sheriff: sheriff ? t.sheriffOne : t.sheriffNone, civ })}
        </p>
        {view.rolesDealt ? (
          <ConfirmButton
            question={t.confirmRedeal}
            confirmLabel={t.confirm}
            cancelLabel={t.cancel}
            disabled={ended || players < 3}
            className={`${btn} ${plain} self-start`}
            onConfirm={() => act({ type: "dealRoles", mafia: mafiaShown, sheriff })}
          >
            {t.redeal}
          </ConfirmButton>
        ) : (
          <button
            type="button"
            disabled={ended || players < 3}
            className={`${btn} ${primary} self-start`}
            onClick={() => act({ type: "dealRoles", mafia: mafiaShown, sheriff })}
          >
            {t.deal}
          </button>
        )}
      </Section>

      <Section title={ended ? t.newGame : t.end} hint={ended ? t.newGameHint : undefined}>
        {ended ? (
          <button type="button" className={`${btn} ${primary} self-start`} onClick={() => act({ type: "newGame" })}>
            {t.newGame}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ConfirmButton
              question={`${t.townWins}?`}
              confirmLabel={t.confirm}
              cancelLabel={t.cancel}
              className={`${btn} ${plain}`}
              onConfirm={() => act({ type: "endGame", winner: "town" })}
            >
              {t.townWins}
            </ConfirmButton>
            <ConfirmButton
              question={`${t.mafiaWins}?`}
              confirmLabel={t.confirm}
              cancelLabel={t.cancel}
              className={`${btn} ${plain}`}
              onConfirm={() => act({ type: "endGame", winner: "mafia" })}
            >
              {t.mafiaWins}
            </ConfirmButton>
          </div>
        )}
      </Section>
    </aside>
  );
}
