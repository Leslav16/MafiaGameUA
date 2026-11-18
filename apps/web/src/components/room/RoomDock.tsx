"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { DeviceCheck, type DeviceChoice } from "../lobby/DeviceCheck";
import { Modal } from "../Modal";
import { fill } from "./format";
import { CamIcon, CheckIcon, MicIcon } from "./icons";
import { RoleCard } from "./RoleCard";
import { EffectPicker, GamePrefs, SetCard } from "./SettingsParts";
import type { Role, RoomLabels } from "./types";

const round =
  "phase-transition inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-3 font-display text-base tracking-wide hover:border-[var(--color-lamp)] disabled:cursor-not-allowed disabled:opacity-45";

/**
 * The strip under the table for the player: role card, own mic/camera
 * switches, and a Settings button that opens camera, mic and nickname in a
 * popup so they don't take room on the game surface.
 */
export function RoomDock({
  labels,
  role,
  micOn,
  camOn,
  micLocked = false,
  camLocked = false,
  onToggleMic,
  onToggleCam,
  nickname,
  onRename,
  ready = true,
  onReadyChange,
  onDevicesChange,
  extra,
  note,
  roleNote,
  seat,
  takenSeats = [],
  onChooseSeat,
  preview,
  effectsSupported = null,
}: {
  labels: RoomLabels;
  role?: Role;
  micOn: boolean;
  camOn: boolean;
  /** The host turned it off: the player can't turn it back on. */
  micLocked?: boolean;
  camLocked?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  nickname: string;
  /** Resolves to an error message, or null when saved. */
  onRename?: (name: string) => Promise<string | null>;
  ready?: boolean;
  onReadyChange?: (ready: boolean) => void;
  onDevicesChange?: (choice: DeviceChoice) => void;
  /** More buttons on the right, e.g. Rules. */
  extra?: ReactNode;
  /** Why the mic or camera is locked, shown next to the switches. */
  note?: string | null;
  /** Extra line on the role card, e.g. the mafia teammates. */
  roleNote?: string;
  /** This player's seat number (players only). */
  seat?: number;
  /** Seats someone else sits in. */
  takenSeats?: number[];
  /** Moves this player to another free seat; resolves to an error message or null. */
  onChooseSeat?: (seat: number) => Promise<string | null>;
  /** Your live camera as the others see it (with the background effect). */
  preview?: ReactNode;
  effectsSupported?: boolean | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="phase-transition flex flex-wrap items-center gap-3 border-t border-[var(--line)] px-3 py-2.5 sm:px-6">
      {role && <RoleCard role={role} labels={labels} note={roleNote} />}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {note && <span className="w-full text-right text-sm text-[var(--text-muted)] sm:w-auto">{note}</span>}
        <button
          type="button"
          onClick={onToggleMic}
          disabled={micLocked}
          aria-pressed={micOn}
          aria-label={`${labels.toggleMic}: ${micOn ? "on" : labels.micOff}`}
          className={`${round} ${micOn ? "" : "border-[var(--urgent)] text-[var(--urgent)]"}`}
        >
          <MicIcon off={!micOn} className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCam}
          disabled={camLocked}
          aria-pressed={camOn}
          aria-label={`${labels.toggleCam}: ${camOn ? "on" : labels.camOff}`}
          className={`${round} ${camOn ? "" : "border-[var(--urgent)] text-[var(--urgent)]"}`}
        >
          <CamIcon off={!camOn} className="size-5" />
        </button>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`${round} px-4`}>
          <GearIcon /> <span className="hidden sm:inline">{labels.settings.open}</span>
        </button>
        {extra}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={labels.settings.title} closeLabel={labels.close} wide>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <SetCard title={labels.prefs.media} icon="◉">
            <div className="grid gap-5">
              <DeviceCheck
                labels={labels}
                ready={ready}
                onReadyChange={onReadyChange ?? (() => {})}
                onDevicesChange={onDevicesChange}
                preview={preview}
                stacked
              />
              <EffectPicker labels={labels} supported={effectsSupported} />
            </div>
          </SetCard>
          <div className="grid gap-4">
          {(onRename || (seat != null && onChooseSeat)) && (
            <SetCard title={labels.prefs.profile} icon="♠">
              <div className="grid gap-5">
                {onRename && <RenameForm labels={labels} nickname={nickname} onRename={onRename} />}
                {seat != null && onChooseSeat && (
                  <SeatChooser labels={labels} seat={seat} taken={takenSeats} onChoose={onChooseSeat} />
                )}
              </div>
            </SetCard>
          )}
          <SetCard title={labels.prefs.game} icon="♣">
            <GamePrefs labels={labels} />
          </SetCard>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SeatChooser({
  labels,
  seat,
  taken,
  onChoose,
}: {
  labels: RoomLabels;
  seat: number;
  taken: number[];
  onChoose: (seat: number) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(n: number) {
    if (n === seat) return;
    setBusy(n);
    setError(null);
    setError(await onChoose(n));
    setBusy(null);
  }

  return (
    <fieldset>
      <legend className="font-display text-lg tracking-wide">{labels.settings.seat}</legend>
      <p className="text-sm text-[var(--text-muted)]">
        {labels.settings.seatHint} {fill(labels.settings.seatNow, seat)}
      </p>
      <div className="mt-2.5 grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => {
          const mine = n === seat;
          const isTaken = !mine && taken.includes(n);
          return (
            <button
              key={n}
              type="button"
              disabled={isTaken || busy !== null}
              aria-pressed={mine}
              aria-label={`${fill(labels.seat, n)}${isTaken ? `: ${labels.join.taken}` : ""}`}
              onClick={() => choose(n)}
              className={[
                "aspect-square min-h-10 rounded-full border font-display text-lg font-semibold tabular-nums transition-[transform,background-color] duration-150 active:scale-95",
                mine
                  ? "border-[var(--color-ink)] bg-[var(--color-lamp)] text-[var(--color-ink)]"
                  : isTaken
                    ? "cursor-not-allowed border-transparent bg-[var(--color-smoke)]/20 text-[var(--text-muted)] line-through opacity-60"
                    : "border-[var(--line)] bg-[var(--seat-fill)] text-[var(--seat-text)] hover:border-[var(--color-lamp)]",
                busy === n ? "animate-pulse" : "",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-base text-[var(--urgent)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function RenameForm({
  labels,
  nickname,
  onRename,
}: {
  labels: RoomLabels;
  nickname: string;
  onRename: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(nickname);
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v || v === nickname) return;
    setState("saving");
    const err = await onRename(v);
    setState(err ?? "saved");
  }

  const error = state !== "idle" && state !== "saving" && state !== "saved" ? state : null;

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-0 flex-1">
        <span className="font-display text-lg tracking-wide">{labels.settings.nickname}</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setState("idle");
          }}
          maxLength={20}
          autoComplete="nickname"
          aria-invalid={!!error}
          aria-describedby={error ? "rename-error" : undefined}
          className="soft-field phase-transition mt-1.5 block min-h-12 w-full rounded-xl px-4 text-lg text-[var(--text)]"
        />
      </label>
      <button
        type="submit"
        disabled={state === "saving" || !name.trim() || name.trim() === nickname}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 font-display text-lg tracking-wide text-[var(--accent-text)] disabled:opacity-50"
      >
        {state === "saved" ? (
          <>
            <CheckIcon className="size-5" /> {labels.settings.saved}
          </>
        ) : (
          labels.settings.save
        )}
      </button>
      {error && (
        <p id="rename-error" role="alert" className="w-full text-base text-[var(--urgent)]">
          {error}
        </p>
      )}
    </form>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
