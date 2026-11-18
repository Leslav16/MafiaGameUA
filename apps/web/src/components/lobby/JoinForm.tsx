"use client";

import { useState, type FormEvent } from "react";
import { fill } from "../room/format";
import type { RoomLabels } from "../room/types";

const SEATS = 11;

/** Seat positions around an oval, host at the top, 1–11 clockwise. */
function seatPosition(i: number) {
  const angle = ((-90 + 30 * (i + 1)) * Math.PI) / 180;
  return { left: 50 + 43 * Math.cos(angle), top: 50 + 40 * Math.sin(angle) };
}

/**
 * Pick a free seat by clicking it on the table. `taken` maps seat number to
 * the nickname sitting there.
 */
export function SeatPicker({
  labels,
  taken,
  selected,
  onSelect,
}: {
  labels: RoomLabels;
  taken: Record<number, string>;
  selected: number | null;
  onSelect: (seat: number) => void;
}) {
  const t = labels.join;
  const free = SEATS - Object.keys(taken).length;

  return (
    <fieldset>
      <legend className="font-display text-xl tracking-wide">{t.pickSeat}</legend>
      <p className="text-base text-[var(--text-muted)] phase-transition">{fill(t.seatsFree, free)}</p>
      <div className="relative mx-auto mt-4 aspect-[6/5] w-full max-w-[34rem]">
        {/* Table and lamp glow */}
        <div aria-hidden className="absolute inset-[8%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(200_137_63/0.4),transparent)]" />
        <div aria-hidden className="phase-transition absolute inset-[24%_22%] rounded-[50%] bg-[var(--table)]" />
        {/* Host */}
        <div
          aria-hidden
          className="absolute top-[3%] left-1/2 -translate-x-1/2 rounded-md border-2 border-[var(--color-lamp)] bg-[var(--color-ink)] px-3 py-1.5 font-display text-base tracking-wide text-[var(--color-card)]"
        >
          {labels.host}
        </div>
        {Array.from({ length: SEATS }, (_, i) => {
          const n = i + 1;
          const who = taken[n];
          const isSelected = selected === n;
          const { left, top } = seatPosition(i);
          return (
            <button
              key={n}
              type="button"
              disabled={!!who}
              aria-pressed={isSelected}
              onClick={() => onSelect(n)}
              aria-label={`${fill(labels.seat, n)}: ${who ? `${t.taken} (${who})` : isSelected ? t.selected : t.free}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={[
                "absolute flex min-h-12 min-w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-md border px-1.5 leading-none transition-[transform,background-color,border-color] duration-150",
                who
                  ? "cursor-not-allowed border-transparent bg-[var(--color-smoke)]/25 text-[var(--text-muted)]"
                  : isSelected
                    ? "scale-110 border-[var(--color-ink)] bg-[var(--color-lamp)] text-[var(--color-ink)] shadow-[0_6px_18px_-6px_rgba(200,137,63,0.9)]"
                    : "border-[var(--line)] bg-[var(--seat-fill)] text-[var(--seat-text)] hover:border-[var(--color-lamp)] hover:bg-[var(--surface-raised)]",
              ].join(" ")}
            >
              <span className="font-display text-2xl font-semibold tabular-nums">{n}</span>
              {who && <span className="mt-0.5 max-w-16 truncate text-[0.7rem]">{who}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Nickname + seat, in one form. Calls `onJoin` with both. The room page
 * passes the seats already taken.
 */
export function JoinForm({
  labels,
  taken,
  onJoin,
  busy = false,
}: {
  labels: RoomLabels;
  taken: Record<number, string>;
  onJoin: (p: { nickname: string; seat: number }) => void;
  busy?: boolean;
}) {
  const t = labels.join;
  const [nickname, setNickname] = useState("");
  const [seat, setSeat] = useState<number | null>(null);
  const canJoin = nickname.trim().length > 0 && seat != null && !taken[seat];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (canJoin && seat != null) onJoin({ nickname: nickname.trim(), seat });
  }

  return (
    <form onSubmit={submit} className="grid gap-8">
      <label className="block max-w-md">
        <span className="font-display text-xl tracking-wide">{t.nickname}</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.nicknamePlaceholder}
          maxLength={20}
          required
          autoComplete="nickname"
          aria-describedby="nickname-hint"
          className="phase-transition mt-2 block min-h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-lg text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-lamp)] focus:outline-none"
        />
        <span id="nickname-hint" className="mt-1.5 block text-base text-[var(--text-muted)] phase-transition">
          {t.nicknameHint}
        </span>
      </label>
      <SeatPicker labels={labels} taken={taken} selected={seat} onSelect={setSeat} />
      <div>
        <button
          type="submit"
          disabled={!canJoin || busy}
          className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg font-medium tracking-wide text-[var(--accent-text)] transition-transform duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {seat != null ? fill(t.submit, seat) : t.submitNoSeat}
        </button>
      </div>
    </form>
  );
}
