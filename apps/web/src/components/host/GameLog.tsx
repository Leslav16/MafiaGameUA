"use client";

import type { LogEntry } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import type { HostDict } from "./ui";

/** The story of the game so far, grouped by day. Night secrets are only sent to the host. */
export function GameLog({ log, t }: { log: LogEntry[]; t: HostDict }) {
  if (log.length === 0) return <p className="text-sm text-[var(--text-muted)]">{t.logEmpty}</p>;
  const n = (seat?: number) => (seat ? fmt(t.seatShort, { n: seat }) : "");
  const days = [...new Set(log.map((e) => e.day))];
  const line = (e: LogEntry) => {
    const kinds = t.logKinds as Record<string, string>;
    const key = e.kind === "nominated" && !e.by ? "nominatedNoBy" : e.kind;
    const result =
      e.kind === "don_check" ? (e.result ? t.isSheriff : t.notSheriff) : e.kind === "sheriff_check" ? (e.result ? t.isMafia : t.notMafia) : "";
    return fmt(kinds[key] ?? key, { seat: n(e.seat), by: n(e.by), result });
  };
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {days.map((d) => (
        <li key={d}>
          <div className="font-display tracking-wide text-[var(--text-muted)]">{d === 0 ? t.logIntro : fmt(t.logDay, { n: d })}</div>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {log
              .filter((e) => e.day === d)
              .map((e, i) => (
                <li key={i} className={["shot", "missed", "don_check", "sheriff_check", "healed"].includes(e.kind) ? "italic" : ""}>
                  {line(e)}
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
