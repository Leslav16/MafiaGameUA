"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { RoomApi } from "@/lib/room/useRoom";
import { fmt } from "@/lib/room/format";
import { Figure } from "@/components/figures/Figure";
import { SeatPicker } from "@/components/lobby/JoinForm";

const input =
  "phase-transition min-h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-lg text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-lamp)] focus:outline-none";
const primary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50";

/** Nickname + free seat for players, or the password for the host. Plain; restyled by the design work. */
export function JoinForm({ room, t, ui }: { room: RoomApi; t: Dictionary["roomUi"]; ui: Dictionary["ui"] }) {
  const [asHost, setAsHost] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [seat, setSeat] = useState<number | null>(null);
  const [free, setFree] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { freeSeats } = room;

  useEffect(() => {
    let live = true;
    const load = () => freeSeats().then((s) => live && setFree(s));
    void load();
    const id = setInterval(load, 4000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [freeSeats]);

  const errorText = (code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.server_error;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = asHost ? await room.joinAsHost(password) : await room.joinAsPlayer(name, seat ?? 0);
    setBusy(false);
    if (err) {
      setError(errorText(err));
      if (err === "seat_taken") setSeat(null);
    }
  }

  const taken = Object.fromEntries(
    Array.from({ length: 11 }, (_, k) => k + 1)
      .filter((n) => !free.includes(n))
      .map((n) => [n, ui.join.taken]),
  ) as Record<number, string>;

  return (
    <div className="grid w-full items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="flex w-full max-w-lg flex-col gap-6">
        <h1 className="font-display text-5xl font-medium tracking-tight">{asHost ? t.hostJoin : t.joinTitle}</h1>

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
            <span className="text-base text-[var(--text-muted)]">{ui.join.nicknameHint}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-[var(--urgent)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="submit" disabled={busy || (!asHost && (!seat || !name.trim()))} className={primary}>
            {busy ? t.joining : asHost ? t.hostJoin : seat ? fmt(ui.join.submit, { n: seat }) : ui.join.submitNoSeat}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]"
            onClick={() => {
              setAsHost(!asHost);
              setError(null);
            }}
          >
            {asHost ? t.back : t.imHost}
          </button>
        </div>
      </form>

      {asHost ? (
        <div className="hidden justify-center lg:flex">
          <Figure role="don" className="w-56" />
        </div>
      ) : (
        <SeatPicker labels={ui} taken={taken} selected={seat} onSelect={setSeat} />
      )}
    </div>
  );
}
