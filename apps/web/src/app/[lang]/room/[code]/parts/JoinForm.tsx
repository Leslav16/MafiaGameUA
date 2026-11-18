"use client";

import { useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { RoomApi } from "@/lib/room/useRoom";
import { Figure } from "@/components/figures/Figure";

const input =
  "phase-transition min-h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-lg text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-lamp)] focus:outline-none";
const primary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50";

/** Nickname for players (the server gives a seat; "4. Name" asks for seat 4), or the password for the host. */
export function JoinForm({ room, t, ui }: { room: RoomApi; t: Dictionary["roomUi"]; ui: Dictionary["ui"] }) {
  const [asHost, setAsHost] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = (code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.server_error;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = asHost ? await room.joinAsHost(password) : await room.joinAsPlayer(name);
    setBusy(false);
    if (err) {
      setError(errorText(err));
    }
  }

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
            <span className="text-base text-[var(--text-muted)]">{ui.join.seatTip}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-[var(--urgent)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="submit" disabled={busy || (!asHost && !name.trim())} className={primary}>
            {busy ? t.joining : asHost ? t.hostJoin : t.join}
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

      <div aria-hidden className="relative hidden items-end justify-center gap-1 lg:flex">
        <div className="absolute inset-x-6 top-1/3 bottom-0 rounded-[50%] bg-[radial-gradient(closest-side,rgb(200_137_63/0.3),transparent)]" />
        {(asHost ? (["don"] as const) : (["civilian", "sheriff", "doctor"] as const)).map((r, i) => (
          <Figure key={r} role={r} delay={i * 0.6} className={`relative ${asHost ? "w-60" : "w-40"}`} />
        ))}
      </div>
    </div>
  );
}
