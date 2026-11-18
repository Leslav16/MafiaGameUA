import type { LogEntry, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import type { HostDict, RoleNames } from "./ui";

/** One log line in words, e.g. "№3 put up №7". */
export function logLine(e: LogEntry, t: HostDict): string {
  const n = (seat?: number) => (seat ? fmt(t.seatShort, { n: seat }) : "");
  const kinds = t.logKinds as Record<string, string>;
  const key = e.kind === "nominated" && !e.by ? "nominatedNoBy" : e.kind;
  const result =
    e.kind === "don_check" ? (e.result ? t.isSheriff : t.notSheriff) : e.kind === "sheriff_check" ? (e.result ? t.isMafia : t.notMafia) : "";
  return fmt(kinds[key] ?? key, { seat: n(e.seat), by: n(e.by), result });
}

/**
 * The whole game as plain text for the host to keep: players and roles, how
 * each one left the game, and everything that happened day by day, night
 * secrets included. Built in the host's browser from what the host already sees.
 */
export function gameRecordText(view: RoomView, t: HostDict, roles: RoleNames, place: string | null, when: Date): string {
  const out: string[] = [];
  const outWord = { killed: t.recordKilled, voted: t.recordVoted, removed: t.recordRemoved } as const;
  out.push(t.recordTitle);
  out.push(fmt(t.recordRoom, { code: view.code, host: view.host.name, date: when.toLocaleString() }));
  if (place) out.push(fmt(t.recordPlace, { place }));
  out.push(view.winner ? fmt(t.recordWinner, { winner: t.winner[view.winner] }) : t.recordOngoing);
  out.push("");
  out.push(t.recordPlayers);
  for (const s of view.seats) {
    if (!s.name) continue;
    const bits = [`${String(s.seat).padStart(2, " ")}. ${s.name}`];
    if (s.role) bits.push(roles[s.role]);
    if (s.out) bits.push(outWord[s.out]);
    if (s.fouls) bits.push(fmt(t.recordFouls, { n: s.fouls }));
    out.push(`  ${bits.join(" · ")}`);
  }
  out.push("");
  out.push(t.recordFlow);
  const days = [...new Set(view.flow.log.map((e) => e.day))];
  for (const d of days) {
    out.push(d === 0 ? t.logIntro : fmt(t.logDay, { n: d }));
    for (const e of view.flow.log.filter((x) => x.day === d)) out.push(`  - ${logLine(e, t)}`);
  }
  return out.join("\n") + "\n";
}

/** Saves the record as a .txt file on the host's computer. */
export function downloadGameRecord(text: string, code: string, when: Date) {
  const stamp = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}_${String(when.getHours()).padStart(2, "0")}-${String(when.getMinutes()).padStart(2, "0")}`;
  const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mafia_${code}_${stamp}.txt`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
