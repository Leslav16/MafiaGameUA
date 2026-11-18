"use client";

import { useEffect, useRef } from "react";
import { playShot } from "./sounds";
import { narrate, type NarratorCue } from "./narrator";

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

/**
 * Speaks the night narrator's line when the night falls, each role is called
 * and the morning comes. The first state seen is skipped, so joining or
 * reloading mid-night is silent.
 */
export function useNarrator(stage: string | undefined, nightStep: string | null | undefined, lang: string) {
  const prev = useRef<string | null | undefined>(undefined);
  const moment = stage === "morning" ? "morning" : stage === "night" ? (nightStep === "asleep" ? "night" : (nightStep ?? null)) : null;
  useEffect(() => {
    if (stage === undefined) return; // not in the room yet
    const before = prev.current;
    prev.current = moment;
    if (before === undefined || moment === before || moment === null) return;
    narrate(moment as NarratorCue, lang);
  }, [stage, moment, lang]);
}
