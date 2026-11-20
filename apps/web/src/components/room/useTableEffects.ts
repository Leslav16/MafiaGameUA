"use client";

import { useEffect, useRef } from "react";
import { playShot } from "./sounds";

type Log = { day: number; kind: string; seat?: number }[];

/**
 * Plays a quiet shot when the mafia fires (or, for players who don't see the
 * night log, when a kill is announced). Only new log entries count, so
 * joining mid-game is silent.
 */
export function useShotSound(log: Log | undefined) {
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!log) return;
    if (seen.current === null) {
      seen.current = log.length;
      return;
    }
    const fresh = log.slice(seen.current);
    seen.current = log.length;
    const shots = fresh.filter(
      (e) =>
        e.kind === "shot" ||
        e.kind === "missed" ||
        (e.kind === "killed" &&
          !log.some(
            (x) =>
              x.day === e.day && (x.kind === "shot" || x.kind === "missed"),
          )),
    );
    if (shots.length) playShot();
  }, [log]);
}
