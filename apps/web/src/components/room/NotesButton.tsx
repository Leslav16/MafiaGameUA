"use client";

import { ModalButton } from "../Modal";
import { fill } from "./format";
import { CheckIcon, EyeIcon } from "./icons";
import { useNotes, type SeatMark } from "./notes";
import type { RoomLabels } from "./types";

/**
 * The player's private notebook: mark seats "I suspect" or "I trust" and jot free text.
 * Only this browser keeps it; the marks also show on the tiles, for this player alone.
 */
export function NotesButton({
  code,
  labels,
  seats,
  mySeat,
}: {
  code: string;
  labels: RoomLabels;
  /** Seats with a player: number and name. */
  seats: { seat: number; name: string }[];
  mySeat: number | null;
}) {
  const t = labels.notes;
  const { notes, toggleMark, setText, clear } = useNotes(code);
  const count = Object.keys(notes.marks).length;

  const markButton = (seat: number, mark: SeatMark) => {
    const on = notes.marks[seat] === mark;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => toggleMark(seat, mark)}
        title={t[mark]}
        aria-label={`${t[mark]}: ${fill(labels.seat, seat)}`}
        data-mark={mark}
        className="note-mark btn-feel grid size-10 place-items-center rounded-full border border-[var(--line)]"
      >
        {mark === "suspect" ? <EyeIcon className="size-5" /> : <CheckIcon className="size-5" />}
      </button>
    );
  };

  return (
    <ModalButton
      label={
        <>
          <PencilIcon />
          <span className="hidden sm:inline">{t.open}</span>
          {count > 0 && <span className="tabular-nums text-[var(--text-muted)]">{count}</span>}
        </>
      }
      title={t.title}
      closeLabel={labels.close}
      className="phase-transition btn-feel inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--color-lamp)]"
    >
      <p className="mb-4 text-[var(--text-muted)]">{t.hint}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-6">
        {seats
          .filter((s) => s.seat !== mySeat)
          .map((s) => (
            <li key={s.seat} className="flex items-center gap-3">
              <span className="w-7 text-right font-display text-lg tabular-nums">{s.seat}</span>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {markButton(s.seat, "suspect")}
              {markButton(s.seat, "trust")}
            </li>
          ))}
      </ul>
      <label className="mt-5 block">
        <span className="font-display text-lg tracking-wide">{t.text}</span>
        <textarea
          value={notes.text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={t.placeholder}
          className="soft-field mt-1.5 block w-full rounded-xl p-3 text-base text-[var(--text)]"
        />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text-muted)]">{t.private}</span>
        <button
          type="button"
          onClick={clear}
          disabled={count === 0 && !notes.text}
          className="btn-feel min-h-11 rounded-full border border-[var(--line)] px-4 font-display tracking-wide disabled:opacity-45"
        >
          {t.clear}
        </button>
      </div>
    </ModalButton>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
