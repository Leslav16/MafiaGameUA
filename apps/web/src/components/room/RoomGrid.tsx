import type { ReactNode } from "react";

/**
 * Seats 1–11 and the host in twelve equal tiles, so every face fits on one
 * screen. The host sits in the 12th place (bottom-right) and is set apart by
 * its own frame (PlayerTile `isHost`), not by size.
 *
 * Wide screens: 4 × 3. Phones: 3 × 4. Both read left to right in seat order.
 */
export function RoomGrid({ host, seats }: { host: ReactNode; seats: ReactNode[] }) {
  return (
    <div className="room-grid mx-auto grid w-full grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4">
      {seats}
      {host}
    </div>
  );
}
