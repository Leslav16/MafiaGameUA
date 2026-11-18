"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import { useRoom, type RoomApi } from "@/lib/room/useRoom";
import type { HostAction, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { HostPanel } from "@/components/host/HostPanel";
import { HostSeatControls } from "@/components/host/HostSeatControls";
import { JoinForm } from "./JoinForm";
import { SeatTile } from "./SeatTile";
import { CamIcon, MicIcon } from "./icons";
import { formatClock, useNow } from "./media";

type Dict = Pick<Dictionary, "roomUi" | "hostPanel">;

function Notice({ text, lang, t }: { text: string; lang: string; t: Dictionary["roomUi"] }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-6">
      <p className="text-2xl">{text}</p>
      <Link href={`/${lang}`} className="underline underline-offset-4">
        {t.toStart}
      </Link>
    </div>
  );
}

function phaseTitle(view: RoomView, t: Dictionary["roomUi"]) {
  if (view.phase === "ended" && view.winner) return `${t.phase.ended}: ${t.winner[view.winner]}`;
  return fmt(t.phase[view.phase], { n: Math.max(1, view.day) });
}

function InviteLink({ lang, code, t }: { lang: string; code: string; t: Dictionary["roomUi"] }) {
  const [copied, setCopied] = useState(false);
  // Only rendered after joining, in the browser, so window is available.
  const url = `${window.location.origin}/${lang}/room/${code}`;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-[var(--text-muted)]">{t.invite}</span>
      <code className="min-w-0 truncate rounded bg-[var(--surface-raised)] px-2 py-1">{url}</code>
      <button
        type="button"
        className="min-h-9 shrink-0 rounded border border-[var(--line)] px-3"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}

/** This browser's own camera and mic switches, with the reason when the host or the game has them off. */
function MyMedia({ room, view, t }: { room: RoomApi; view: RoomView; t: Dictionary["roomUi"] }) {
  const me = view.me.kind === "player" ? view.seats[view.me.seat - 1] : null;
  const reason = (kind: "cam" | "mic") => {
    if (!me) return null;
    if (kind === "cam" ? me.camAllowed : me.micAllowed) return null;
    if (!me.alive && view.phase !== "ended") return t.lockedDead;
    if (view.phase === "night") return t.lockedNight;
    if (kind === "cam" ? me.hostCamOff : me.hostMicOff) return t.lockedByHost;
    if (kind === "mic" && view.floorSeat !== null) return t.lockedFloor;
    return t.lockedByHost;
  };
  const camReason = reason("cam");
  const micReason = reason("mic");
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!!camReason}
        aria-pressed={room.wantCam && !camReason}
        onClick={() => room.setWantCam(!room.wantCam)}
        className={`${btn} ${room.wantCam && !camReason ? "border-[var(--line)]" : "border-oxblood bg-oxblood text-card"}`}
      >
        <CamIcon off={!room.wantCam || !!camReason} />
        {room.wantCam ? t.cameraOff : t.cameraOn}
      </button>
      <button
        type="button"
        disabled={!!micReason}
        aria-pressed={room.wantMic && !micReason}
        onClick={() => room.setWantMic(!room.wantMic)}
        className={`${btn} ${room.wantMic && !micReason ? "border-[var(--line)]" : "border-oxblood bg-oxblood text-card"}`}
      >
        <MicIcon off={!room.wantMic || !!micReason} />
        {room.wantMic ? t.micOff : t.micOn}
      </button>
      {(camReason || micReason) && (
        <span className="text-sm text-[var(--text-muted)]">{micReason ?? camReason}</span>
      )}
    </div>
  );
}

function RoleCard({ view, t }: { view: RoomView; t: Dictionary["roomUi"] }) {
  if (view.me.kind !== "player") return null;
  const { role, teammates } = view.me;
  return (
    <div className="rounded-lg bg-card px-4 py-3 text-ink">
      <div className="text-sm">{t.yourRole}</div>
      <div className="font-display text-2xl font-semibold">{role ? t.roles[role] : t.noRole}</div>
      {teammates.length > 0 && (
        <div className="text-sm">{fmt(t.teammates, { seats: teammates.join(", ") })}</div>
      )}
    </div>
  );
}

