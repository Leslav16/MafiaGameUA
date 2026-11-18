"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon, CopyIcon } from "../room/icons";
import type { RoomLabels } from "../room/types";

const field =
  "mt-2 block min-h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-lg text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-lamp)] focus:outline-none phase-transition";
const primary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The host's "new room" form. Calls `onCreate` with the room name and host
 * password; the page creates the room and then shows <ShareLink />.
 */
export function CreateRoomForm({
  labels,
  onCreate,
  busy = false,
}: {
  labels: RoomLabels;
  onCreate: (room: { name: string; password: string }) => void;
  busy?: boolean;
}) {
  const t = labels.create;
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !password) return;
    onCreate({ name: name.trim(), password });
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <label className="block">
        <span className="font-display text-xl tracking-wide">{t.name}</span>
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          maxLength={60}
          required
          autoFocus
        />
      </label>
      <label className="block">
        <span className="font-display text-xl tracking-wide">{t.password}</span>
        <input
          className={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={4}
          required
          aria-describedby="host-password-hint"
        />
        <span id="host-password-hint" className="mt-1.5 block text-base text-[var(--text-muted)] phase-transition">
          {t.passwordHint}
        </span>
      </label>
      <div>
        <button type="submit" disabled={busy} className={primary}>
          {t.submit}
        </button>
      </div>
    </form>
  );
}

/** The room link with a big Copy button, shown once the room exists. */
export function ShareLink({
  url,
  labels,
  enterHref,
}: {
  url: string;
  labels: RoomLabels;
  /** Where "Enter as host" goes. */
  enterHref?: string;
}) {
  const t = labels.create;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers or plain http on a LAN address: select the text instead.
      const input = document.getElementById("share-url") as HTMLInputElement | null;
      input?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-5">
      <p className="flex items-center gap-2 font-display text-2xl tracking-wide">
        <CheckIcon className="size-7 text-[var(--accent-strong)]" />
        {t.ready}
      </p>
      <div>
        <label htmlFor="share-url" className="text-base text-[var(--text-muted)] phase-transition">
          {t.share}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className={`${field} mt-0 font-mono text-base`}
          />
          <button type="button" onClick={copy} className={`${primary} shrink-0 sm:w-40`}>
            {copied ? <CheckIcon className="size-5" /> : <CopyIcon className="size-5" />}
            <span aria-live="polite">{copied ? t.copied : t.copy}</span>
          </button>
        </div>
      </div>
      {enterHref && (
        <a
          href={enterHref}
          className="inline-flex min-h-12 w-fit items-center underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--accent)]"
        >
          {t.enter} →
        </a>
      )}
    </div>
  );
}
