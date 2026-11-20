"use client";

import type { HostAction, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { btn, plain, primary, type HostDict } from "./ui";

/**
 * Players who lost their connection and came back as spectators, asking for their seat.
 * One press returns them: the seat keeps its role and everything else.
 */
export function ReturnRequests({ view, act, t }: { view: RoomView; act: (a: HostAction) => void; t: HostDict }) {
  const asks = (view.spectators.list ?? []).filter((w) => w.wantsSeat !== null);
  if (asks.length === 0) return null;
  return (
    <section aria-live="polite" className="return-ask flex flex-col gap-2 rounded-lg border border-lamp p-3">
      <h3 className="font-display text-sm font-medium tracking-[0.12em] text-[var(--accent-strong)] uppercase">{t.returnTitle}</h3>
      {asks.map((w) => {
        const seat = view.seats[w.wantsSeat! - 1];
        return (
          <div key={w.id} className="flex flex-col gap-2">
            <p className="text-sm">
              {fmt(t.returnAsk, { name: w.name, n: w.wantsSeat!, seatName: seat?.name ?? "" })}
              {seat?.connected && <span className="block text-xs text-[var(--urgent)]">{t.returnStillOnline}</span>}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${btn} ${primary} flex-1 text-sm`}
                onClick={() => act({ type: "seatSpectator", spectator: w.id, seat: w.wantsSeat! })}
              >
                {t.returnSeat}
              </button>
              <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "dismissReturn", spectator: w.id })}>
                {t.returnDismiss}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
