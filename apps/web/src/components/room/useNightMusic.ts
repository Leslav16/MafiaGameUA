"use client";

import { useEffect, useRef } from "react";
import { gameServerUrl } from "@/lib/room/endpoints";
import type { MusicView } from "@/lib/room/types";

/** Loudest the music ever gets (table and own volume at 100%): it sits under the voices, never over them. */
const MAX_GAIN = 0.5;
/** While the host is talking, the music steps back to this share of its level. */
const DUCK = 0.4;
/** Seconds: the night creeps in slowly; towards the morning it fades out slower still. */
const FADE_IN = 6;
const FADE_OUT = 9;
/** Leaving the night some other way (game ended, morning skipped): a quick fade. */
const FADE_QUICK = 1.5;

type Mode = "night" | "morning" | "off";

/**
 * The host's night music in this browser. It fades in when the town falls asleep, keeps playing
 * through the night, fades out once the night is done (towards the morning) and pauses, picking up
 * where it left off next night. The level is the host's table volume times this browser's own
 * volume, and dips while the host speaks so their voice always comes first.
 *
 * Played through Web Audio (a gain node) because iPhones ignore an audio element's volume.
 * Browsers only allow sound after a click on the page; if the first play is refused, the next
 * click or key press starts it.
 */
export function useNightMusic({
  code,
  music,
  mode,
  ownVolume,
  hostSpeaking,
  preview,
}: {
  code: string;
  music: MusicView | null | undefined;
  mode: Mode;
  /** This browser's own volume, 0..1. */
  ownVolume: number;
  hostSpeaking: boolean;
  /** The host listens to it now, whatever the phase. */
  preview: boolean;
}) {
  const el = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = music?.version ?? null;

  // One audio element per uploaded file.
  useEffect(() => {
    if (version === null) return;
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.preload = "auto";
    audio.src = `${gameServerUrl()}/music/${code}?v=${version}`;
    el.current = audio;
    let g: typeof graph.current = null;
    try {
      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
        g = { ctx, gain };
      }
    } catch {
      g = null; // fall back to the element's own volume
    }
    if (!g) audio.volume = 0;
    graph.current = g;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      void g?.ctx.close().catch(() => {});
      if (el.current === audio) el.current = null;
      if (graph.current === g) graph.current = null;
    };
  }, [code, version]);

  const active = preview || mode === "night";
  const level = Math.min(1, Math.max(0, (music?.volume ?? 0) * ownVolume)) * MAX_GAIN * (hostSpeaking ? DUCK : 1);

  // Fade towards the level the moment calls for.
  const wasActive = useRef(false);
  useEffect(() => {
    const audio = el.current;
    if (!audio) return;
    const g = graph.current;
    const target = active ? level : 0;
    const starting = active && !wasActive.current;
    wasActive.current = active;
    const seconds = starting ? FADE_IN : active ? (hostSpeaking ? 0.3 : 0.9) : mode === "morning" ? FADE_OUT : FADE_QUICK;

    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = null;

    if (active) {
      const play = () => {
        void g?.ctx.resume().catch(() => {});
        return audio.play();
      };
      if (audio.paused) {
        play().catch(() => {
          // Blocked until this page is clicked: try again on the next click or key.
          const again = () => {
            window.removeEventListener("pointerdown", again);
            window.removeEventListener("keydown", again);
            if (wasActive.current) void play().catch(() => {});
          };
          window.addEventListener("pointerdown", again);
          window.addEventListener("keydown", again);
        });
      }
    } else if (audio.paused) return;

    if (g) {
      const now = g.ctx.currentTime;
      const p = g.gain.gain;
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(target, now + seconds);
    } else {
      audio.volume = target;
    }
    // Faded out: pause, so the next night carries on from here.
    if (!active) pauseTimer.current = setTimeout(() => audio.pause(), seconds * 1000 + 100);
  }, [active, level, mode, hostSpeaking, version]);

  useEffect(
    () => () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    },
    [],
  );
}
