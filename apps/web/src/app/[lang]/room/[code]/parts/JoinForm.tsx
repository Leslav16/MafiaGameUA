"use client";

import { useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { RoomApi } from "@/lib/room/useRoom";
import { CardFan } from "@/components/cards/CardFan";
import { LockIcon } from "@/components/room/icons";

const input =
  "phase-transition min-h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-lg text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-lamp)] focus:outline-none";
const link =
  "inline-flex min-h-11 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]";
const primary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50";

type Mode = "player" | "watch" | "host";

/**
 * Nickname for players (the server gives a seat; "4. Name" asks for seat 4), a nickname
 * for spectators (no seat, any time, even mid-game), or the password for the host.
 * A link ending in ?watch opens straight in spectator mode (the home page list uses it).
 */
export function JoinForm({ room, t, ui }: { room: RoomApi; t: Dictionary["roomUi"]; ui: Dictionary["ui"] }) {
  const [mode, setMode] = useState<Mode>(() =>
    room.gameOn || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("watch")) ? "watch" : "player",
  );
  /** A player whose connection dropped asks the host for their seat back (game in progress). */
  const [returnTo, setReturnTo] = useState<number | null>(null);
  const asHost = mode === "host";
  const watching = mode === "watch";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTo = (m: Mode) => {
    setMode(m);
    setReturnTo(null);
    setError(null);
  };
  const errorText = (code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.server_error;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = asHost
      ? await room.joinAsHost(password)
      : watching
        ? await room.joinAsSpectator(name, roomPassword, returnTo ?? undefined)
        : await room.joinAsPlayer(name, null, roomPassword);
    setBusy(false);
    if (err) {
      setError(errorText(err));
      // The game has started or every seat is taken: offer to watch with the same name.
      if (err === "game_in_progress" || err === "room_full") setMode("watch");
    }
  }

  return (
    <div className="grid w-full items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="flex w-full max-w-lg flex-col gap-6">
        <h1 className="headline text-5xl tracking-tight">
          {asHost ? t.hostJoin : watching ? t.watchTitle : t.joinTitle}
        </h1>
        {watching && <p className="text-lg text-[var(--text-muted)]">{t.watchHint}</p>}

        {watching && room.gameOn && room.returnable.length > 0 && (
          <fieldset className="return-pick flex flex-col gap-2 rounded-xl border border-[var(--line)] p-4">
            <legend className="px-1 font-display text-xl tracking-wide">{t.returnTitle}</legend>
            <p className="text-base text-[var(--text-muted)]">{t.returnHint}</p>
            <div className="flex flex-wrap gap-2">
              {room.returnable.map((r) => (
                <button
                  key={r.seat}
                  type="button"
                  aria-pressed={returnTo === r.seat}
                  onClick={() => {
                    const on = returnTo !== r.seat;
                    setReturnTo(on ? r.seat : null);
                    if (on && !name.trim()) setName(r.name);
                  }}
                  className="btn-feel inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 aria-pressed:border-[var(--color-lamp)] aria-pressed:bg-[var(--color-lamp)] aria-pressed:text-[var(--color-ink)]"
                >
                  <span className="font-display tabular-nums">{r.seat}</span>
                  <span className="max-w-40 truncate">{r.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {asHost ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-xl tracking-wide">{t.password}</span>
            <input
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-xl tracking-wide">{t.nickname}</span>
            <input
              className={input}
              value={name}
              maxLength={24}
              placeholder={ui.join.nicknamePlaceholder}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
              required
              autoFocus
            />
            {!watching && (
              <>
                <span className="text-base text-[var(--text-muted)]">{ui.join.nicknameHint}</span>
                <span className="text-base text-[var(--text-muted)]">{ui.join.seatTip}</span>
              </>
            )}
          </label>
        )}

        {!asHost && room.locked && (
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-display text-xl tracking-wide">
              <LockIcon className="size-5" />
              {t.roomPasswordLabel}
            </span>
            <input
              className={input}
              value={roomPassword}
              maxLength={32}
              onChange={(e) => setRoomPassword(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-[var(--urgent)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="submit" disabled={busy || (!asHost && !name.trim())} className={primary}>
            {busy ? t.joining : asHost ? t.hostJoin : watching ? (returnTo ? t.returnAskButton : t.watch) : t.join}
          </button>
          {mode !== "player" && (
            <button type="button" className={link} onClick={() => switchTo("player")}>
              {t.joinAsPlayer}
            </button>
          )}
          {mode !== "watch" && (
            <button type="button" className={link} onClick={() => switchTo("watch")}>
              {t.watch}
            </button>
          )}
          {mode !== "host" && (
            <button type="button" className={link} onClick={() => switchTo("host")}>
              {t.imHost}
            </button>
          )}
        </div>
      </form>

      <div className="hidden justify-center lg:flex">
        <CardFan
          roles={asHost ? ["mafia", "don", "sheriff"] : ["civilian", "sheriff", "doctor"]}
          names={{ don: ui.role.don, mafia: ui.role.mafia, sheriff: ui.role.sheriff, doctor: ui.role.doctor, civilian: ui.role.civilian }}
          className="w-full max-w-md"
        />
      </div>
    </div>
  );
}
