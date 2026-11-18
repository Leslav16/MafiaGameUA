"use client";

import type { HostAction, NightStep, RoomView, SeatView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { ConfirmButton } from "./ConfirmButton";
import { SeatPad } from "./SeatPad";
import { big, btn, plain, primary, type HostDict } from "./ui";
import { BotIcon, CheckIcon, PlayIcon } from "../room/icons";

/** Night checklist marker: done, now, or still to come. */
function StepMark({ state }: { state: "done" | "now" | "todo" }) {
  if (state === "done") return <CheckIcon className="size-4 shrink-0 text-[var(--text-muted)]" />;
  if (state === "now") return <PlayIcon className="size-4 shrink-0 text-lamp" />;
  return <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-[var(--line)]" />;
}

const list = (seats: number[]) => seats.map((s) => `№${s}`).join(", ");

/** Speaker, timer and the queue: shared by speeches, defence and last word. */
function Speaking({
  view,
  act,
  timerText,
  timerRunning,
  nextLabel,
  t,
}: {
  view: RoomView;
  act: (a: HostAction) => void;
  timerText: string;
  timerRunning: boolean;
  nextLabel: string;
  t: HostDict;
}) {
  const { flow } = view;
  const speaker = view.floorSeat;
  const name = speaker ? view.seats[speaker - 1].name : null;
  const queue = flow.stage === "lastWord" ? [] : flow.speakers;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-display text-2xl font-semibold">{speaker ? fmt(t.speaking, { n: speaker }) : "—"}</div>
          {name && <div className="text-sm text-[var(--text-muted)]">{name}</div>}
        </div>
        <span className="font-display text-4xl font-medium tabular-nums">{timerText}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${btn} ${plain}`}
          onClick={() => act({ type: "timer", op: timerRunning ? "pause" : "start" })}
        >
          {timerRunning ? t.pause : t.resume}
        </button>
        <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "timer", op: "restart" })}>
          {t.restart}
        </button>
      </div>
      <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "next" })}>
        {nextLabel}
            <PlayIcon className="size-4" />
      </button>
      {queue.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 text-sm" aria-label={t.order}>
          <span className="mr-1 text-[var(--text-muted)]">{t.order}:</span>
          {queue.map((s, i) => (
            <span
              key={s}
              className={`min-w-7 rounded px-1.5 text-center font-display ${
                i === flow.speakerIndex
                  ? "bg-lamp text-ink"
                  : i < flow.speakerIndex
                    ? "text-[var(--text-muted)] line-through"
                    : "bg-[var(--surface-raised)]"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Nominations({ view, act, t }: { view: RoomView; act: (a: HostAction) => void; t: HostDict }) {
  const { nominees, speakerIndex } = view.flow;
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-3">
      <div className="font-medium">{t.nominate}</div>
      <p className="text-sm text-[var(--text-muted)]">{t.nominateHint}</p>
      <SeatPad
        seats={view.seats}
        label={t.nominate}
        state={(s) => (nominees.includes(s.seat) ? "on" : s.alive ? "normal" : "disabled")}
        badge={(s) => (nominees.includes(s.seat) ? String(nominees.indexOf(s.seat) + 1) : null)}
        onTap={(seat) => act({ type: "nominate", seat })}
      />
      <p className="text-sm">{nominees.length ? fmt(t.nominees, { list: list(nominees) }) : t.noNominees}</p>
      {speakerIndex >= 1 && nominees.length === 0 && (
        <p role="status" className="rounded bg-lamp/20 px-2 py-1 text-sm">
          {t.firstMustNominate}
        </p>
      )}
    </div>
  );
}

function Voting({ view, act, t }: { view: RoomView; act: (a: HostAction) => void; t: HostDict }) {
  const v = view.flow.voting!;
  const candidate = v.candidates[v.index];
  const lastIndex = v.candidates.length - 1;
  const votedElsewhere = (s: number) => v.candidates.some((c) => c !== candidate && v.votes[c]?.includes(s));
  const used = new Set(Object.values(v.votes).flat());
  const alive = view.seats.filter((s) => s.name && s.alive);

  if (v.result) {
    const r = v.result;
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1">
          {v.candidates.map((c) => {
            const n = r.tally[c] ?? 0;
            return (
              <li key={c} className="flex items-center gap-2">
                <span className="w-10 font-display text-lg">№{c}</span>
                <span className="h-3 rounded bg-lamp" style={{ width: `${(n / Math.max(1, alive.length)) * 100}%` }} />
                <span className="tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
        <p className="font-medium">
          {r.out !== null
            ? fmt(t.resultOut, { n: r.out })
            : v.revote
              ? t.resultKeep
              : fmt(t.resultTie, { list: list(r.tied) })}
        </p>
        <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "next" })}>
          {r.out !== null
            ? fmt(t.confirmOut, { n: r.out })
            : !v.revote && r.tied.length > 1
              ? fmt(t.startRevote, { list: list(r.tied) })
              : t.toNight}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-semibold">{fmt(t.against, { n: candidate })}</span>
        <span className="text-sm">{fmt(t.handsCount, { n: v.votes[candidate]?.length ?? 0 })}</span>
      </div>
      <p className="text-sm text-[var(--text-muted)]">{t.votedHint}</p>
      <SeatPad
        seats={view.seats}
        label={fmt(t.against, { n: candidate })}
        state={(s) =>
          !s.alive ? "disabled" : v.votes[candidate]?.includes(s.seat) ? "on" : votedElsewhere(s.seat) ? "muted" : "normal"
        }
        badge={(s) => {
          const c = v.candidates.find((x) => x !== candidate && v.votes[x]?.includes(s.seat));
          return c ? `→${c}` : null;
        }}
        onTap={(voter) => {
          if (!votedElsewhere(voter)) act({ type: "vote", voter });
        }}
      />
      {v.index + 1 === lastIndex && (
        <p className="text-sm">
          {fmt(t.lastCandidate, {
            n: alive.filter((s) => !used.has(s.seat) && !v.votes[candidate]?.includes(s.seat)).length,
            seat: v.candidates[lastIndex],
          })}
        </p>
      )}
      <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "next" })}>
        {v.index + 1 < lastIndex ? t.nextCandidate : t.count}
            <PlayIcon className="size-4" />
      </button>
    </div>
  );
}

