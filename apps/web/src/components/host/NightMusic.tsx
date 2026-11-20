"use client";

import { useRef, useState } from "react";
import type { HostAction, MusicView } from "@/lib/room/types";
import { fmt } from "@/lib/room/format";
import { btn, plain, type HostDict } from "./ui";

/**
 * The host's night music: pick a file, set how loud it plays for the whole table,
 * listen to it now, or take it away. Players can turn it down for themselves in Settings.
 */
export function NightMusic({
  music,
  act,
  upload,
  preview,
  onPreview,
  t,
}: {
  music: MusicView | null;
  act: (a: HostAction) => void;
  upload: (file: File) => Promise<string | null>;
  preview: boolean;
  onPreview: (on: boolean) => void;
  t: HostDict;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live while dragging; sent to everyone when the slider is let go.
  const [draft, setDraft] = useState<number | null>(null);
  const volume = Math.round((draft ?? music?.volume ?? 0.4) * 100);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const err = await upload(file);
    setBusy(false);
    if (err) setError((t.musicErrors as Record<string, string>)[err] ?? t.musicErrors.server_error);
    if (input.current) input.current.value = "";
  }

  const commit = () => {
    if (draft === null) return;
    act({ type: "musicVolume", volume: draft });
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-[var(--text-muted)]">{t.musicHint}</p>
      {music && (
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-[var(--color-lamp)]">♪</span>
          <span className="truncate font-medium" title={music.name}>
            {music.name}
          </span>
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac,.opus,.webm"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={`${btn} ${plain} text-sm`} onClick={() => input.current?.click()}>
          {busy ? t.musicUploading : music ? t.musicReplace : t.musicUpload}
        </button>
        {music && (
          <>
            <button
              type="button"
              aria-pressed={preview}
              className={`${btn} ${plain} text-sm`}
              onClick={() => onPreview(!preview)}
            >
              {preview ? `■ ${t.musicStop}` : `▶ ${t.musicListen}`}
            </button>
            <button type="button" className={`${btn} ${plain} text-sm`} onClick={() => act({ type: "clearMusic" })}>
              {t.musicRemove}
            </button>
          </>
        )}
      </div>
      {music && (
        <label className="flex flex-col gap-1">
          <span className="flex justify-between">
            <span>{t.musicVolume}</span>
            <span className="tabular-nums text-[var(--text-muted)]">{fmt(t.percent, { n: volume })}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => setDraft(Number(e.target.value) / 100)}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            className="brass-range w-full"
          />
          <span className="text-xs text-[var(--text-muted)]">{t.musicVolumeHint}</span>
        </label>
      )}
      {error && (
        <p role="alert" className="text-[var(--urgent)]">
          {error}
        </p>
      )}
    </div>
  );
}
