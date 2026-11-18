"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CamIcon, MicIcon } from "../room/icons";
import type { RoomLabels } from "../room/types";

export type DeviceChoice = { cameraId?: string; micId?: string };

type State = "idle" | "asking" | "live" | "denied" | "missing";

/** Same quality the room will use (docs/PLAN.md): 720p, clean voice. */
const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
const AUDIO = { echoCancellation: true, noiseSuppression: true };

/**
 * Camera and mic check before the game: your own picture, device pickers,
 * a live mic level bar, and the Ready toggle. Uses the browser directly, so
 * it works before the video server is involved. Reports the chosen devices
 * through `onDevicesChange` so the room can publish with the same ones.
 */
export function DeviceCheck({
  labels,
  ready,
  onReadyChange,
  onDevicesChange,
  preview,
  stacked = false,
  initial,
  hideReady = false,
}: {
  /** No Ready button (the home page check). */
  hideReady?: boolean;
  /** Devices to open first (a saved choice). */
  initial?: DeviceChoice;
  /** Shown instead of the raw camera, e.g. the room's own track with its background effect. */
  preview?: ReactNode;
  /** One column: picture on top, pickers below (for the Settings popup). */
  stacked?: boolean;
  labels: RoomLabels;
  ready: boolean;
  onReadyChange: (ready: boolean) => void;
  onDevicesChange?: (choice: DeviceChoice) => void;
}) {
  const t = labels.lobby;
  const [state, setState] = useState<State>("idle");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [choice, setChoice] = useState<DeviceChoice>(initial ?? {});
  const [level, setLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const start = useCallback(
    async (want: DeviceChoice) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("missing");
        return;
      }
      setState("asking");
      stop();
      try {
        const open = (w: DeviceChoice) =>
          navigator.mediaDevices.getUserMedia({
            video: { ...VIDEO, ...(w.cameraId ? { deviceId: { exact: w.cameraId } } : {}) },
            audio: { ...AUDIO, ...(w.micId ? { deviceId: { exact: w.micId } } : {}) },
          });
        let stream: MediaStream;
        try {
          stream = await open(want);
        } catch (e) {
          // A saved device that was unplugged: fall back to the default ones.
          if ((e as DOMException)?.name !== "OverconstrainedError" || !(want.cameraId || want.micId)) throw e;
          stream = await open({});
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCams(devices.filter((d) => d.kind === "videoinput"));
        setMics(devices.filter((d) => d.kind === "audioinput"));
        const now: DeviceChoice = {
          cameraId: stream.getVideoTracks()[0]?.getSettings().deviceId,
          micId: stream.getAudioTracks()[0]?.getSettings().deviceId,
        };
        setChoice(now);
        onDevicesChange?.(now);

        // Mic level meter
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
        setState("live");
      } catch (err) {
        const name = (err as DOMException)?.name;
        setState(name === "NotFoundError" || name === "OverconstrainedError" ? "missing" : "denied");
        if (ready) onReadyChange(false);
      }
    },
    [stop, onDevicesChange, onReadyChange, ready],
  );

  useEffect(() => stop, [stop]);

  const select = "soft-field soft-select phase-transition mt-1.5 block min-h-11 w-full rounded-xl pr-10 pl-3 text-base text-[var(--text)]";

  return (
    <div className={`grid ${stacked ? "gap-5" : "gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start"}`}>
      {/* Mirror */}
      <div className="tile relative aspect-video overflow-hidden rounded-xl bg-[var(--tile)]">
        {preview && state === "live" && <div className="absolute inset-0 z-[1] [&>*]:size-full [&>*]:object-cover">{preview}</div>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={t.mirror}
          className={`size-full -scale-x-100 object-cover ${state === "live" ? "" : "hidden"}`}
        />
        {state !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-[var(--color-card)]">
            <CamIcon off={state === "denied" || state === "missing"} className="size-10 text-[var(--color-smoke)]" />
            {state === "denied" && <p role="alert" className="max-w-[40ch] text-base">{t.denied}</p>}
            {state === "missing" && <p role="alert" className="max-w-[40ch] text-base">{t.noDevice}</p>}
            {(state === "idle" || state === "asking" || state === "denied") && (
              <>
                <button
                  type="button"
                  onClick={() => start(choice)}
                  disabled={state === "asking"}
                  className="inline-flex min-h-12 items-center rounded-md bg-[var(--color-lamp)] px-6 font-display text-lg font-medium tracking-wide text-[var(--color-ink)] active:scale-[0.98] disabled:opacity-60"
                >
                  {t.allow}
                </button>
                {state !== "denied" && <p className="text-sm text-[var(--color-card)]/75">{t.allowHint}</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Pickers, level, ready */}
      <div className={`grid gap-5 ${stacked ? "sm:grid-cols-2 sm:[&>*:nth-child(n+3)]:col-span-2" : ""}`}>
        <label className="block">
          <span className="flex items-center gap-2 font-display text-lg tracking-wide">
            <CamIcon className="size-5" /> {t.camera}
          </span>
          <select
            className={select}
            disabled={state !== "live" || cams.length < 2}
            value={choice.cameraId ?? ""}
            onChange={(e) => start({ ...choice, cameraId: e.target.value })}
          >
            {cams.length === 0 && <option value="">—</option>}
            {cams.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${t.camera} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="flex items-center gap-2 font-display text-lg tracking-wide">
            <MicIcon className="size-5" /> {t.microphone}
          </span>
          <select
            className={select}
            disabled={state !== "live" || mics.length < 2}
            value={choice.micId ?? ""}
            onChange={(e) => start({ ...choice, micId: e.target.value })}
          >
            {mics.length === 0 && <option value="">—</option>}
            {mics.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${t.microphone} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="font-display text-lg tracking-wide" id="mic-level">{t.level}</span>
          <div
            role="meter"
            aria-labelledby="mic-level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
            className="mt-2 flex h-4 items-end gap-[3px]"
          >
            {Array.from({ length: 16 }, (_, i) => {
              const lit = level * 16 > i;
              return (
                <span
                  key={i}
                  className="flex-1 rounded-sm transition-[background-color,height] duration-75"
                  style={{
                    height: `${40 + (i / 15) * 60}%`,
                    backgroundColor: lit ? (i > 12 ? "var(--color-oxblood)" : "var(--color-lamp)") : "color-mix(in srgb, var(--line) 70%, transparent)",
                  }}
                />
              );
            })}
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-muted)] phase-transition">{t.levelHint}</p>
        </div>
        {!hideReady && (
        <button
          type="button"
          aria-pressed={ready}
          disabled={state !== "live" && !ready}
          onClick={() => onReadyChange(!ready)}
          className={[
            "inline-flex min-h-13 items-center justify-center gap-2 rounded-xl px-6 font-display text-xl font-medium tracking-wide transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
            ready
              ? "bg-[var(--color-lamp)] text-[var(--color-ink)]"
              : "border-2 border-[var(--color-lamp)] text-[var(--text)]",
          ].join(" ")}
        >
          {ready ? `✓ ${t.ready}` : t.ready}
        </button>
        )}
      </div>
    </div>
  );
}