function Night({ view, act, t }: { view: RoomView; act: (a: HostAction) => void; t: HostDict }) {
  const n = view.flow.night!;
  const asleep = view.flow.nightStep === "asleep";
  const step = n.step;
  const result = (s: NightStep) => {
    if (s === "don" && n.donFoundSheriff !== null) return n.donFoundSheriff ? t.isSheriff : t.notSheriff;
    if (s === "sheriff" && n.sheriffFoundMafia !== null) return n.sheriffFoundMafia ? t.isMafia : t.notMafia;
    return null;
  };
  const pickText = (s: NightStep) => {
    if (!(s in n.picks)) return null;
    const p = n.picks[s];
    return p == null ? (s === "mafia" ? t.miss : t.skip) : `№${p}`;
  };
  const blocked = (s: SeatView) => step === "doctor" && n.healBlocked.includes(s.seat);
  const out = step !== null && n.stepsOut.includes(step);

  // Markers from earlier nights (the host sees the whole log): whom the Doctor healed and how
  // often, whom the Sheriff and the Don already checked, with the answer they got.
  const marks = new Map<number, string>();
  let summary: string | null = null;
  if (step === "doctor") {
    const heals = new Map<number, number>();
    for (const e of view.flow.log) if (e.kind === "healed" && e.seat) heals.set(e.seat, (heals.get(e.seat) ?? 0) + 1);
    for (const [seat, k] of heals) marks.set(seat, fmt(t.healedTimes, { n: k }));
    const doctor = view.seats.find((s) => s.role === "doctor")?.seat;
    const list = [...heals].sort(([a], [b]) => a - b).map(([seat, k]) => `№${seat} ×${k}`);
    summary = [list.length ? fmt(t.healedBefore, { list: list.join(", ") }) : null, fmt(t.selfHeals, { n: doctor ? (heals.get(doctor) ?? 0) : 0 })]
      .filter(Boolean)
      .join(" ");
  }
  if (step === "sheriff" || step === "don") {
    const kind = step === "sheriff" ? "sheriff_check" : "don_check";
    const yes = step === "sheriff" ? t.isMafia : t.isSheriff;
    const no = step === "sheriff" ? t.notMafia : t.notSheriff;
    for (const e of view.flow.log) if (e.kind === kind && e.seat) marks.set(e.seat, e.result ? yes : no);
    const list = [...marks].sort(([a], [b]) => a - b).map(([seat, r]) => `№${seat} ${r}`);
    if (list.length) summary = fmt(t.checkedBefore, { list: list.join(", ") });
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-1">
        <li className={`flex items-center gap-2 rounded px-2 py-1 ${asleep ? "bg-lamp/20 font-medium" : ""}`}>
          <StepMark state={asleep ? "now" : "done"} />
          {t.asleep}
        </li>
        {n.steps.map((s) => {
          const done = s in n.picks;
          const current = s === step;
          const res = result(s);
          return (
            <li
              key={s}
              className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${current ? "bg-lamp/20 font-medium" : ""} ${n.stepsOut.includes(s) ? "opacity-60" : ""}`}
            >
              <span className="flex items-center gap-2">
                <StepMark state={done ? "done" : current ? "now" : "todo"} />
                {t.steps[s]}
              </span>
              <span className="text-sm">
                {pickText(s)}
                {res && <strong className={res === t.isSheriff || res === t.isMafia ? " text-[#e05a6a]" : ""}> · {res}</strong>}
              </span>
            </li>
          );
        })}
      </ol>
      {asleep && (
        <>
          <p className="text-sm text-[var(--text-muted)]">{t.asleepHint}</p>
          <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "next" })}>
            {t.wakeMafia}
            <PlayIcon className="size-4" />
          </button>
        </>
      )}
      {step && out && (
        <>
          <p className="text-sm text-[var(--text-muted)]">{fmt(t.roleOut, { role: t.roleNames[step] })}</p>
          <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "nightPick", seat: null })}>
            {t.skip}
            <PlayIcon className="size-4" />
          </button>
        </>
      )}
      {step && !out && (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            {t.pickHint[step]} {t.awakeHint[step]}
          </p>
          {summary && <p className="text-sm">{summary}</p>}
          <SeatPad
            seats={view.seats}
            label={t.steps[step]}
            state={(s) => (!s.alive || blocked(s) ? "disabled" : "normal")}
            badge={(s) => (blocked(s) ? t.blocked : (marks.get(s.seat) ?? null))}
            onTap={(seat) => act({ type: "nightPick", seat })}
          />
          <button type="button" className={`${btn} ${plain}`} onClick={() => act({ type: "nightPick", seat: null })}>
            {step === "mafia" ? t.miss : t.skip}
          </button>
        </>
      )}
    </div>
  );
}

/** The one block that says what happens now and offers the next step. */
export function NowCard({
  view,
  act,
  timerText,
  timerRunning,
  t,
}: {
  view: RoomView;
  act: (a: HostAction) => void;
  timerText: string;
  timerRunning: boolean;
  t: HostDict;
}) {
  const { flow } = view;
  const players = view.seats.filter((s) => s.name).length;
  const speaking = { view, act, timerText, timerRunning, t };

  let title = "";
  let body: React.ReactNode = null;
  switch (flow.stage) {
    case "lobby":
      title = t.startGame;
      body = (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[var(--text-muted)]">{t.lobbyHint}</p>
          <button
            type="button"
            disabled={players < 3}
            className={`${btn} ${primary} ${big}`}
            onClick={() => act({ type: "startGame" })}
          >
            {t.startGame}
            <PlayIcon className="size-4" />
          </button>
          <p className="text-sm text-[var(--text-muted)]">{t.startHint}</p>
          <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-2">
            {players < 11 && (
              <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "addBots" })}>
                <BotIcon className="size-5" />
                {t.addBots}
              </button>
            )}
            {view.seats.some((s) => s.bot) && (
              <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "removeBots" })}>
                {t.removeBots}
              </button>
            )}
            <p className="text-xs text-[var(--text-muted)]">{t.botsHint}</p>
          </div>
        </div>
      );
      break;
    case "speeches": {
      title = flow.round === "intro" ? t.intro : fmt(t.dayN, { n: view.day });
      const last = flow.speakerIndex >= flow.speakers.length - 1;
      body = (
        <>
          <Speaking {...speaking} nextLabel={last ? t.endRound : t.next} />
          <Nominations view={view} act={act} t={t} />
        </>
      );
      break;
    }
    case "defence": {
      title = t.defence;
      const last = flow.speakerIndex >= flow.speakers.length - 1;
      body = <Speaking {...speaking} nextLabel={last ? t.endDefence : t.next} />;
      break;
    }
    case "voting":
      title = flow.voting?.revote ? t.revote : t.voting;
      body = <Voting view={view} act={act} t={t} />;
      break;
    case "lastWord": {
      const lw = flow.lastWord!;
      title = `${t.lastWord}: ${lw.reason === "killed" ? t.reasonKilled : t.reasonVoted}`;
      body = <Speaking {...speaking} nextLabel={t.endLastWord} />;
      break;
    }
    case "night":
      title = fmt(t.night, { n: view.day + 1 });
      body = flow.night ? <Night view={view} act={act} t={t} /> : null;
      break;
    case "morning": {
      title = t.morning;
      const killed = flow.morning?.killed ?? null;
      body = (
        <div className="flex flex-col gap-3">
          <p className="text-lg">{killed !== null ? fmt(t.morningKilled, { n: killed }) : t.morningNobody}</p>
          <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "next" })}>
            {t.announce}
            <PlayIcon className="size-4" />
          </button>
        </div>
      );
      break;
    }
    case "ended":
      title = view.winner ? t.winner[view.winner] : t.ended;
      body = (
        <div className="flex flex-col gap-2">
          <button type="button" className={`${btn} ${primary} ${big}`} onClick={() => act({ type: "newGame" })}>
            {t.newGame}
          </button>
          <p className="text-sm text-[var(--text-muted)]">{t.newGameHint}</p>
        </div>
      );
      break;
  }

  return (
    <section aria-label={t.now} className="flex flex-col gap-3 rounded-lg border-2 border-lamp/60 bg-[var(--surface)]/80 p-3">
      <h3 className="font-display text-lg font-medium tracking-wide">{title}</h3>
      {body}
      {flow.suggestedWinner && (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-oxblood/20 p-2">
          <p className="text-sm font-medium">{flow.suggestedWinner === "town" ? t.suggestTown : t.suggestMafia}</p>
          <ConfirmButton
            question={`${t.winner[flow.suggestedWinner]}?`}
            confirmLabel={t.confirm}
            cancelLabel={t.cancel}
            className={`${btn} ${primary}`}
            onConfirm={() => act({ type: "endGame", winner: flow.suggestedWinner! })}
          >
            {t.endNow}
          </ConfirmButton>
        </div>
      )}
    </section>
  );
}
