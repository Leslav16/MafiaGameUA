"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MOTION, gsap, useGSAP } from "@/lib/motion";
import type { RoomSummary } from "@/lib/room/types";
import { gameServerUrl } from "@/lib/room/endpoints";
import { fmt } from "@/lib/room/format";
import { Modal } from "../Modal";
import { locationName, type Location } from "../locations";
import { CheckIcon, LockIcon, MoonIcon, SunIcon } from "../room/icons";

export type TablesDict = {
  tables: string;
  tablesTitle: string;
  tablesNone: string;
  tablesOffline: string;
  tableWatch: string;
  tablePlay: string;
  tableLocked: string;
  tablePlayers: string;
  tableSpectators: string;
  tableLobby: string;
  tableDay: string;
  tableNight: string;
  tableEnded: string;
  tableHost: string;
  create: string;
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
  const listRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Rows deal in one after another each time the popup opens.
  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION.ok, () => {
        gsap.fromTo(
          "[data-table-row], [data-tables-empty]",
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, delay: 0.08, clearProps: "transform,opacity" },
        );
      });
      return () => mm.revert();
    },
    { scope: listRef, dependencies: [open], revertOnUpdate: true },
  );

  // The live count in the header pops when it changes.
  useGSAP(
    () => {
      if (!badgeRef.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION.ok, () => {
        gsap.fromTo(badgeRef.current, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "back.out(2.4)" });
      });
      return () => mm.revert();
    },
    { dependencies: [count], revertOnUpdate: true },
  );
  const state = (r: RoomSummary) =>
    r.phase === "lobby" ? t.tableLobby : r.phase === "ended" ? t.tableEnded : r.phase === "night" ? t.tableNight : fmt(t.tableDay, { n: Math.max(1, r.day) });

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t.tables}
        {count > 0 && (
          <span ref={badgeRef} className="ml-1.5 inline-grid min-w-6 place-items-center rounded-full bg-[var(--color-oxblood)] px-1.5 text-sm leading-6 text-[var(--color-card)] no-underline tabular-nums">
            {count}
          </span>
        )}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.tablesTitle} closeLabel={t.close}>
        <div ref={listRef}>
        {offline && !tables ? (
          <TablesEmpty text={t.tablesOffline} />
        ) : !tables || tables.length === 0 ? (
          <TablesEmpty text={t.tablesNone}>
            <Link
              href={`/${lang}/room`}
              className="btn-feel inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-6 font-display text-lg tracking-wide text-[var(--accent-text)] hover:brightness-110"
            >
              {t.create}
            </Link>
          </TablesEmpty>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {tables.map((r) => {
              const place = locationName(r.location, locations);
              const live = r.phase === "day" || r.phase === "night";
              return (
                <li key={r.code} data-table-row className="tables-item grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-3 rounded-xl p-3 sm:grid-cols-[auto_1fr_auto]">
                  <span aria-hidden className="table-mark grid size-11 place-items-center rounded-full font-display text-lg" data-phase={r.phase}>
                    {r.phase === "night" ? <MoonIcon className="size-5" /> : r.phase === "lobby" ? "♠" : r.phase === "ended" ? <CheckIcon className="size-5" /> : <SunIcon className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-tight tracking-wide">{fmt(t.tableHost, { name: r.hostName })}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[var(--text-muted)]">
                      <span className={`table-pill ${live ? "table-pill-live" : ""}`}>{state(r)}</span>
                      {r.locked && (
                        <span className="table-pill table-pill-lock">
                          <LockIcon className="size-3.5" />
                          {t.tableLocked}
                        </span>
                      )}
                      <span className="table-pill">{fmt(t.tablePlayers, { n: r.players })}</span>
                      {r.spectators > 0 && <span className="table-pill">{fmt(t.tableSpectators, { n: r.spectators })}</span>}
                      {place && <span className="table-pill max-w-full truncate">{place}</span>}
                    </p>
                  </div>
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    {r.phase === "lobby" && r.freeSeats > 0 && (
                      <Link
                        href={`/${lang}/room/${r.code}`}
                        className="btn-feel inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 font-display tracking-wide text-[var(--accent-text)] hover:brightness-110 sm:flex-none"
                      >
                        {t.tablePlay}
                      </Link>
                    )}
                    <Link
                      href={`/${lang}/room/${r.code}?watch`}
                      className="btn-feel inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--line)] px-4 font-display tracking-wide hover:border-[var(--accent)] sm:flex-none"
                    >
                      {t.tableWatch}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </Modal>
    </>
  );
}

function TablesEmpty({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div data-tables-empty className="flex flex-col items-center gap-4 py-4 text-center">
      <span aria-hidden className="relative block aspect-[5/7] w-16 rotate-[-6deg]">
        <span className="card-back" />
      </span>
      <p className="max-w-[36ch] text-[var(--text-muted)]">{text}</p>
      {children}
    </div>
  );
}
