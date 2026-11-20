"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A player's private notes for one room: a mark per seat ("I suspect", "I trust") and free text.
 * They never leave this browser (localStorage, one entry per room code), so nobody else can see them.
 */
export type SeatMark = "suspect" | "trust";
export type Notes = { marks: Record<number, SeatMark>; text: string };

const EMPTY: Notes = { marks: {}, text: "" };
const cache = new Map<string, Notes>();
const listeners = new Set<() => void>();
const keyOf = (code: string) => `mafia.notes.${code}`;

function read(code: string): Notes {
  const hit = cache.get(code);
  if (hit) return hit;
  let notes = EMPTY;
  try {
    const raw = window.localStorage.getItem(keyOf(code));
    if (raw) notes = { ...EMPTY, ...(JSON.parse(raw) as Partial<Notes>) };
  } catch {}
  cache.set(code, notes);
  return notes;
}

function write(code: string, notes: Notes) {
  cache.set(code, notes);
  try {
    if (!notes.text && Object.keys(notes.marks).length === 0) window.localStorage.removeItem(keyOf(code));
    else window.localStorage.setItem(keyOf(code), JSON.stringify(notes));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNotes(code: string) {
  const notes = useSyncExternalStore(subscribe, () => read(code), () => EMPTY);
  /** Sets a seat's mark; the same mark again clears it. */
  const toggleMark = useCallback(
    (seat: number, mark: SeatMark) => {
      const cur = read(code);
      const marks = { ...cur.marks };
      if (marks[seat] === mark) delete marks[seat];
      else marks[seat] = mark;
      write(code, { ...cur, marks });
    },
    [code],
  );
  const setText = useCallback((text: string) => write(code, { ...read(code), text: text.slice(0, 2000) }), [code]);
  const clear = useCallback(() => write(code, EMPTY), [code]);
  return { notes, toggleMark, setText, clear };
}