export function RoomClient({ lang, code, dict }: { lang: string; code: string; dict: Dict }) {
  const room = useRoom(code);
  const t = dict.roomUi;
  const { view } = room;
  const [actionError, setActionError] = useState<string | null>(null);
  const timerRunning = view?.timer.endsAt != null;
  const now = useNow(timerRunning, room.clockOffset);
  const errorText = (c: string) => (t.errors as Record<string, string>)[c] ?? t.errors.server_error;

  const act = (a: HostAction) => {
    setActionError(null);
    void room.hostAction(a).then((err) => err && setActionError(errorText(err)));
  };

  const surface = view?.phase === "night" ? "night" : "day";
  let body: React.ReactNode;

  if (room.status === "connecting") body = <p className="text-xl">{t.connecting}</p>;
  else if (room.status === "offline") body = <Notice text={t.offline} lang={lang} t={t} />;
  else if (room.status === "not_found") body = <Notice text={t.notFound} lang={lang} t={t} />;
  else if (room.status === "kicked") body = <Notice text={t.kicked} lang={lang} t={t} />;
  else if (room.status === "join") body = <JoinForm room={room} t={t} />;
  else if (!view) body = <p className="text-xl">{t.connecting}</p>;
  else {
    const isHost = view.me.kind === "host";
    const mySeat = view.me.kind === "player" ? view.me.seat : null;
    const timerMs = view.timer.endsAt != null ? view.timer.endsAt - now : view.timer.remainingMs;
    const timerText = formatClock(timerMs);
    const freeSeats = view.seats.filter((s) => !s.name).map((s) => s.seat);
    const hostMedia = room.media(view.host.identity);
    const problems = [room.error, room.mediaError].filter(Boolean) as string[];

    body = (
      <div className="flex w-full flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{phaseTitle(view, t)}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">{t.timer}</span>
            <span
              className={`font-display text-4xl font-medium tabular-nums ${timerRunning && timerMs <= 10_000 ? "text-[#e05a6a]" : ""}`}
            >
              {timerText}
            </span>
          </div>
        </header>

        {isHost && <InviteLink lang={lang} code={code} t={t} />}

        {(problems.length > 0 || actionError) && (
          <div role="alert" className="rounded-md border border-oxblood bg-oxblood/15 px-3 py-2">
            {[...problems.map(errorText), actionError].filter(Boolean).join(" ")}
          </div>
        )}
        {room.audioBlocked && (
          <button
            type="button"
            onClick={() => void room.startAudio()}
            className="self-start rounded-md bg-lamp px-4 py-2 font-medium text-ink"
          >
            🔊 {t.sound}
          </button>
        )}

        <div className={`grid gap-4 ${isHost ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
          <div className="flex flex-col gap-4">
            <ul className="mx-auto grid w-full max-w-md grid-cols-1">
              <SeatTile label={t.host} name={view.host.name} isYou={isHost} connected={view.host.connected} media={hostMedia} t={t} large />
            </ul>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {view.seats.map((s) => (
                <SeatTile
                  key={s.seat}
                  label={String(s.seat)}
                  name={s.name}
                  isYou={s.seat === mySeat}
                  isFloor={view.floorSeat === s.seat}
                  alive={s.alive}
                  connected={s.connected}
                  fouls={s.fouls}
                  role={s.role}
                  media={room.media(s.identity)}
                  t={t}
                >
                  {isHost && (
                    <HostSeatControls
                      seat={s}
                      phase={view.phase}
                      floorSeat={view.floorSeat}
                      freeSeats={freeSeats}
                      act={act}
                      t={dict.hostPanel}
                    />
                  )}
                </SeatTile>
              ))}
            </ul>
          </div>

          {isHost && (
            <div className="lg:sticky lg:top-4 lg:self-start">
              <HostPanel view={view} act={act} timerText={timerText} timerRunning={timerRunning} t={dict.hostPanel} />
            </div>
          )}
        </div>

        {!isHost && (
          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] py-3">
            <RoleCard view={view} t={t} />
            <MyMedia room={room} view={view} t={t} />
          </footer>
        )}
        {isHost && (
          <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] py-3">
            <HostOwnMedia room={room} t={t} />
          </footer>
        )}
      </div>
    );
  }

  return (
    <main data-phase={surface} className="phase-surface min-h-dvh px-4 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start">{body}</div>
    </main>
  );
}

function HostOwnMedia({ room, t }: { room: RoomApi; t: Dictionary["roomUi"] }) {
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-md border px-3";
  return (
    <>
      <button
        type="button"
        aria-pressed={room.wantCam}
        onClick={() => room.setWantCam(!room.wantCam)}
        className={`${btn} ${room.wantCam ? "border-[var(--line)]" : "border-oxblood bg-oxblood text-card"}`}
      >
        <CamIcon off={!room.wantCam} />
        {room.wantCam ? t.cameraOff : t.cameraOn}
      </button>
      <button
        type="button"
        aria-pressed={room.wantMic}
        onClick={() => room.setWantMic(!room.wantMic)}
        className={`${btn} ${room.wantMic ? "border-[var(--line)]" : "border-oxblood bg-oxblood text-card"}`}
      >
        <MicIcon off={!room.wantMic} />
        {room.wantMic ? t.micOff : t.micOn}
      </button>
    </>
  );
}
