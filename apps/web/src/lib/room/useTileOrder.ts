"use client";

import { useCallback, useState } from "react";

/**
 * The order this viewer wants the eleven player tiles in. Each person can drag
 * tiles into their own order (for example to match the real table); it is
 * remembered in this browser per room and changes nothing for anyone else.
 * The host's tile stays 12th.
 *
 * Usage:
 *   const tiles = useTileOrder(code);
 *   tiles.order            -> seat numbers in display order, e.g. [3, 1, 2, ...]
 *   tiles.dragProps(seat)  -> spread onto a tile: draggable + drag/drop handlers
 *   tiles.move(seat, to)   -> put `seat` where `to` is (for keyboard or buttons)
 *   tiles.reset()          -> back to seat-number order
 */

const DEFAULT = Array.from({ length: 11 }, (_, i) => i + 1);
const storageKey = (code: string) => `mafia:order:${code}`;

function load(code: string): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(code)) ?? "null");
    if (Array.isArray(raw) && raw.length === 11 && DEFAULT.every((s) => raw.includes(s))) return raw;
  } catch {
    // no saved order, or storage blocked
  }
  return DEFAULT;
}

export function useTileOrder(code: string) {
  const [order, setOrder] = useState<number[]>(() => (typeof window === "undefined" ? DEFAULT : load(code)));
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const save = useCallback(
    (next: number[]) => {
      setOrder(next);
      try {
        localStorage.setItem(storageKey(code), JSON.stringify(next));
      } catch {
        // storage blocked: the order lasts until reload
      }
    },
    [code],
  );

  const move = useCallback(
    (seat: number, to: number) => {
      if (seat === to) return;
      const next = order.filter((s) => s !== seat);
      next.splice(next.indexOf(to) + (order.indexOf(seat) < order.indexOf(to) ? 1 : 0), 0, seat);
      save(next);
    },
    [order, save],
  );

  const reset = useCallback(() => save(DEFAULT), [save]);

  const dragProps = useCallback(
    (seat: number) => ({
      draggable: true,
      "data-dragging": dragging === seat || undefined,
      "data-drop-target": (over === seat && dragging !== null && dragging !== seat) || undefined,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(seat));
        setDragging(seat);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== seat) setOver(seat);
      },
      onDragLeave: () => setOver((o) => (o === seat ? null : o)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (from) move(from, seat);
        setDragging(null);
        setOver(null);
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
    }),
    [dragging, over, move],
  );

  const isCustom = order.some((s, i) => s !== DEFAULT[i]);

  return { order, move, reset, dragProps, isCustom };
}
