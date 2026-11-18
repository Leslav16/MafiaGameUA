"use client";

import { useCallback, useState } from "react";

/**
 * Drag a tile onto another to change seats. The seat number IS the place on
 * the grid (1 top-left, then 2, 3, ...), so a drop swaps the two players' seat
 * numbers for everyone, through the server. Seats lock when the game starts.
 *
 * Usage:
 *   const tiles = useTileOrder(code, {
 *     canDrag: (seat) => isHost || seat === mySeat,   // players drag only their own tile
 *     onMove: (from, to) => isHost ? room.hostAction({ type: "moveSeat", from, to }) : room.chooseSeat(to),
 *     locked: view.phase !== "lobby",
 *   });
 *   tiles.order            -> always [1..11]: tiles render in seat order
 *   tiles.dragProps(seat)  -> spread onto a tile: draggable + drag/drop handlers,
 *                             data-dragging / data-drop-target for styling
 *
 * `isCustom` and `reset` are kept for older callers; the order is never custom now.
 */

const ORDER = Array.from({ length: 11 }, (_, i) => i + 1);

export function useTileOrder(
  _code: string,
  opts: { canDrag?: (seat: number) => boolean; onMove?: (from: number, to: number) => unknown; locked?: boolean } = {},
) {
  const { canDrag = () => true, onMove, locked = false } = opts;
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = useCallback(
    (from: number, to: number) => {
      if (from !== to && !locked) void onMove?.(from, to);
    },
    [onMove, locked],
  );

  const dragProps = useCallback(
    (seat: number) => {
      const draggable = !locked && !!onMove && canDrag(seat);
      return {
        draggable,
        "data-dragging": dragging === seat || undefined,
        "data-drop-target": (over === seat && dragging !== null && dragging !== seat) || undefined,
        onDragStart: (e: React.DragEvent) => {
          if (!draggable) return e.preventDefault();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(seat));
          setDragging(seat);
        },
        onDragOver: (e: React.DragEvent) => {
          if (dragging === null) return;
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
      };
    },
    [dragging, over, move, locked, onMove, canDrag],
  );

  return { order: ORDER, move, reset: () => {}, dragProps, isCustom: false };
}
