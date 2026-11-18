import type { ReactNode } from "react";

/**
 * Lays out the host and seats 1–11 so every face fits on one screen.
 *
 * Wide screens: 5 columns × 3 rows. The host takes a 2×2 block on the left,
 * seats 1–3 and 4–6 sit beside it, seats 7–11 fill the bottom row. Seat
 * numbers read left to right, top to bottom, with no gaps.
 * Tablets and phones: 3 columns; the host spans the full first row.
 *
 * Pass the host tile and exactly the seat tiles in seat order.
 */
export function RoomGrid({ host, seats }: { host: ReactNode; seats: ReactNode[] }) {
  return (
    <div className="room-grid mx-auto grid w-full grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
      <div className="col-span-3 lg:col-span-2 lg:row-span-2 [&>figure]:aspect-video lg:[&>figure]:aspect-auto lg:[&>figure]:size-full">
        {host}
      </div>
      {seats}
    </div>
  );
}
