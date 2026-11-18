"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import type { RoomApi } from "@/lib/room/useRoom";
import { fmt } from "@/lib/room/format";

const input =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-[var(--text)]";
const primary =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] disabled:opacity-50";

/** Nickname + free seat for players, or the password for the host. Plain; restyled by the design work. */
export function JoinForm({ room, t }: { room: RoomApi; t: Dictionary["roomUi"] }) {
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

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <h1 className="font-display text-4xl font-medium tracking-tight">{asHost ? t.hostJoin : t.joinTitle}</h1>

      {asHost ? (
        <label className="flex flex-col gap-1.5">
          {t.password}
          <input
            type="password"
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            {t.nickname}
            <input
              className={input}
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
              required
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5">{t.pickSeat}</legend>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => {
                const isFree = free.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!isFree}
                    aria-pressed={seat === n}
                    aria-label={fmt(t.seat, { n })}
                    onClick={() => setSeat(n)}
                    className={`min-h-12 rounded-md border font-display text-xl font-semibold ${
                      seat === n
                        ? "border-lamp bg-lamp text-ink"
                        : "border-[var(--line)] bg-[var(--surface-raised)] disabled:opacity-30"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}

      {error && (
        <p role="alert" className="text-[#e05a6a]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy || (!asHost && (!seat || !name.trim()))} className={primary}>
          {busy ? t.joining : asHost ? t.hostJoin : t.join}
        </button>
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => {
            setAsHost(!asHost);
            setError(null);
          }}
        >
          {asHost ? t.back : t.imHost}
        </button>
      </div>
    </form>
  );
}
