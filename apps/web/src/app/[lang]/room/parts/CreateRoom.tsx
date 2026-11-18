"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import type { Dictionary } from "../../dictionaries";
import { gameServerUrl, saveKey } from "@/lib/room/endpoints";

const input =
  "min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-[var(--text)]";

/** The host names themselves and sets a password; the game server returns the room code. Plain; restyled by the design work. */
export function CreateRoom({ lang, t }: { lang: string; t: Dictionary["roomUi"] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const socket = io(gameServerUrl(), { transports: ["websocket"], reconnection: false, timeout: 5000 });
    const done = (err: string | null) => {
      socket.disconnect();
      setBusy(false);
      if (err) setError((t.errors as Record<string, string>)[err] ?? t.errors.server_error);
    };
    socket.on("connect_error", () => done("offline"));
    socket.emit("room:create", { name, password }, (r: { ok: boolean; code?: string; key?: string; error?: string }) => {
      if (!r.ok || !r.code || !r.key) return done(r.error ?? "server_error");
      saveKey(r.code, r.key);
      done(null);
      router.push(`/${lang}/room/${r.code}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-lg flex-col gap-5">
      <h1 className="font-display text-5xl font-medium tracking-tight">{t.createTitle}</h1>
      <p className="text-lg text-[var(--text-muted)]">{t.createLede}</p>
      <label className="flex flex-col gap-1.5">
        {t.hostName}
        <input className={input} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1.5">
        {t.password}
        <input
          type="password"
          className={input}
          value={password}
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <span className="text-sm text-[var(--text-muted)]">{t.passwordHint}</span>
      </label>
      {error && (
        <p role="alert" className="text-[#e05a6a]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 items-center justify-center self-start rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] disabled:opacity-50"
      >
        {busy ? t.creating : t.create}
      </button>
    </form>
  );
}
