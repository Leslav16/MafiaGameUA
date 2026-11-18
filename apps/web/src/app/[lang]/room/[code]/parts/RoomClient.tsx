"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dictionary } from "../../../dictionaries";
import { useRoom, type ParticipantMedia } from "@/lib/room/useRoom";
import type { HostAction, OwnNightMarks, RoomView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { HostPanel } from "@/components/host/HostPanel";
import { ModalButton } from "@/components/Modal";
import { RulesBody } from "@/components/RulesBody";
import { PhaseBanner } from "@/components/room/PhaseBanner";
import { PlayerTile } from "@/components/room/PlayerTile";
import { NightFall } from "@/components/room/NightFall";
import { useNarrator, useShotSound } from "@/components/room/useTableEffects";
import { SpectatorsButton } from "@/components/room/SpectatorsButton";
import { locationName } from "@/components/locations";
import { useCameraEffect, useEffectsSupported } from "@/components/room/useCameraEffect";
import { getPrefs, setPrefs, usePrefs } from "@/components/prefs";
import { RoomDock } from "@/components/room/RoomDock";
import { RoomGrid } from "@/components/room/RoomGrid";
import { Timer } from "@/components/room/Timer";
import type { SeatInfo } from "@/components/room/types";
import { useTileOrder } from "@/lib/room/useTileOrder";
import { JoinForm } from "./JoinForm";
import { AudioOut, VideoView, formatClock, useNow } from "./media";

type Dict = Pick<Dictionary, "roomUi" | "hostPanel" | "ui" | "rules" | "game" | "host" | "locations">;

/** Host view at night: whose camera to show. Everyone's camera is on, but only the woken role is shown. */
function awakeNow(role: string | undefined, step: RoomView["flow"]["nightStep"]): boolean {
  if (!role || !step || step === "asleep") return false;
  return step === "mafia" ? role === "mafia" || role === "don" : role === step;
}

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

/** The private night mark this player sees on a seat: their own checks or heals. */
function nightMark(
  marks: OwnNightMarks | null | undefined,
  seat: number,
  mySeat: number | null,
  ui: Dictionary["ui"],
): { text: string; tone: "bad" | "good" | "info" } | null {
  if (!marks) return null;
  const m = marks.seats[seat];
  if (marks.role === "doctor") {
    if (seat === mySeat && marks.selfHeals) return { text: `✚ ${fmt(ui.marks.self, { n: marks.selfHeals })}`, tone: "info" };
    return m?.count ? { text: `✚ ${fmt(ui.marks.healed, { n: m.count })}`, tone: "info" } : null;
  }
  if (!m || m.result === undefined) return null;
  if (marks.role === "sheriff")
    return m.result ? { text: `✓ ${ui.marks.mafia}`, tone: "bad" } : { text: `✓ ${ui.marks.notMafia}`, tone: "good" };
  return m.result ? { text: `✓ ${ui.marks.sheriff}`, tone: "bad" } : { text: `✓ ${ui.marks.notSheriff}`, tone: "good" };
}

/** Why this player's camera / mic is off and locked, if it is. */
function lockReason(view: RoomView, t: Dictionary["roomUi"]) {
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
  return { cam: reason("cam"), mic: reason("mic") };
}

export function RoomClient({ lang, code, dict }: { lang: string; code: string; dict: Dict }) {
  const room = useRoom(code);
  const [panelHidden, setPanelHidden] = useState(false);
  useShotSound(room.view?.flow.log);
  useNarrator(room.view?.flow.stage, room.view?.flow.nightStep, lang);
  const isHostView = room.view?.me.kind === "host";
  const mySeatView = room.view?.me.kind === "player" ? room.view.me.seat : null;
  const tiles = useTileOrder(code, {
    canDrag: (seat) => isHostView || seat === mySeatView,
    onMove: (from, to) => (isHostView ? room.hostAction({ type: "moveSeat", from, to }) : room.chooseSeat(to)),
    locked: room.view?.phase !== "lobby",
  });
  const prefs = usePrefs();
  const effectsOk = useEffectsSupported();
  const myIdentity =
    room.view?.me.kind === "host"
      ? room.view.host.identity
      : mySeatView != null
        ? room.view?.seats[mySeatView - 1]?.identity
        : null;
  const myMedia = room.media(myIdentity);
  useCameraEffect(myMedia.isLocal ? myMedia.video : undefined, prefs.effect);
  // Restore this browser's saved camera and mic once the video connection is up.
  const { videoConnected, switchDevice } = room;
  useEffect(() => {
    if (!videoConnected) return;
    const { cameraId, micId } = getPrefs();
    if (cameraId) void switchDevice("videoinput", cameraId);
    if (micId) void switchDevice("audioinput", micId);
  }, [videoConnected, switchDevice]);
  const t = dict.roomUi;
  const ui = dict.ui;
  const rules = { ...dict.rules, game: dict.game, host: dict.host };
  const { view } = room;
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
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
  else if (room.status === "join") body = <JoinForm room={room} t={t} ui={ui} />;
  else if (!view) body = <p className="text-xl">{t.connecting}</p>;
  else {
    const isHost = view.me.kind === "host";
    const mySeat = view.me.kind === "player" ? view.me.seat : null;
    const timerMs = view.timer.endsAt != null ? view.timer.endsAt - now : view.timer.remainingMs;
    const timerText = formatClock(timerMs);
    const hostMedia = room.media(view.host.identity);
    const problems = [room.error, room.mediaError].filter(Boolean) as string[];

    const isSpectator = view.me.kind === "spectator";
    const reason = isSpectator ? { cam: t.youWatch, mic: t.youWatch } : lockReason(view, t);
    const place = locationName(view.location, dict.locations);
    const showPlace = !!place && (view.phase === "lobby" || view.flow.round === "intro");
    const myView = view.me.kind === "player" ? view.me : null;
    const toSeatInfo = (s: RoomView["seats"][number], m: ParticipantMedia): SeatInfo => ({
      seat: s.seat,
      name: s.name ?? t.empty,
      alive: s.alive,
      connected: s.name ? s.connected : true,
      camOn: !!s.name && m.camOn && !!m.video,
      micOn: m.micOn,
      fouls: s.fouls,
      role: s.role,
      out: s.out,
      nominated: s.nominated,
      bot: s.bot,
    });

    body = (
      <div className="flex w-full flex-col lg:h-dvh">
        <NightFall phase={view.phase} nightText={ui.nightFalls} dayText={ui.dayBreaks} />
        <PhaseBanner
          phase={view.phase}
          labels={ui}
          caption={
            view.phase === "night" && view.flow.nightStep
              ? ui.nightStep[view.flow.nightStep]
              : showPlace
                ? fmt(t.introAt, { place: place! })
                : undefined
          }
          round={Math.max(1, view.day)}
          floorSeat={view.floorSeat}
          title={view.phase === "ended" && view.winner ? phaseTitle(view, t) : undefined}
        >
          <Timer
            secondsLeft={timerMs / 1000}
            totalSeconds={view.timer.durationMs / 1000}
            running={timerRunning}
            labels={ui}
          />
        </PhaseBanner>

        <div className="flex flex-col gap-3 px-1 pt-3 sm:px-0">
          {isHost && <InviteLink lang={lang} code={code} t={t} />}

          {(problems.length > 0 || actionError) && (
            <div role="alert" className="rounded-md border border-[var(--color-oxblood)] bg-[var(--color-oxblood)]/15 px-3 py-2">
              {[...problems.map(errorText), actionError].filter(Boolean).join(" ")}
            </div>
          )}
          {room.audioBlocked && (
            <button
              type="button"
              onClick={() => void room.startAudio()}
              className="self-start rounded-md bg-[var(--color-lamp)] px-4 py-2 font-medium text-[var(--color-ink)]"
            >
              🔊 {t.sound}
            </button>
          )}
        </div>

        <div
          className={`grid items-start gap-3 py-2 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] ${isHost && !panelHidden ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}
        >
          <div className="room-video">
          {/* 11 players, then the host on tile 12, set apart */}
          <RoomGrid
            seats={tiles.order.map((n) => {
              const s = view.seats[n - 1];
              const m = room.media(s.identity);
              return (
                <div key={s.seat} data-seat={s.seat} className="tile-slot" title={view.phase === "lobby" ? ui.dragHint : undefined} {...tiles.dragProps(s.seat)}>
                  <PlayerTile
                    info={toSeatInfo(s, m)}
                    labels={ui}
                    isMe={s.seat === mySeat}
                    speaking={m.speaking && m.micOn}
                    showRole={!!s.role && (isHost || view.phase === "ended" || s.seat !== mySeat)}
                    selected={isHost && selectedSeat === s.seat}
                    onSelect={
                      isHost && s.name ? () => setSelectedSeat(selectedSeat === s.seat ? null : s.seat) : undefined
                    }
                    video={
                      s.alive && (!isHost || view.phase !== "night" || awakeNow(s.role, view.flow.nightStep)) ? (
                        <VideoView track={m.video} mirror={m.isLocal && prefs.mirror} label={s.name ?? ""} />
                      ) : undefined
                    }
                    against={view.flow.voting?.votes[s.seat]}
                    nightMark={nightMark(myView?.marks, s.seat, mySeat, ui)}
                  />
                  {!m.isLocal && <AudioOut track={m.audio} />}
                </div>
              );
            })}
            host={
              <>
                <PlayerTile
                  info={{
                    seat: 12,
                    name: view.host.name,
                    alive: true,
                    connected: view.host.connected,
                    camOn: hostMedia.camOn && !!hostMedia.video,
                    micOn: hostMedia.micOn,
                    fouls: 0,
                  }}
                  labels={ui}
                  tag={t.host}
                  isHost
                  isMe={isHost}
                  speaking={hostMedia.speaking && hostMedia.micOn}
                  video={<VideoView track={hostMedia.video} mirror={hostMedia.isLocal && prefs.mirror} label={view.host.name} />}
                />
                {!hostMedia.isLocal && <AudioOut track={hostMedia.audio} />}
              </>
            }
          />

          </div>

          {isHost && !panelHidden && (
            <div className="room-panel lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <HostPanel
                onHide={() => setPanelHidden(true)}
                view={view}
                act={act}
                timerText={timerText}
                timerRunning={timerRunning}
                selectedSeat={selectedSeat}
                onDeselect={() => setSelectedSeat(null)}
                t={dict.hostPanel}
                roles={t.roles}
                locations={dict.locations}
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--surface)] phase-transition">
          <RoomDock
            effectsSupported={effectsOk}
            initialDevices={{ cameraId: prefs.cameraId, micId: prefs.micId }}
            onDevicesChange={(c) => {
              const saved = getPrefs();
              if (c.cameraId && c.cameraId !== saved.cameraId) void room.switchDevice("videoinput", c.cameraId);
              if (c.micId && c.micId !== saved.micId) void room.switchDevice("audioinput", c.micId);
              setPrefs({ cameraId: c.cameraId, micId: c.micId });
            }}
            preview={myMedia.video ? <VideoView track={myMedia.video} mirror={prefs.mirror} label={ui.lobby.mirror} /> : undefined}
            labels={ui}
            role={myView?.role ?? undefined}
            roleNote={
              myView && myView.teammates.length > 0 ? fmt(t.teammates, { seats: myView.teammates.join(", ") }) : undefined
            }
            micOn={room.wantMic && !reason.mic}
            camOn={room.wantCam && !reason.cam}
            micLocked={!!reason.mic}
            camLocked={!!reason.cam}
            onToggleMic={() => room.setWantMic(!room.wantMic)}
            onToggleCam={() => room.setWantCam(!room.wantCam)}
            note={reason.mic ?? reason.cam}
            nickname={
              isHost ? view.host.name : view.me.kind === "spectator" ? view.me.name : (view.seats[(mySeat ?? 1) - 1].name ?? "")
            }
            onRename={async (n) => {
              const err = await room.rename(n);
              return err ? errorText(err) : null;
            }}
            seat={mySeat ?? undefined}
            takenSeats={view.seats.filter((s) => s.name && s.seat !== mySeat).map((s) => s.seat)}
            onChooseSeat={async (n) => {
              const err = await room.chooseSeat(n);
              return err ? errorText(err) : null;
            }}
            extra={
              <>
              <SpectatorsButton spectators={view.spectators} t={t} closeLabel={ui.close} />
              {isHost && panelHidden && (
                <button
                  type="button"
                  onClick={() => setPanelHidden(false)}
                  className="phase-transition inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-lamp)] px-4 font-display text-base tracking-wide text-[var(--color-ink)]"
                >
                  ☰ {dict.hostPanel.show}
                </button>
              )}
              <ModalButton
                label={rules.open}
                title={rules.open}
                closeLabel={ui.close}
                wide
                className="phase-transition inline-flex min-h-12 items-center rounded-full border border-[var(--line)] px-4 font-display text-base tracking-wide hover:border-[var(--color-lamp)]"
              >
                <RulesBody rules={rules} />
              </ModalButton>
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <main data-phase={surface} className="phase-surface min-h-dvh px-2 sm:px-4">
      <div className="mx-auto flex min-h-dvh w-full flex-col items-stretch justify-center">{body}</div>
    </main>
  );
}
