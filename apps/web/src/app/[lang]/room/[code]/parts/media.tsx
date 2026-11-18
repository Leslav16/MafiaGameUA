"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "livekit-client";

/** Shows a LiveKit video track. */
export function VideoView({ track, mirror, label }: { track: Track | undefined; mirror?: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  if (!track) return null;
  return (
    <video
      ref={ref}
      aria-label={label}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 h-full w-full object-cover ${mirror ? "-scale-x-100" : ""}`}
    />
  );
}

/** Plays a remote participant's microphone. */
export function AudioOut({ track }: { track: Track | undefined }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  if (!track) return null;
  return <audio ref={ref} autoPlay />;
}

/** Re-renders every 250 ms while a timer runs. */
export function useNow(active: boolean, offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    const first = setTimeout(tick, 0);
    const id = active ? setInterval(tick, 250) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, offset]);
  return now;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
