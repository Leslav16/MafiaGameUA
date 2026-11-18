"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RoomSummary } from "@/lib/room/types";
import { gameServerUrl } from "@/lib/room/endpoints";
import { fmt } from "@/lib/room/format";
import { Modal } from "../Modal";
import { locationName, type Location } from "../locations";

export type TablesDict = {
  tables: string;
  tablesTitle: string;
  tablesNone: string;
  tablesOffline: string;
  tableWatch: string;
  tablePlay: string;
  tablePlayers: string;
  tableSpectators: string;
  tableLobby: string;
  tableDay: string;
  tableNight: string;
  tableEnded: string;
  tableHost: string;
  close: string;
};

/** Asks the game server for the tables their hosts made public; refreshes while the page is open. */
function useOpenTables(everyMs: number) {
  const [tables, setTables] = useState<RoomSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`${gameServerUrl()}/rooms`, { cache: "no-store" });
        const list = (await res.json()) as RoomSummary[];
        if (!stop) {
          setTables(list);
          setOffline(false);
        }
      } catch {
        if (!stop) setOffline(true);
      }
    };
    void load();
    const id = setInterval(load, everyMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [everyMs]);
  return { tables, offline };
}

/**
 * "Tables" in the header: a small live count, and a popup listing the open
 * tables with Watch (and Take a seat while a table is still gathering players).
 */
export function OpenTables({ lang, t, locations, className }: { lang: string; t: TablesDict; locations: Location[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const { tables, offline } = useOpenTables(open ? 5000 : 20000);
  const count = tables?.length ?? 0;
  const state = (r: RoomSummary) =>
    r.phase === "lobby" ? t.tableLobby : r.phase === "ended" ? t.tableEnded : r.phase === "night" ? t.tableNight : fmt(t.tableDay, { n: Math.max(1, r.day) });

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t.tables}
        {count > 0 && (
          <span className="ml-1.5 inline-grid min-w-6 place-items-center rounded-full bg-[var(--color-oxblood)] px-1.5 text-sm leading-6 text-[var(--color-card)] no-underline tabular-nums">
            {count}
          </span>
        )}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.tablesTitle} closeLabel={t.close}>
        {offline && !tables ? (
          <p>{t.tablesOffline}</p>
        ) : !tables || tables.length === 0 ? (
          <p>{t.tablesNone}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tables.map((r) => {
              const place = locationName(r.location, locations);
              return (
                <li key={r.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[var(--line)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl leading-tight tracking-wide">{fmt(t.tableHost, { name: r.hostName })}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {[state(r), fmt(t.tablePlayers, { n: r.players }), fmt(t.tableSpectators, { n: r.spectators }), place]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.phase === "lobby" && r.freeSeats > 0 && (
                      <Link
                        href={`/${lang}/room/${r.code}`}
                        className="inline-flex min-h-10 items-center rounded-md bg-[var(--accent)] px-4 font-display tracking-wide text-[var(--accent-text)]"
                      >
                        {t.tablePlay}
                      </Link>
                    )}
                    <Link
                      href={`/${lang}/room/${r.code}?watch`}
                      className="inline-flex min-h-10 items-center rounded-md border border-[var(--line)] px-4 font-display tracking-wide hover:border-[var(--accent)]"
                    >
                      👁 {t.tableWatch}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
