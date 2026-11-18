"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Type a room code (or paste the whole link) and go straight to that room. */
export function JoinByCode({
  lang,
  label,
  placeholder,
  submit,
  error,
}: {
  lang: string;
  label: string;
  placeholder: string;
  submit: string;
  error: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);

  function go(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    // Accept "k7m2qx", or ".../room/k7m2qx" from a pasted link
    const code = (raw.match(/room\/([a-z0-9]{4,12})/i)?.[1] ?? raw).toLowerCase();
    if (!/^[a-z0-9]{4,12}$/.test(code)) {
      setBad(true);
      return;
    }
    router.push(`/${lang}/room/${code}`);
  }

  return (
    <form onSubmit={go} className="w-full max-w-sm" noValidate>
      <label htmlFor="room-code" className="sr-only">
        {label}
      </label>
      <div
        className={`phase-transition flex min-h-12 items-stretch overflow-hidden rounded-md border bg-[var(--surface)]/60 backdrop-blur-sm focus-within:border-[var(--color-lamp)] ${
          bad ? "border-[var(--urgent)]" : "border-[var(--line)]"
        }`}
      >
        <input
          id="room-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setBad(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={bad}
          aria-describedby={bad ? "room-code-error" : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 font-mono text-base text-[var(--text)] placeholder:font-sans placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        <button
          type="submit"
          className="border-l border-[var(--line)] px-5 font-display text-lg tracking-wide transition-colors hover:bg-[var(--color-lamp)] hover:text-[var(--color-ink)]"
        >
          {submit} →
        </button>
      </div>
      {bad && (
        <p id="room-code-error" role="alert" className="mt-1.5 text-sm text-[var(--urgent)]">
          {error}
        </p>
      )}
    </form>
  );
}
